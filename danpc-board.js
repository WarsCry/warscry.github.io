(() => {
  'use strict';

  // Shared local/offline cache and Firebase-backed global leaderboard.

  const KEY = 'danpcArcadeScoresV1';
  const FIREBASE_VERSION = '10.12.5';
  const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyCtQkmjohMgv7ZYfGarConG5eJk_5zODpY',
    authDomain: 'danpc-arcade-scores.firebaseapp.com',
    databaseURL: 'https://danpc-arcade-scores-default-rtdb.firebaseio.com',
    projectId: 'danpc-arcade-scores',
    storageBucket: 'danpc-arcade-scores.firebasestorage.app',
    messagingSenderId: '867821954415',
    appId: '1:867821954415:web:46219b99960968efdeb49a'
  };

  function all() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch { return {}; }
  }

  function player() {
    return new URLSearchParams(location.search).get('player') ||
      localStorage.getItem('danpcPlayerName') || 'PLAYER';
  }

  function cleanText(value, limit) {
    return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, limit);
  }

  function cleanGame(game) {
    return cleanText(game, 64).replace(/[.#$\[\]/]/g, '_');
  }

  function localList(game) {
    return all()[game] || [];
  }

  function saveLocal(game, entry) {
    const data = all();
    const rows = data[game] || [];
    rows.push(entry);
    rows.sort((a, b) => b.score - a.score || a.at - b.at);
    data[game] = rows.slice(0, 10);
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  const cloud = import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`)
    .then(async appSdk => {
      const [authSdk, databaseSdk] = await Promise.all([
        import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
        import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-database.js`)
      ]);
      const app = appSdk.initializeApp(FIREBASE_CONFIG);
      const auth = authSdk.getAuth(app);
      if (!auth.currentUser) await authSdk.signInAnonymously(auth);
      return { auth, database: databaseSdk.getDatabase(app), databaseSdk };
    });

  async function pushBest(game, entry) {
    const gameKey = cleanGame(game);
    if (!gameKey || !entry) return;
    const { auth, database, databaseSdk } = await cloud;
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const scoreRef = databaseSdk.ref(database, `scores/${gameKey}/${uid}`);
    await databaseSdk.runTransaction(scoreRef, current => {
      if (current && Number(current.score) >= entry.score) return current;
      return {
        uid,
        name: cleanText(entry.name, 18) || 'PLAYER',
        score: Math.max(0, Math.min(1000000000000, Number(entry.score) || 0)),
        display: cleanText(entry.display, 80),
        detail: cleanText(entry.detail, 120),
        at: Date.now()
      };
    }, { applyLocally: false });
  }

  let migration;
  function migrateLocalScores() {
    if (migration) return migration;
    migration = cloud.then(async () => {
      const data = all();
      await Promise.all(Object.entries(data).map(([game, rows]) => {
        const best = Array.isArray(rows) ? rows.slice().sort((a, b) => b.score - a.score)[0] : null;
        return best ? pushBest(game, best) : Promise.resolve();
      }));
    }).catch(() => {});
    return migration;
  }

  function record(game, score, display, detail = '') {
    const numeric = Number(score);
    if (!game || !Number.isFinite(numeric)) return;
    const entry = {
      name: cleanText(player(), 18) || 'PLAYER',
      score: Math.max(0, numeric),
      display: cleanText(display ?? numeric, 80),
      detail: cleanText(detail, 120),
      at: Date.now()
    };
    saveLocal(game, entry);
    pushBest(game, entry).catch(() => {});
    return entry;
  }

  async function listGlobal(game) {
    try {
      await migrateLocalScores();
      const { database, databaseSdk } = await cloud;
      const scoresQuery = databaseSdk.query(
        databaseSdk.ref(database, `scores/${cleanGame(game)}`),
        databaseSdk.orderByChild('score'),
        databaseSdk.limitToLast(10)
      );
      const snapshot = await databaseSdk.get(scoresQuery);
      const rows = Object.values(snapshot.val() || {})
        .filter(row => row && Number.isFinite(Number(row.score)))
        .sort((a, b) => Number(b.score) - Number(a.score) || Number(a.at) - Number(b.at))
        .slice(0, 10);
      rows.source = 'global';
      return rows;
    } catch {
      const rows = localList(game).slice(0, 10);
      rows.source = 'local';
      return rows;
    }
  }

  migrateLocalScores();
  window.DanArcadeScores = { record, list: localList, listGlobal, player, ready: cloud };
})();
