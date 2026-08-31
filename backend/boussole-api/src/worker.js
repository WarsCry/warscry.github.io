const PARTY_PROFILES = [
  { id: "CAQ", positions: [1.5, 1.1, 1.0, 0.6, 3.0, 1.2, 0.2, 1.3, 1.2], salience: [1.1, 1.1, 1.25, 1.25, 1, 1, 1.2, 1, 1] },
  { id: "PCQ", positions: [0.2, 0.2, 0.5, 0.8, 3.0, 0.1, 0.0, 0.3, 0.4], salience: [1.35, 1.25, 1.1, 1, 1, 1.25, 1.2, 1.15, 1.15] },
  { id: "PQ", positions: [1.5, 2.0, 0.6, 0.2, 0.0, 1.3, 1.4, 1.8, 2.0], salience: [1, 1.15, 1.3, 1.25, 2.25, 1.1, 1, 1.1, 1.1] },
  { id: "PLQ", positions: [1.3, 1.5, 2.5, 2.6, 3.0, 1.7, 1.5, 1.4, 1.5], salience: [1.15, 1.1, 1.15, 1.25, 1.5, 1.05, 1, 1, 1] },
  { id: "QS", positions: [2.9, 2.9, 2.7, 2.9, 0.6, 2.9, 2.0, 2.9, 2.8], salience: [1.25, 1.25, 1.1, 1.1, 1.15, 1.3, 1, 1.35, 1.25] }
];

const PARTY_COLUMNS = { CAQ: "caq", PCQ: "pcq", PQ: "pq", PLQ: "plq", QS: "qs" };
const DEFAULT_ORIGINS = ["https://danpc.ca", "https://www.danpc.ca", "https://warscry.github.io"];

function normalizedUserPosition(questionIndex, answerIndex) {
  if (questionIndex === 4) return [0, 0.8, 3, null][answerIndex];
  if (questionIndex === 6 && answerIndex === 3) return null;
  return answerIndex;
}

function issueWeights(priorities) {
  const weights = Array(9).fill(0.5);
  const priorityIssues = [[0], [1], [2, 3, 4], [0, 5, 7]];
  priorities.forEach((priority) => {
    priorityIssues[priority].forEach((issue) => { weights[issue] += 1.5; });
  });
  return weights;
}

export function calculateScores(answers) {
  const weights = issueWeights(answers[9]);
  return Object.fromEntries(PARTY_PROFILES.map((party) => {
    let earned = 0;
    let possible = 0;
    for (let i = 0; i < 9; i += 1) {
      const userPosition = normalizedUserPosition(i, answers[i]);
      if (userPosition === null) continue;
      const weight = weights[i] * party.salience[i];
      const similarity = Math.max(0, 1 - Math.abs(userPosition - party.positions[i]) / 3);
      earned += similarity * weight;
      possible += weight;
    }
    return [party.id, Math.round((earned / possible) * 100)];
  }));
}

function validAnswers(answers) {
  if (!Array.isArray(answers) || answers.length !== 10) return false;
  if (!answers.slice(0, 9).every((answer) => Number.isInteger(answer) && answer >= 0 && answer <= 3)) return false;
  const priorities = answers[9];
  return Array.isArray(priorities)
    && priorities.length >= 1
    && priorities.length <= 2
    && new Set(priorities).size === priorities.length
    && priorities.every((answer) => Number.isInteger(answer) && answer >= 0 && answer <= 3);
}

function allowedOrigins(env) {
  return new Set((env.ALLOWED_ORIGINS || DEFAULT_ORIGINS.join(","))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean));
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const headers = {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
  if (allowedOrigins(env).has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(request, env, payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...corsHeaders(request, env)
    }
  });
}

async function visitorHash(token, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(token));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function aggregateResults(env) {
  const row = await env.DB.prepare(`
    SELECT COUNT(*) AS submissions,
      COALESCE(AVG(caq), 0) AS caq,
      COALESCE(AVG(pcq), 0) AS pcq,
      COALESCE(AVG(pq), 0) AS pq,
      COALESCE(AVG(plq), 0) AS plq,
      COALESCE(AVG(qs), 0) AS qs
    FROM submissions
  `).first();
  const averages = PARTY_PROFILES.map((party) => ({
    id: party.id,
    score: Math.round(Number(row[PARTY_COLUMNS[party.id]]) * 10) / 10
  })).sort((a, b) => b.score - a.score);
  return { submissions: Number(row.submissions), averages, updatedAt: new Date().toISOString() };
}

async function submitResult(request, env) {
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > 4096) return json(request, env, { error: "payload_too_large" }, 413);

  let body;
  try {
    body = await request.json();
  } catch {
    return json(request, env, { error: "invalid_json" }, 400);
  }

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (body?.consent !== true || !uuidPattern.test(body?.visitorToken || "") || !validAnswers(body?.answers)) {
    return json(request, env, { error: "invalid_submission" }, 400);
  }
  if (!env.HASH_SECRET || env.HASH_SECRET.length < 32) {
    return json(request, env, { error: "service_not_configured" }, 503);
  }

  const hash = await visitorHash(body.visitorToken, env.HASH_SECRET);
  const scores = calculateScores(body.answers);
  const insertion = await env.DB.prepare(`
    INSERT INTO submissions (visitor_hash, caq, pcq, pq, plq, qs)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(visitor_hash) DO NOTHING
  `).bind(hash, scores.CAQ, scores.PCQ, scores.PQ, scores.PLQ, scores.QS).run();

  const aggregate = await aggregateResults(env);
  const accepted = Number(insertion.meta?.changes || 0) === 1;
  return json(request, env, { accepted, duplicate: !accepted, aggregate }, accepted ? 201 : 409);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      if (!allowedOrigins(env).has(origin)) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    if (url.pathname === "/health" && request.method === "GET") {
      return json(request, env, { ok: true });
    }

    if (url.pathname !== "/api/results") return json(request, env, { error: "not_found" }, 404);
    if (!allowedOrigins(env).has(origin)) return json(request, env, { error: "origin_not_allowed" }, 403);
    if (request.method === "GET") return json(request, env, await aggregateResults(env));
    if (request.method === "POST") return submitResult(request, env);
    return json(request, env, { error: "method_not_allowed" }, 405);
  }
};
