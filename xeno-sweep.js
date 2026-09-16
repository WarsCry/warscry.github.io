(() => {
  'use strict';

  const $ = selector => document.querySelector(selector);
  const boardEl = $('#board');
  const launchScreen = $('#launchScreen');
  const resultScreen = $('#resultScreen');
  const levels = {
    cadet: { rows:9, cols:9, mines:10, color:'#69ffde', fr:'ÉCOUTILLE CADET', en:'CADET HATCH', rank:1 },
    sentinel: { rows:12, cols:12, mines:24, color:'#c8ff5d', fr:'PONT SENTINELLE', en:'SENTINEL DECK', rank:2 },
    overmind: { rows:16, cols:16, mines:48, color:'#ff6f9d', fr:'CŒUR OVERMIND', en:'OVERMIND CORE', rank:3 }
  };
  const params = new URLSearchParams(location.search);
  let language = localStorage.getItem('siteLang') === 'en' ? 'en' : 'fr';
  let levelKey = levels[params.get('difficulty')] ? params.get('difficulty') : 'cadet';
  let cells = [], running = false, generated = false, elapsed = 0, startedAt = 0, timerId = 0;
  let mode = 'probe', revealed = 0, flags = 0, probes = 0, correctFlags = 0, soundOn = localStorage.getItem('xenoSweepSound') !== 'off';
  let longPressTimer = 0, longPressed = false;

  const text = {
    ready:['CHOISISSEZ UNE CHAMBRE POUR COMMENCER','SELECT A CHAMBER TO BEGIN'],
    active:['BIOSCAN ACTIF · LOCALISEZ LES COCONS','BIOSCAN ACTIVE · LOCATE THE PODS'],
    flag:['MODE BALISE · MARQUEZ LES COCONS','BEACON MODE · MARK THE PODS'],
    probe:['MODE SONDE · OUVREZ UNE CHAMBRE','PROBE MODE · OPEN A CHAMBER'],
    won:['SECTEUR PURIFIÉ','SECTOR PURGED'],
    lost:['ÉCLOSION DÉTECTÉE','HATCHING DETECTED'],
    waiting:['EN ATTENTE','STANDBY'],
    scanning:['BIOSCAN ACTIF','BIOSCAN ACTIVE'],
    safe:['PURIFIÉ','PURGED'],
    breach:['BRÈCHE','BREACH']
  };
  const t = key => text[key][language === 'en' ? 1 : 0];
  const currentLevel = () => levels[levelKey];
  const elapsedNow = () => elapsed + (running ? Math.floor((Date.now() - startedAt) / 1000) : 0);
  const neighbours = index => {
    const level = currentLevel(), row = Math.floor(index / level.cols), col = index % level.cols, found = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const r = row + dr, c = col + dc;
      if ((dr || dc) && r >= 0 && r < level.rows && c >= 0 && c < level.cols) found.push(r * level.cols + c);
    }
    return found;
  };

  function applyLanguage() {
    document.documentElement.lang = language;
    document.querySelectorAll('[data-fr][data-en]').forEach(node => { node.textContent = node.dataset[language]; });
    $('#soundButton').textContent = soundOn ? (language === 'fr' ? '◖)) SON' : '◖)) SOUND') : (language === 'fr' ? 'SON COUPÉ' : 'MUTED');
    renderChoices();
    updateUI();
  }

  function renderChoices() {
    const box = $('#difficultyChoices');
    box.replaceChildren();
    Object.entries(levels).forEach(([key, level]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `difficulty${key === levelKey ? ' selected' : ''}`;
      button.style.setProperty('--level', level.color);
      button.innerHTML = `<strong>${level[language]}</strong><span>${level.rows}×${level.cols} · ${level.mines} ${language === 'fr' ? 'cocons' : 'pods'}</span>`;
      button.onclick = () => { levelKey = key; renderChoices(); sound('probe'); };
      box.append(button);
    });
  }

  function newCells() {
    const level = currentLevel();
    return Array.from({ length:level.rows * level.cols }, (_, index) => ({ index, mine:false, adjacent:0, revealed:false, flagged:false }));
  }

  function generateMines(firstIndex) {
    const level = currentLevel();
    const forbidden = new Set([firstIndex, ...neighbours(firstIndex)]);
    const choices = cells.map(cell => cell.index).filter(index => !forbidden.has(index));
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    choices.slice(0, level.mines).forEach(index => { cells[index].mine = true; });
    cells.forEach(cell => { cell.adjacent = neighbours(cell.index).filter(index => cells[index].mine).length; });
    correctFlags = cells.filter(cell => cell.flagged && cell.mine).length;
    generated = true;
  }

  function startGame() {
    clearInterval(timerId);
    const level = currentLevel();
    cells = newCells();
    running = false; generated = false; elapsed = 0; revealed = 0; flags = 0; probes = 0; correctFlags = 0; mode = 'probe';
    boardEl.style.setProperty('--cols', level.cols);
    boardEl.dataset.level = levelKey;
    launchScreen.classList.remove('show'); resultScreen.classList.remove('show');
    renderBoard(); updateMode(); updateUI();
    $('#message').textContent = t('ready');
    $('#status').textContent = t('waiting');
    $('#face').textContent = '👽';
  }

  function beginTimer() {
    if (running) return;
    running = true; startedAt = Date.now();
    timerId = setInterval(updateUI, 250);
    $('#status').textContent = t('scanning');
  }

  function renderBoard() {
    boardEl.replaceChildren();
    const level = currentLevel();
    cells.forEach(cell => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'cell'; button.dataset.index = cell.index;
      button.setAttribute('role', 'gridcell');
      button.setAttribute('aria-rowindex', Math.floor(cell.index / level.cols) + 1);
      button.setAttribute('aria-colindex', cell.index % level.cols + 1);
      paintCell(button, cell);
      button.addEventListener('click', event => {
        if (longPressed) { longPressed = false; return; }
        activate(cell.index, mode === 'flag' || event.shiftKey);
      });
      button.addEventListener('contextmenu', event => { event.preventDefault(); activate(cell.index, true); });
      button.addEventListener('pointerdown', event => {
        if (event.pointerType === 'mouse') return;
        longPressed = false;
        longPressTimer = setTimeout(() => { longPressed = true; activate(cell.index, true); navigator.vibrate?.(25); }, 480);
      });
      const cancelHold = () => clearTimeout(longPressTimer);
      button.addEventListener('pointerup', cancelHold); button.addEventListener('pointercancel', cancelHold); button.addEventListener('pointerleave', cancelHold);
      boardEl.append(button);
    });
  }

  function paintCell(button, cell) {
    button.className = 'cell'; button.textContent = '';
    if (cell.wrong) { button.classList.add('wrong'); button.textContent = '✕'; button.setAttribute('aria-label', 'Incorrect beacon'); return; }
    if (cell.flagged) { button.classList.add('flagged'); button.textContent = '⚑'; button.setAttribute('aria-label', 'Beacon'); return; }
    if (!cell.revealed) { button.setAttribute('aria-label', 'Unknown chamber'); return; }
    button.classList.add('revealed');
    if (cell.mine) { button.classList.add('mine'); button.textContent = '◉'; button.setAttribute('aria-label', 'Alien pod'); }
    else if (cell.adjacent) { button.classList.add(`n${cell.adjacent}`); button.textContent = cell.adjacent; button.setAttribute('aria-label', `${cell.adjacent} adjacent pods`); }
    else button.setAttribute('aria-label', 'Safe empty chamber');
  }

  function repaint(index) { const button = boardEl.children[index]; if (button) paintCell(button, cells[index]); }

  function activate(index, flagAction) {
    if (resultScreen.classList.contains('show')) return;
    const cell = cells[index];
    if (flagAction) { toggleFlag(index); return; }
    if (cell.flagged) return;
    if (!generated) { generateMines(index); beginTimer(); }
    if (cell.revealed) { chord(index); return; }
    probes++;
    if (cell.mine) { lose(index); return; }
    revealArea(index);
    sound('probe');
    checkWin(); updateUI();
  }

  function toggleFlag(index) {
    const cell = cells[index];
    if (cell.revealed) return;
    if (!generated) beginTimer();
    cell.flagged = !cell.flagged;
    flags += cell.flagged ? 1 : -1;
    if (generated && cell.mine) correctFlags += cell.flagged ? 1 : -1;
    repaint(index); sound('flag'); updateUI();
  }

  function revealArea(start) {
    const queue = [start], seen = new Set();
    while (queue.length) {
      const index = queue.shift(), cell = cells[index];
      if (seen.has(index) || cell.flagged || cell.revealed || cell.mine) continue;
      seen.add(index); cell.revealed = true; revealed++; repaint(index);
      if (cell.adjacent === 0) neighbours(index).forEach(next => queue.push(next));
    }
  }

  function chord(index) {
    const cell = cells[index];
    if (!cell.revealed || !cell.adjacent) return;
    const nearby = neighbours(index), nearbyFlags = nearby.filter(next => cells[next].flagged).length;
    if (nearbyFlags !== cell.adjacent) return;
    const mine = nearby.find(next => cells[next].mine && !cells[next].flagged);
    if (mine != null) { lose(mine); return; }
    nearby.forEach(next => revealArea(next));
    sound('probe'); checkWin(); updateUI();
  }

  function checkWin() {
    const level = currentLevel();
    if (revealed !== cells.length - level.mines) return;
    const seconds = elapsedNow(); elapsed = seconds; running = false; clearInterval(timerId);
    cells.forEach(cell => { if (cell.mine) { if (!cell.flagged) flags++; cell.flagged = true; repaint(cell.index); } });
    $('#face').textContent = '😎'; $('#status').textContent = t('safe');
    const score = Math.max(1, level.rank * 1000000 + revealed * 1000 - seconds * 25 - Math.max(0, flags - level.mines) * 500);
    const display = `${level[language]} · ${formatTime(seconds)}`;
    const detail = `${level.rows}×${level.cols} · ${level.mines} ${language === 'fr' ? 'cocons' : 'pods'}`;
    window.DanArcadeScores?.record('xeno-sweep.html', score, display, detail);
    saveBest(seconds);
    sound('win');
    setTimeout(() => showResult(true, seconds), 450);
  }

  function lose(triggerIndex) {
    elapsed = elapsedNow(); running = false; clearInterval(timerId);
    cells.forEach(cell => {
      if (cell.mine) cell.revealed = true;
      if (cell.flagged && !cell.mine) cell.wrong = true;
      repaint(cell.index);
    });
    boardEl.children[triggerIndex]?.classList.add('triggered');
    $('#face').textContent = '☠️'; $('#status').textContent = t('breach');
    window.DanArcadeFX?.shake(boardEl, 1.2); sound('lose'); updateUI();
    setTimeout(() => showResult(false, elapsed), 650);
  }

  function showResult(won, seconds) {
    const level = currentLevel(), modal = resultScreen.querySelector('.result-modal');
    modal.classList.toggle('lost', !won);
    $('#resultIcon').textContent = won ? '👽' : '🧫';
    $('#resultKicker').textContent = won ? t('won') : t('lost');
    $('#resultTitle').innerHTML = won
      ? (language === 'fr' ? 'INFESTATION<br><span>NEUTRALISÉE</span>' : 'INFESTATION<br><span>NEUTRALIZED</span>')
      : (language === 'fr' ? 'LE COCON<br><span>S’EST OUVERT</span>' : 'THE POD<br><span>HAS HATCHED</span>');
    $('#resultStats').textContent = won
      ? `${level[language]} · ${formatTime(seconds)} · ${level.mines} ${language === 'fr' ? 'cocons contenus' : 'pods contained'}`
      : (language === 'fr' ? `Brèche après ${formatTime(seconds)}. La prochaine sonde sera la bonne.` : `Breach after ${formatTime(seconds)}. The next probe will be the one.`);
    $('#againButton').textContent = language === 'fr' ? 'REJOUER' : 'PLAY AGAIN';
    $('#resultLevelButton').textContent = language === 'fr' ? 'CHANGER DE SECTEUR' : 'CHANGE SECTOR';
    resultScreen.classList.add('show');
  }

  function updateMode() {
    const flagging = mode === 'flag';
    $('#flagMode').classList.toggle('active', flagging); $('#flagMode').setAttribute('aria-pressed', flagging);
    $('#probeMode').classList.toggle('active', !flagging); $('#probeMode').setAttribute('aria-pressed', !flagging);
    if (cells.length) $('#message').textContent = flagging ? t('flag') : (generated ? t('probe') : t('ready'));
  }

  function updateUI() {
    const level = currentLevel(), seconds = elapsedNow(), safeTotal = level.rows * level.cols - level.mines;
    $('#mineCount').textContent = String(Math.max(0, level.mines - flags)).padStart(3, '0');
    $('#safeCount').textContent = `${String(revealed).padStart(3, '0')} / ${String(safeTotal).padStart(3, '0')}`;
    $('#timer').textContent = String(Math.min(999, seconds)).padStart(3, '0');
    $('#difficultyLabel').textContent = `${level[language]} · ${level.rows}×${level.cols}`;
    const totalActions = Math.max(1, probes + flags);
    const wrongFlags = generated ? cells.filter(cell => cell.flagged && !cell.mine).length : 0;
    $('#accuracy').textContent = `${Math.max(0, Math.round((totalActions - wrongFlags) / totalActions * 100))}%`;
    $('#bestTime').textContent = readBest() ? formatTime(readBest()) : '—';
  }

  function sound(kind) {
    if (!soundOn) return;
    const fx = window.DanArcadeFX;
    if (kind === 'probe') fx?.play('metal', { enabled:true, volume:.1, rate:1.65, cooldown:40 });
    if (kind === 'flag') fx?.play('magic', { enabled:true, volume:.13, rate:1.25, cooldown:40 });
    if (kind === 'lose') { fx?.play('door', { enabled:true, volume:.32, rate:.55 }); fx?.hit(boardEl, '#ff537f', 1.2); }
    if (kind === 'win') { fx?.play('cheer', { enabled:true, volume:.25, duration:2.2 }); fx?.hit(boardEl, '#c8ff5d', 1); }
  }

  function formatTime(seconds) { return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }
  function bestKey() { return `xenoSweepBest:${levelKey}`; }
  function readBest() { return Number(localStorage.getItem(bestKey())) || 0; }
  function saveBest(seconds) { const best = readBest(); if (!best || seconds < best) localStorage.setItem(bestKey(), String(seconds)); }
  function showLevels() { resultScreen.classList.remove('show'); launchScreen.classList.add('show'); renderChoices(); }

  $('#startButton').onclick = startGame;
  $('#newGameButton').onclick = startGame;
  $('#faceButton').onclick = startGame;
  $('#levelButton').onclick = showLevels;
  $('#resultLevelButton').onclick = showLevels;
  $('#againButton').onclick = startGame;
  $('#probeMode').onclick = () => { mode = 'probe'; updateMode(); sound('probe'); };
  $('#flagMode').onclick = () => { mode = 'flag'; updateMode(); sound('flag'); };
  $('#soundButton').onclick = () => { soundOn = !soundOn; localStorage.setItem('xenoSweepSound', soundOn ? 'on' : 'off'); applyLanguage(); if (soundOn) sound('flag'); };
  addEventListener('keydown', event => {
    if (event.key.toLowerCase() === 'f') { mode = mode === 'flag' ? 'probe' : 'flag'; updateMode(); }
    if (event.key.toLowerCase() === 'r' && !event.ctrlKey && !event.metaKey) startGame();
  });
  addEventListener('beforeunload', () => clearInterval(timerId));

  applyLanguage();
})();
