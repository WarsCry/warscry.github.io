import assert from "node:assert/strict";
import worker, { calculateScores } from "./src/worker.js";

class MemoryDB {
  constructor() { this.rows = new Map(); }

  prepare(sql) {
    const db = this;
    return {
      values: [],
      bind(...values) { this.values = values; return this; },
      async first() {
        const rows = [...db.rows.values()];
        const average = (column) => rows.length ? rows.reduce((sum, row) => sum + row[column], 0) / rows.length : 0;
        return {
          submissions: rows.length,
          caq: average("caq"), pcq: average("pcq"), pq: average("pq"),
          plq: average("plq"), qs: average("qs")
        };
      },
      async run() {
        assert.match(sql, /INSERT INTO submissions/);
        const [visitor_hash, caq, pcq, pq, plq, qs] = this.values;
        if (db.rows.has(visitor_hash)) return { meta: { changes: 0 } };
        db.rows.set(visitor_hash, { caq, pcq, pq, plq, qs });
        return { meta: { changes: 1 } };
      }
    };
  }
}

const answers = [3, 3, 1, 0, 2, 1, 1, 3, 1, [1, 3]];
assert.deepEqual(calculateScores(answers), { CAQ: 64, PCQ: 35, PQ: 64, PLQ: 57, QS: 71 });

const env = {
  DB: new MemoryDB(),
  HASH_SECRET: "test-secret-with-at-least-thirty-two-characters",
  ALLOWED_ORIGINS: "https://danpc.ca"
};
const headers = { Origin: "https://danpc.ca", "Content-Type": "application/json" };
const payload = JSON.stringify({ consent: true, visitorToken: "149b8f4a-0666-4cd1-bef7-5b150af25144", answers });

const first = await worker.fetch(new Request("https://api.test/api/results", { method: "POST", headers, body: payload }), env);
assert.equal(first.status, 201);
assert.equal((await first.json()).aggregate.submissions, 1);

const duplicate = await worker.fetch(new Request("https://api.test/api/results", { method: "POST", headers, body: payload }), env);
assert.equal(duplicate.status, 409);
assert.equal((await duplicate.json()).aggregate.submissions, 1);

const rejected = await worker.fetch(new Request("https://api.test/api/results", { headers: { Origin: "https://example.com" } }), env);
assert.equal(rejected.status, 403);

console.log("boussole-api tests passed");
