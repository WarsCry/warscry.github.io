(() => {
  'use strict';

  const games = [
    { id:'xeno-maze.html', icon:'🧬', accent:'#a9ff49', title:'Xeno Maze: Signal Lost', href:'xeno-maze.html?v=3' },
    { id:'starfall.html', icon:'🛸', accent:'#76ffe0', title:'Starfall: Alien Uprising', href:'starfall.html' },
    { id:'xeno-pinball.html', icon:'🪩', accent:'#ff63ad', title:'Xeno Arcade Room', href:'xeno-pinball.html?v=4' },
    { id:'xeno-mahjong.html', icon:'🗿', accent:'#f4c86a', title:'Xeno Mahjong', href:'xeno-mahjong.html?v=3' },
    { id:'xeno-sudoku.html', icon:'🔢', accent:'#67ffe0', title:'Xeno Sudoku', href:'xeno-sudoku.html' },
    { id:'alien-chess.html', icon:'👽', accent:'#baff66', title:'Alien Chess', href:'alien-chess.html' },
    { id:'alien-solitaire.html', icon:'🃏', accent:'#72eaff', title:'Alien Solitaire', href:'alien-solitaire.html' },
    { id:'cosmo-casino.html', icon:'🪙', accent:'#ffd967', title:'Cosmo Casino', href:'cosmo-casino.html' },
    { id:'voidbound.html', icon:'🎲', accent:'#ff835c', title:'Voidbound: Breach Tactics', href:'voidbound.html' },
    { id:'atelier-dreams.html', icon:'✨', accent:'#e99dff', title:{fr:'L’Atelier entre les rêves',en:'The Atelier Between Dreams'}, href:'atelier-dreams.html' }
  ];

  const grid = document.querySelector('#scoreGrid');
  const status = document.querySelector('#status');
  const refresh = document.querySelector('#refresh');
  const languageButtons = { fr:document.querySelector('#fr'), en:document.querySelector('#en') };
  let language = localStorage.getItem('siteLang') === 'en' ? 'en' : 'fr';

  function gameTitle(game) { return typeof game.title === 'string' ? game.title : game.title[language]; }
  function translated(fr, en) { return language === 'fr' ? fr : en; }

  function applyLanguage(nextLanguage) {
    language = nextLanguage === 'en' ? 'en' : 'fr';
    document.documentElement.lang = language;
    document.querySelectorAll('[data-fr][data-en]').forEach(element => {
      element.textContent = element.dataset[language];
    });
    languageButtons.fr.classList.toggle('active', language === 'fr');
    languageButtons.en.classList.toggle('active', language === 'en');
    localStorage.setItem('siteLang', language);
  }

  function cardFor(game) {
    const card = document.createElement('article');
    card.className = 'score-card';
    card.dataset.game = game.id;
    card.style.setProperty('--accent', game.accent);
    card.innerHTML = '<header class="card-head"><span class="game-icon" aria-hidden="true"></span><div class="card-title"><h2></h2><a></a></div><span class="source"></span></header><div class="score-body"><p class="empty"></p></div>';
    card.querySelector('.game-icon').textContent = game.icon;
    card.querySelector('h2').textContent = gameTitle(game);
    const link = card.querySelector('.card-title a');
    link.href = game.href;
    link.textContent = translated('JOUER →', 'PLAY →');
    card.querySelector('.source').textContent = translated('MONDIAL', 'GLOBAL');
    card.querySelector('.empty').textContent = translated('Chargement du classement…', 'Loading scoreboard…');
    return card;
  }

  function renderRows(game, rows) {
    const card = grid.querySelector(`[data-game="${game.id}"]`);
    if (!card) return;
    const body = card.querySelector('.score-body');
    const source = card.querySelector('.source');
    const offline = rows.source === 'local';
    source.textContent = offline ? translated('LOCAL · HORS LIGNE', 'LOCAL · OFFLINE') : translated('MONDIAL', 'GLOBAL');
    if (!rows.length) {
      body.innerHTML = '';
      const empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = translated('Aucun score encore — sois le premier!', 'No scores yet — be the first!');
      body.append(empty);
      return;
    }
    const list = document.createElement('ol');
    list.className = 'score-list';
    rows.slice(0, 10).forEach((row, index) => {
      const item = document.createElement('li');
      item.className = 'score-row';
      const rank = document.createElement('b');
      rank.className = 'rank';
      rank.textContent = index + 1;
      const player = document.createElement('span');
      player.className = 'player';
      player.textContent = row.name || 'PLAYER';
      const result = document.createElement('span');
      result.className = 'result';
      const value = document.createElement('strong');
      value.textContent = row.display || row.score;
      result.append(value);
      if (row.detail) {
        const detail = document.createElement('small');
        detail.textContent = row.detail;
        result.append(detail);
      }
      item.append(rank, player, result);
      list.append(item);
    });
    body.replaceChildren(list);
  }

  async function loadAll() {
    refresh.disabled = true;
    status.textContent = translated('Connexion aux classements mondiaux…', 'Connecting to global scoreboards…');
    grid.replaceChildren(...games.map(cardFor));
    let loaded = 0;
    await Promise.all(games.map(async game => {
      const rows = window.DanArcadeScores?.listGlobal
        ? await window.DanArcadeScores.listGlobal(game.id)
        : (window.DanArcadeScores?.list(game.id) || []);
      renderRows(game, rows);
      loaded++;
      status.textContent = translated(`${loaded} sur ${games.length} classements chargés`, `${loaded} of ${games.length} scoreboards loaded`);
    }));
    status.textContent = translated(`${games.length} classements à jour`, `${games.length} scoreboards up to date`);
    refresh.disabled = false;
  }

  languageButtons.fr.onclick = () => { applyLanguage('fr'); loadAll(); };
  languageButtons.en.onclick = () => { applyLanguage('en'); loadAll(); };
  refresh.onclick = loadAll;
  document.querySelector('#year').textContent = new Date().getFullYear();
  applyLanguage(language);
  loadAll();
})();
