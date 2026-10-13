(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const ranges = [[1,15],[16,30],[31,45],[46,60],[61,75]];
  const letters = ['B','I','N','G','O'];
  const colors = ['#1f5d86','#ae2944','#d09822','#287657','#744483'];
  const params = new URLSearchParams(location.search);
  let language = localStorage.getItem('siteLang') === 'en' ? 'en' : 'fr';
  let soundOn = localStorage.getItem('danpcBingoSound') !== 'off';
  let bag = [], called = [], timer = 0, phase = 'idle', audioContext = null;
  let availableVoices = [];

  function fullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function updateFullscreenButton() {
    const active = Boolean(fullscreenElement());
    const label = language === 'fr'
      ? (active ? 'Quitter le plein écran' : 'Plein écran')
      : (active ? 'Exit fullscreen' : 'Fullscreen');
    const button = $('#fullscreenButton');
    button.textContent = active ? '⤢' : '⛶';
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-pressed', String(active));
    button.title = label;
    document.body.classList.toggle('fullscreen-active', active);
  }

  async function toggleFullscreen() {
    try {
      if (fullscreenElement()) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      } else if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen();
      } else {
        throw new Error('Fullscreen API unavailable');
      }
    } catch (_) {
      setCaller(
        language === 'fr' ? 'Plein écran indisponible' : 'Fullscreen unavailable',
        language === 'fr' ? 'Appuyez sur F11 dans votre navigateur.' : 'Press F11 in your browser.'
      );
    }
  }

  function applyLanguage() {
    document.documentElement.lang = language;
    document.querySelectorAll('[data-fr][data-en]').forEach(node => {
      if (node.tagName === 'OPTION') node.textContent = node.dataset[language];
      else node.textContent = node.dataset[language];
    });
    $('#languageButton').textContent = language === 'fr' ? 'EN' : 'FR';
    $('#soundButton').textContent = soundOn ? (language === 'fr' ? '🔊 SON' : '🔊 SOUND') : (language === 'fr' ? '🔇 MUET' : '🔇 MUTED');
    updateFullscreenButton();
    if (phase === 'idle') setCaller(language === 'fr' ? 'Bienvenue au bingo!' : 'Welcome to bingo!', language === 'fr' ? 'Imprimez les cartes, puis démarrez le boulier.' : 'Print the cards, then start the machine.');
    renderCards();
    populateVoices();
  }

  function voiceScore(voice) {
    const name = voice.name.toLowerCase(), locale = voice.lang.toLowerCase();
    let score = locale === (language === 'fr' ? 'fr-ca' : 'en-ca') ? 70 : locale.startsWith(language) ? 45 : 0;
    if (/natural|neural|premium|enhanced/.test(name)) score += 100;
    if (/microsoft|google|apple/.test(name)) score += 25;
    if (/denise|claude|sylvie|audrey|thomas|jenny|aria|guy|sonia|ryan/.test(name)) score += 25;
    if (/desktop|compact|espeak/.test(name)) score -= 40;
    return score;
  }

  function populateVoices() {
    if (!('speechSynthesis' in window)) return;
    availableVoices = window.speechSynthesis.getVoices();
    const select = $('#voiceSelect'); if (!select) return;
    const previous = localStorage.getItem(`danpcBingoVoice:${language}`) || '';
    const matching = availableVoices.filter(voice => voice.lang.toLowerCase().startsWith(language)).sort((a,b)=>voiceScore(b)-voiceScore(a));
    select.replaceChildren();
    const automatic = document.createElement('option'); automatic.value=''; automatic.textContent=language==='fr'?'✨ Meilleure voix automatique':'✨ Best automatic voice'; select.append(automatic);
    matching.forEach(voice => { const option=document.createElement('option'); option.value=voice.voiceURI; option.textContent=`${voice.name} · ${voice.lang}${/natural|neural|premium/i.test(voice.name)?' ★':''}`; select.append(option); });
    if (previous && matching.some(voice=>voice.voiceURI===previous)) select.value=previous;
  }

  function selectedVoice() {
    const selected = $('#voiceSelect')?.value;
    if (selected) return availableVoices.find(voice=>voice.voiceURI===selected) || null;
    return availableVoices.filter(voice=>voice.lang.toLowerCase().startsWith(language)).sort((a,b)=>voiceScore(b)-voiceScore(a))[0] || null;
  }

  function shuffle(values) {
    const result = [...values];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function buildBoard() {
    const board = $('#numberBoard');
    board.replaceChildren();
    letters.forEach((letter, column) => {
      const heading = document.createElement('div');
      heading.className = `board-letter ${letter.toLowerCase()}`;
      heading.textContent = letter;
      board.append(heading);
      for (let value = ranges[column][0]; value <= ranges[column][1]; value++) {
        const cell = document.createElement('div');
        cell.className = 'board-number'; cell.dataset.number = value; cell.textContent = value;
        board.append(cell);
      }
    });
  }

  function makeCageBalls() {
    const box = $('#cageBalls');
    for (let i = 0; i < 13; i++) {
      const ball = document.createElement('i');
      ball.style.cssText = `position:absolute;width:18px;height:18px;border-radius:50%;left:${12 + Math.random()*72}%;top:${10 + Math.random()*72}%;background:${colors[i%5]};box-shadow:inset 3px 3px 4px #fff8,0 1px 2px #0007`;
      box.append(ball);
    }
  }

  function createCard() {
    const columns = ranges.map(([min,max], index) => shuffle(Array.from({length:max-min+1},(_,i)=>min+i)).slice(0,index===2?4:5).sort((a,b)=>a-b));
    columns[2].splice(2,0,'FREE');
    return columns;
  }

  function renderCards() {
    const area = $('#printArea');
    const count = Number($('#cardCount').value || 6);
    area.replaceChildren();
    const seen = new Set();
    for (let cardIndex = 0; cardIndex < count; cardIndex++) {
      let card, signature;
      do { card = createCard(); signature = card.flat().join('-'); } while (seen.has(signature));
      seen.add(signature);
      const article = document.createElement('article'); article.className = 'bingo-card';
      const serial = `DP-${String(Date.now()).slice(-5)}-${String(cardIndex+1).padStart(2,'0')}`;
      article.innerHTML = `<div class="bingo-card-head"><strong>BINGO</strong><small>${language === 'fr' ? 'CARTE' : 'CARD'} ${serial}</small></div><div class="card-grid">${letters.map(letter=>`<b>${letter}</b>`).join('')}${Array.from({length:5},(_,row)=>card.map(column=>column[row]).map(value=>value==='FREE'?`<span class="free">${language === 'fr' ? 'CASE<br>GRATUITE' : 'FREE<br>SPACE'}</span>`:`<span>${value}</span>`).join('')).join('')}</div>`;
      area.append(article);
    }
  }

  function ballLabel(number) { return `${letters[Math.floor((number - 1) / 15)]} ${number}`; }
  function setCaller(title, sub = '') { $('#callerMessage').textContent = title; $('#callerSub').textContent = sub; }
  function setPhase(next) {
    phase = next;
    const active = next === 'running', started = next !== 'idle' && next !== 'complete';
    $('#machine').classList.toggle('running', active);
    $('#pauseButton').disabled = !started;
    $('#nextButton').disabled = next === 'complete' || next === 'idle';
    $('#bingoButton').disabled = next === 'idle' || next === 'complete';
    $('#startButton').disabled = started;
    $('#startButton').textContent = language === 'fr' ? 'DÉMARRER LE BINGO' : 'START THE BINGO';
    $('#pauseButton').textContent = next === 'paused' ? (language === 'fr' ? '▶ REPRENDRE' : '▶ RESUME') : (language === 'fr' ? 'Ⅱ PAUSE' : 'Ⅱ PAUSE');
  }

  function schedule() {
    clearTimeout(timer);
    const delay = Number($('#speedSelect').value);
    if (phase === 'running' && delay > 0) timer = setTimeout(drawBall, delay);
  }

  function startGame() {
    clearTimeout(timer); window.speechSynthesis?.cancel();
    bag = shuffle(Array.from({length:75},(_,i)=>i+1)); called = [];
    document.querySelectorAll('.board-number.called').forEach(cell=>cell.classList.remove('called'));
    $('#lastBalls').replaceChildren(); $('#currentBall span').textContent = '—'; $('#ballCount').textContent = '0 / 75';
    setPhase('running');
    setCaller(language === 'fr' ? 'La partie commence!' : 'The game is starting!', language === 'fr' ? 'Bonne chance à tout le monde.' : 'Good luck, everyone.');
    speak(language === 'fr' ? 'La partie de bingo commence. Bonne chance!' : 'The bingo game is starting. Good luck!');
    setTimeout(drawBall, 900);
  }

  function drawBall() {
    clearTimeout(timer);
    if (phase !== 'running' && phase !== 'paused') return;
    if (!bag.length) { finishAll(); return; }
    const wasPaused = phase === 'paused';
    const number = bag.pop(), label = ballLabel(number);
    called.push(number);
    const machine = $('#machine'); machine.classList.add('drawing');
    setTimeout(()=>machine.classList.remove('drawing'),720);
    const ball = $('#currentBall'); ball.style.background = `radial-gradient(circle at 35% 25%,white,${colors[Math.floor((number-1)/15)]} 48%,#5b2f20 115%)`;
    ball.querySelector('span').textContent = label; ball.classList.remove('pop'); void ball.offsetWidth; ball.classList.add('pop');
    document.querySelector(`.board-number[data-number="${number}"]`)?.classList.add('called');
    $('#ballCount').textContent = `${called.length} / 75`;
    renderRecent();
    setCaller(label, language === 'fr' ? `Boule numéro ${number}.` : `Ball number ${number}.`);
    sound('draw'); speak(language === 'fr' ? `${letters[Math.floor((number-1)/15)]}, ${number}` : `${letters[Math.floor((number-1)/15)]}, ${number}`);
    if (navigator.vibrate) navigator.vibrate(25);
    if (!wasPaused) schedule();
  }

  function renderRecent() {
    const recent = $('#lastBalls'); recent.replaceChildren();
    called.slice(-5).reverse().forEach(number => {
      const item = document.createElement('span'); item.textContent = ballLabel(number); item.style.background = colors[Math.floor((number-1)/15)]; recent.append(item);
    });
  }

  function togglePause() {
    if (phase === 'running') { clearTimeout(timer); setPhase('paused'); setCaller(language === 'fr' ? 'Partie en pause' : 'Game paused', language === 'fr' ? 'Appuyez sur reprendre quand tout le monde est prêt.' : 'Press resume when everyone is ready.'); }
    else if (phase === 'paused') { setPhase('running'); setCaller(language === 'fr' ? 'On reprend!' : 'Here we go again!', language === 'fr' ? 'La prochaine boule arrive.' : 'The next ball is coming.'); schedule(); }
  }

  function callBingo() {
    clearTimeout(timer); setPhase('complete');
    setCaller('BINGO!', language === 'fr' ? 'Félicitations! Vérifiez la carte gagnante.' : 'Congratulations! Check the winning card.');
    speak(language === 'fr' ? 'Bingo! Nous avons un gagnant!' : 'Bingo! We have a winner!'); sound('win'); confetti();
  }

  function finishAll() {
    clearTimeout(timer); setPhase('complete');
    setCaller(language === 'fr' ? 'Toutes les boules sont sorties' : 'All balls have been called', language === 'fr' ? 'Commencez une nouvelle partie pour rejouer.' : 'Start a new game to play again.');
  }

  function newGame() {
    clearTimeout(timer); window.speechSynthesis?.cancel(); bag=[]; called=[];
    document.querySelectorAll('.board-number.called').forEach(cell=>cell.classList.remove('called'));
    $('#lastBalls').replaceChildren(); $('#currentBall').removeAttribute('style'); $('#currentBall span').textContent='—'; $('#ballCount').textContent='0 / 75';
    setPhase('idle'); setCaller(language === 'fr' ? 'Prêts pour une nouvelle partie?' : 'Ready for a new game?', language === 'fr' ? 'Imprimez les cartes, puis démarrez le boulier.' : 'Print the cards, then start the machine.');
  }

  function speak(text) {
    if (!soundOn || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text), voice=selectedVoice();
    if (voice) utterance.voice=voice;
    utterance.lang = voice?.lang || (language === 'fr' ? 'fr-CA' : 'en-CA'); utterance.rate = .93; utterance.pitch = 1; utterance.volume = 1; window.speechSynthesis.speak(utterance);
  }

  function sound(kind) {
    if (!soundOn) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const now=audioContext.currentTime, oscillator=audioContext.createOscillator(), gain=audioContext.createGain();
      oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.type=kind==='win'?'triangle':'sine'; oscillator.frequency.setValueAtTime(kind==='win'?523:180,now); oscillator.frequency.exponentialRampToValueAtTime(kind==='win'?784:95,now+.22); gain.gain.setValueAtTime(.0001,now); gain.gain.exponentialRampToValueAtTime(.12,now+.02); gain.gain.exponentialRampToValueAtTime(.0001,now+(kind==='win'?.65:.28)); oscillator.start(now); oscillator.stop(now+(kind==='win'?.68:.3));
    } catch (_) {}
  }

  function confetti() {
    const box=$('#celebration'); box.replaceChildren();
    for(let i=0;i<90;i++){const bit=document.createElement('i');bit.style.left=`${Math.random()*100}%`;bit.style.setProperty('--confetti',colors[i%colors.length]);bit.style.setProperty('--drift',`${(Math.random()-.5)*220}px`);bit.style.animationDelay=`${Math.random()*.7}s`;box.append(bit)}
    setTimeout(()=>box.replaceChildren(),3300);
  }

  $('#languageButton').onclick=()=>{language=language==='fr'?'en':'fr';localStorage.setItem('siteLang',language);applyLanguage()};
  $('#soundButton').onclick=()=>{soundOn=!soundOn;localStorage.setItem('danpcBingoSound',soundOn?'on':'off');if(!soundOn)window.speechSynthesis?.cancel();applyLanguage();if(soundOn)sound('draw')};
  $('#fullscreenButton').onclick=toggleFullscreen;
  $('#voiceSelect').onchange=()=>{localStorage.setItem(`danpcBingoVoice:${language}`,$('#voiceSelect').value);speak(language==='fr'?'Bonsoir tout le monde. Bienvenue au bingo!':'Good evening, everyone. Welcome to bingo!')};
  $('#testVoiceButton').onclick=()=>speak(language==='fr'?'Bonsoir tout le monde. La prochaine boule arrive!':'Good evening, everyone. The next ball is coming!');
  $('#openCardsButton').onclick=()=>{renderCards();$('#cardsDialog').showModal()};
  $('#generateCardsButton').onclick=renderCards;
  $('#cardCount').onchange=renderCards;
  $('#printCardsButton').onclick=()=>window.print();
  $('#startButton').onclick=startGame;
  $('#pauseButton').onclick=togglePause;
  $('#nextButton').onclick=()=>{if(phase==='running'){clearTimeout(timer);drawBall()}else if(phase==='paused')drawBall()};
  $('#bingoButton').onclick=callBingo;
  $('#newGameButton').onclick=newGame;
  $('#speedSelect').onchange=schedule;
  document.addEventListener('fullscreenchange',updateFullscreenButton);
  document.addEventListener('webkitfullscreenchange',updateFullscreenButton);
  addEventListener('beforeunload',()=>{clearTimeout(timer);window.speechSynthesis?.cancel()});

  buildBoard(); makeCageBalls(); renderCards(); applyLanguage(); setPhase('idle');
  if ('speechSynthesis' in window) { window.speechSynthesis.addEventListener?.('voiceschanged',populateVoices); populateVoices(); }
  if (params.get('cards') === '1') $('#cardsDialog').showModal();
})();
