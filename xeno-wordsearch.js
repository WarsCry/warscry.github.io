(() => {
  'use strict';

  const SIZE = 15;
  const WORDS_PER_SECTOR = 16;
  const TOTAL_WORDS = 64;
  const STORAGE_KEY = 'xenoCipherProgressV1';
  const alphabet = 'AAAAAAAAEEEEEEEEEEEEIIIIIIIIOOOOOOONNNNNNRRRRRRSSSSSSTTTTTTLLLLUUUUDDDCCMMPPBGFVHXQJKWYZ';
  const directions = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[-1,-1],[1,-1],[-1,1]];
  const copy = {
    fr:{
      sectors:[
        {name:'VAISSEAU-MÈRE',short:'VAISSEAU',icon:'🛸',words:['VAISSEAU','CABINE','RÉACTEUR','MOTEUR','HANGAR','COCKPIT','RADAR','ORBITE','NAVETTE','SAS','LASER','PLASMA','PILOTE','SIGNAL','MODULE','CAPTEUR']},
        {name:'CARTE DU COSMOS',short:'COSMOS',icon:'🌌',words:['GALAXIE','PLANÈTE','COMÈTE','ÉTOILE','NÉBULEUSE','ASTÉROÏDE','LUNE','SOLEIL','SATURNE','JUPITER','MARS','VÉNUS','COSMOS','MÉTÉORE','ÉCLIPSE','ORION']},
        {name:'BIOLOGIE XÉNO',short:'XÉNO',icon:'👽',words:['ALIEN','XÉNO','RUCHE','REINE','DRONE','TENTACULE','OVNI','ABDUCTION','MUTANT','SPÉCIMEN','PORTAIL','CRISTAL','BIOCORE','SONDE','OEUF','COLONIE']},
        {name:'PROTOCOLE SECRET',short:'MISSION',icon:'📡',words:['CAPITAINE','DÉFENSE','SURVIE','SECOURS','EXPLORER','CONTACT','MYSTÈRE','CHIFFRE','ÉNIGME','SECRET','ESCADRON','ROBOT','ANDROÏDE','SENTINELLE','DOMINION','STARFALL']}
      ],
      selectStart:'TOUCHE UNE LETTRE, PUIS GLISSE JUSQU’À LA DERNIÈRE',
      anchor:'PREMIÈRE LETTRE VERROUILLÉE · TOUCHE LA DERNIÈRE',
      invalid:'SIGNAL INCOMPLET · ESSAIE UNE AUTRE LIGNE',
      found:word=>`SIGNAL DÉCODÉ · ${word}`,
      hintMessage:word=>`INDICE ACTIVÉ · CHERCHE ${word}`,
      noHints:'PLUS AUCUN INDICE DISPONIBLE',
      stats:(time,hints)=>`16 mots retrouvés en ${time}. ${hints} indice${hints>1?'s':''} utilisé${hints>1?'s':''}.`,
      complete:'ARCHIVE COMPLÈTE',sectorComplete:'SECTEUR DÉCODÉ',soundOn:'◖)) SON',soundOff:'◖)) MUET',hint:'INDICE',completeTag:'COMPLET'
    },
    en:{
      sectors:[
        {name:'MOTHERSHIP',short:'SHIP',icon:'🛸',words:['SPACESHIP','CABIN','REACTOR','ENGINE','HANGAR','COCKPIT','RADAR','ORBIT','SHUTTLE','AIRLOCK','LASER','PLASMA','PILOT','SIGNAL','MODULE','SENSOR']},
        {name:'COSMIC CHART',short:'COSMOS',icon:'🌌',words:['GALAXY','PLANET','COMET','STAR','NEBULA','ASTEROID','MOON','SUN','SATURN','JUPITER','MARS','VENUS','COSMOS','METEOR','ECLIPSE','ORION']},
        {name:'XENO BIOLOGY',short:'XENO',icon:'👽',words:['ALIEN','XENO','HIVE','QUEEN','DRONE','TENTACLE','UFO','ABDUCTION','MUTANT','SPECIMEN','PORTAL','CRYSTAL','BIOCORE','PROBE','EGG','COLONY']},
        {name:'SECRET PROTOCOL',short:'MISSION',icon:'📡',words:['CAPTAIN','DEFENCE','SURVIVAL','RESCUE','EXPLORE','CONTACT','MYSTERY','CIPHER','RIDDLE','SECRET','SQUADRON','ROBOT','ANDROID','SENTINEL','DOMINION','STARFALL']}
      ],
      selectStart:'TOUCH A LETTER, THEN DRAG TO THE LAST ONE',
      anchor:'FIRST LETTER LOCKED · TOUCH THE LAST ONE',
      invalid:'INCOMPLETE SIGNAL · TRY ANOTHER LINE',
      found:word=>`SIGNAL DECODED · ${word}`,
      hintMessage:word=>`HINT ACTIVE · FIND ${word}`,
      noHints:'NO HINTS REMAINING',
      stats:(time,hints)=>`16 words recovered in ${time}. ${hints} hint${hints===1?'':'s'} used.`,
      complete:'ARCHIVE COMPLETE',sectorComplete:'SECTOR DECODED',soundOn:'◖)) SOUND',soundOff:'◖)) MUTED',hint:'HINT',completeTag:'COMPLETE'
    }
  };

  const $ = selector => document.querySelector(selector);
  const grid = $('#grid');
  const wordList = $('#wordList');
  const message = $('#message');
  const sectorButtons = $('#sectorButtons');
  const resultScreen = $('#resultScreen');
  let language = localStorage.getItem('siteLang') === 'en' ? 'en' : 'fr';
  let soundOn = localStorage.getItem('xenoCipherSound') !== 'off';
  let sectorIndex = 0;
  let puzzle = null;
  let foundWords = new Set();
  let foundCells = new Set();
  let hintsLeft = 3;
  let hintsUsed = 0;
  let mistakes = 0;
  let streak = 0;
  let score = 0;
  let seconds = 0;
  let timerId = 0;
  let pointerId = null;
  let selectionStart = null;
  let selectionPath = [];
  let tapAnchor = null;
  let audioContext = null;

  function normalize(value) {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z]/gi,'').toUpperCase();
  }

  function shuffled(values) {
    const result = [...values];
    for (let i=result.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [result[i],result[j]]=[result[j],result[i]]; }
    return result;
  }

  function createPuzzle(labels) {
    const entries = labels.map(label=>({label,word:normalize(label)}));
    for (let rebuild=0;rebuild<40;rebuild++) {
      const matrix = Array.from({length:SIZE},()=>Array(SIZE).fill(''));
      const placements = new Map();
      let failed = false;
      for (const entry of [...entries].sort((a,b)=>b.word.length-a.word.length)) {
        let best = null;
        for (let attempt=0;attempt<700;attempt++) {
          const [dr,dc] = directions[Math.floor(Math.random()*directions.length)];
          const row = Math.floor(Math.random()*SIZE);
          const col = Math.floor(Math.random()*SIZE);
          const endRow = row + dr*(entry.word.length-1);
          const endCol = col + dc*(entry.word.length-1);
          if (endRow<0 || endRow>=SIZE || endCol<0 || endCol>=SIZE) continue;
          let overlap = 0;
          let valid = true;
          const cells = [];
          for (let i=0;i<entry.word.length;i++) {
            const r=row+dr*i,c=col+dc*i,current=matrix[r][c];
            if (current && current!==entry.word[i]) { valid=false; break; }
            if (current===entry.word[i]) overlap++;
            cells.push([r,c]);
          }
          if (valid && (!best || overlap>best.overlap || (overlap===best.overlap && Math.random()>.65))) best={cells,overlap};
        }
        if (!best) { failed=true; break; }
        best.cells.forEach(([r,c],i)=>matrix[r][c]=entry.word[i]);
        placements.set(entry.word,best.cells);
      }
      if (failed) continue;
      for (let r=0;r<SIZE;r++) for (let c=0;c<SIZE;c++) if (!matrix[r][c]) matrix[r][c]=alphabet[Math.floor(Math.random()*alphabet.length)];
      return {matrix,entries,placements};
    }
    throw new Error('Unable to build word grid');
  }

  function loadProgress() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
      return stored[language] || {complete:[false,false,false,false]};
    } catch { return {complete:[false,false,false,false]}; }
  }

  function saveSectorComplete() {
    let stored;
    try { stored=JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { stored={}; }
    const progress=stored[language] || {complete:[false,false,false,false]};
    progress.complete=Array.from({length:4},(_,i)=>Boolean(progress.complete?.[i] || i===sectorIndex));
    stored[language]=progress;
    localStorage.setItem(STORAGE_KEY,JSON.stringify(stored));
  }

  function timeText(value=seconds) {
    return `${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`;
  }

  function playTone(kind='select') {
    if (!soundOn) return;
    try {
      audioContext ||= new (window.AudioContext||window.webkitAudioContext)();
      if (audioContext.state==='suspended') audioContext.resume();
      const tones = kind==='found' ? [520,690,880] : kind==='complete' ? [440,580,730,980] : kind==='wrong' ? [180,135] : [370];
      tones.forEach((frequency,index)=>{
        const oscillator=audioContext.createOscillator(),gain=audioContext.createGain(),start=audioContext.currentTime+index*.065;
        oscillator.type=kind==='wrong'?'sawtooth':'sine'; oscillator.frequency.value=frequency;
        gain.gain.setValueAtTime(.001,start); gain.gain.linearRampToValueAtTime(kind==='select'?.025:.055,start+.02); gain.gain.exponentialRampToValueAtTime(.001,start+.16);
        oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(start); oscillator.stop(start+.18);
      });
    } catch {}
  }

  function showMessage(text,state='') {
    message.textContent=text;
    message.className=`message ${state}`.trim();
  }

  function setTimer(active) {
    clearInterval(timerId); timerId=0;
    if (!active) return;
    timerId=setInterval(()=>{seconds++; $('#timer').textContent=timeText();},1000);
  }

  function updateStatus() {
    const sector=copy[language].sectors[sectorIndex];
    $('#sectorReadout').textContent=`${String(sectorIndex+1).padStart(2,'0')} · ${sector.short}`;
    $('#foundReadout').textContent=`${String(foundWords.size).padStart(2,'0')} / ${WORDS_PER_SECTOR}`;
    $('#score').textContent=String(Math.max(0,score)).padStart(4,'0');
    $('#timer').textContent=timeText();
    $('#sectorTitle').textContent=sector.name;
    $('#sectorIcon').textContent=sector.icon;
    const progress=loadProgress();
    const completed=progress.complete.filter(Boolean).length;
    const archiveFound=completed*WORDS_PER_SECTOR + (progress.complete[sectorIndex]?0:foundWords.size);
    $('#archiveCount').textContent=`${archiveFound} / ${TOTAL_WORDS}`;
    $('#archiveFill').style.width=`${archiveFound/TOTAL_WORDS*100}%`;
    const hintLabel=$('#hintButton b');
    hintLabel.textContent=`${copy[language].hint} (${hintsLeft})`;
    $('#hintButton').disabled=hintsLeft===0 || foundWords.size===WORDS_PER_SECTOR;
  }

  function renderSectors() {
    const progress=loadProgress();
    sectorButtons.replaceChildren(...copy[language].sectors.map((sector,index)=>{
      const button=document.createElement('button');
      button.type='button'; button.className='sector-button';
      button.classList.toggle('active',index===sectorIndex);
      button.classList.toggle('complete',Boolean(progress.complete[index]));
      button.innerHTML=`<span aria-hidden="true">${sector.icon}</span><b>${String(index+1).padStart(2,'0')} · ${sector.short}</b><small>${progress.complete[index]?copy[language].completeTag:'16 MOTS'}</small>`;
      button.setAttribute('aria-pressed',String(index===sectorIndex));
      button.onclick=()=>startSector(index);
      return button;
    }));
  }

  function renderGrid() {
    const fragment=document.createDocumentFragment();
    puzzle.matrix.forEach((row,r)=>row.forEach((letter,c)=>{
      const button=document.createElement('button');
      button.type='button'; button.className='letter'; button.textContent=letter;
      button.dataset.row=r; button.dataset.col=c;
      button.setAttribute('role','gridcell');
      button.setAttribute('aria-label',`${letter}, ${language==='fr'?'ligne':'row'} ${r+1}, ${language==='fr'?'colonne':'column'} ${c+1}`);
      fragment.append(button);
    }));
    grid.replaceChildren(fragment);
  }

  function renderWords() {
    wordList.replaceChildren(...puzzle.entries.map(entry=>{
      const word=document.createElement('div');
      word.className='word'; word.dataset.word=entry.word; word.textContent=entry.label;
      return word;
    }));
  }

  function startSector(index=sectorIndex) {
    sectorIndex=(index+4)%4;
    const sector=copy[language].sectors[sectorIndex];
    puzzle=createPuzzle(sector.words);
    foundWords=new Set(); foundCells=new Set(); hintsLeft=3; hintsUsed=0; mistakes=0; streak=0; score=0; seconds=0;
    pointerId=null; selectionStart=null; selectionPath=[]; tapAnchor=null;
    resultScreen.classList.remove('show');
    renderGrid(); renderWords(); renderSectors(); updateStatus(); setTimer(true);
    showMessage(copy[language].selectStart);
  }

  function cellAt(row,col) { return grid.querySelector(`[data-row="${row}"][data-col="${col}"]`); }
  function coordinatesOf(element) { return {row:Number(element.dataset.row),col:Number(element.dataset.col)}; }
  function keyOf(row,col) { return `${row}:${col}`; }
  function cellFromPoint(x,y) {
    const rect=grid.getBoundingClientRect(),tolerance=36;
    if (x<rect.left-tolerance || x>rect.right+tolerance || y<rect.top-tolerance || y>rect.bottom+tolerance) return null;
    const safeX=Math.max(rect.left+1,Math.min(rect.right-1,x));
    const safeY=Math.max(rect.top+1,Math.min(rect.bottom-1,y));
    const cell=document.elementFromPoint(safeX,safeY)?.closest('.letter');
    return cell && grid.contains(cell) ? cell : null;
  }

  function pathBetween(start,end) {
    const rowDelta=end.row-start.row,colDelta=end.col-start.col;
    if (rowDelta===0 && colDelta===0) return [[start.row,start.col]];
    if (rowDelta!==0 && colDelta!==0 && Math.abs(rowDelta)!==Math.abs(colDelta)) return [];
    const length=Math.max(Math.abs(rowDelta),Math.abs(colDelta));
    const dr=Math.sign(rowDelta),dc=Math.sign(colDelta);
    return Array.from({length:length+1},(_,i)=>[start.row+dr*i,start.col+dc*i]);
  }

  function drawSelection(path) {
    grid.querySelectorAll('.selecting').forEach(cell=>cell.classList.remove('selecting'));
    path.forEach(([r,c])=>cellAt(r,c)?.classList.add('selecting'));
    selectionPath=path;
  }

  function clearSelection() {
    grid.querySelectorAll('.selecting').forEach(cell=>cell.classList.remove('selecting'));
    selectionPath=[]; selectionStart=null; pointerId=null;
  }

  function finishSelection(path) {
    if (path.length<2) return false;
    const letters=path.map(([r,c])=>puzzle.matrix[r][c]).join('');
    const reversed=[...letters].reverse().join('');
    const entry=puzzle.entries.find(item=>!foundWords.has(item.word)&&(item.word===letters||item.word===reversed));
    if (!entry) {
      mistakes++; streak=0; score=Math.max(0,score-10); playTone('wrong');
      window.DanArcadeFX?.flash('#ff67ad',.13,grid);
      showMessage(copy[language].invalid,'error'); clearSelection(); updateStatus(); return false;
    }
    foundWords.add(entry.word); streak++;
    score+=100+entry.word.length*8+Math.min(75,(streak-1)*15);
    path.forEach(([r,c])=>{foundCells.add(keyOf(r,c));cellAt(r,c)?.classList.add('found')});
    wordList.querySelector(`[data-word="${entry.word}"]`)?.classList.add('found');
    playTone('found'); window.DanArcadeFX?.burst(grid,'#c9ff62',12);
    showMessage(copy[language].found(entry.label),'success'); clearSelection(); updateStatus();
    if (foundWords.size===WORDS_PER_SECTOR) setTimeout(completeSector,550);
    return true;
  }

  function completeSector() {
    setTimer(false);
    score+=Math.max(0,1500-seconds*3)-hintsUsed*50-mistakes*5;
    score=Math.max(1,Math.round(score));
    saveSectorComplete(); renderSectors(); updateStatus();
    const progress=loadProgress(),allComplete=progress.complete.every(Boolean);
    $('#resultTitle').textContent=allComplete?copy[language].complete:copy[language].sectorComplete;
    $('#resultStats').textContent=copy[language].stats(timeText(),hintsUsed);
    $('#resultScore').textContent=String(score).padStart(4,'0');
    $('#nextSectorButton').textContent=language==='fr'?'SECTEUR SUIVANT →':'NEXT SECTOR →';
    $('#replayButton').textContent=language==='fr'?'REJOUER':'PLAY AGAIN';
    resultScreen.classList.add('show'); playTone('complete');
    window.DanArcadeFX?.burst($('#resultTitle'),'#62ffdd',24);
    const sector=copy[language].sectors[sectorIndex];
    window.DanArcadeScores?.record('xeno-wordsearch.html',score,`${score} pts · ${timeText()}`,`${sector.name} · 16 ${language==='fr'?'mots':'words'}`);
  }

  function useHint() {
    if (!hintsLeft) { showMessage(copy[language].noHints,'error'); return; }
    const available=puzzle.entries.filter(entry=>!foundWords.has(entry.word));
    if (!available.length) return;
    const entry=available[Math.floor(Math.random()*available.length)];
    const cells=puzzle.placements.get(entry.word);
    hintsLeft--; hintsUsed++; score=Math.max(0,score-50);
    const wordElement=wordList.querySelector(`[data-word="${entry.word}"]`);
    wordElement?.classList.add('hinted');
    cells.slice(0,Math.min(2,cells.length)).forEach(([r,c])=>cellAt(r,c)?.classList.add('hinting'));
    setTimeout(()=>{wordElement?.classList.remove('hinted');cells.forEach(([r,c])=>cellAt(r,c)?.classList.remove('hinting'))},2300);
    showMessage(copy[language].hintMessage(entry.label)); playTone('select'); updateStatus();
  }

  function applyLanguage(next=language) {
    language=next==='en'?'en':'fr'; document.documentElement.lang=language; localStorage.setItem('siteLang',language);
    document.querySelectorAll('[data-fr][data-en]').forEach(element=>element.textContent=element.dataset[language]);
    $('#languageButton').textContent=language==='fr'?'EN':'FR';
    $('#languageButton').setAttribute('aria-label',language==='fr'?'English':'Français');
    $('#soundButton').textContent=soundOn?copy[language].soundOn:copy[language].soundOff;
    $('#grid').setAttribute('aria-label',language==='fr'?'Grille de mots cachés':'Word search grid');
    document.dispatchEvent(new Event('fullscreenchange'));
    startSector(sectorIndex);
  }

  grid.addEventListener('pointerdown',event=>{
    const cell=event.target.closest('.letter'); if (!cell) return;
    event.preventDefault(); pointerId=event.pointerId; selectionStart=coordinatesOf(cell); selectionPath=[[selectionStart.row,selectionStart.col]];
    grid.setPointerCapture?.(event.pointerId); drawSelection(selectionPath); playTone('select');
  });
  grid.addEventListener('pointermove',event=>{
    if (event.pointerId!==pointerId || !selectionStart) return;
    event.preventDefault(); const cell=cellFromPoint(event.clientX,event.clientY); if (!cell) return;
    const path=pathBetween(selectionStart,coordinatesOf(cell)); if (path.length) drawSelection(path);
  });
  grid.addEventListener('pointerup',event=>{
    if (event.pointerId!==pointerId) return;
    event.preventDefault();
    const releaseCell=selectionStart && cellFromPoint(event.clientX,event.clientY);
    if (releaseCell) {
      const releasePath=pathBetween(selectionStart,coordinatesOf(releaseCell));
      if (releasePath.length) drawSelection(releasePath);
    }
    const path=[...selectionPath]; pointerId=null;
    if (path.length>1) { tapAnchor=null; finishSelection(path); return; }
    const current=path[0]; clearSelection();
    if (!tapAnchor) { tapAnchor={row:current[0],col:current[1]}; drawSelection([[current[0],current[1]]]); showMessage(copy[language].anchor); return; }
    const tapPath=pathBetween(tapAnchor,{row:current[0],col:current[1]}); tapAnchor=null;
    if (!tapPath.length || tapPath.length<2) { clearSelection(); showMessage(copy[language].invalid,'error'); return; }
    finishSelection(tapPath);
  });
  grid.addEventListener('pointercancel',()=>{pointerId=null;clearSelection()});

  $('#hintButton').onclick=useHint;
  $('#newGridButton').onclick=()=>startSector(sectorIndex);
  $('#nextSectorButton').onclick=()=>startSector(sectorIndex+1);
  $('#replayButton').onclick=()=>startSector(sectorIndex);
  $('#languageButton').onclick=()=>applyLanguage(language==='fr'?'en':'fr');
  $('#soundButton').onclick=()=>{soundOn=!soundOn;localStorage.setItem('xenoCipherSound',soundOn?'on':'off');$('#soundButton').setAttribute('aria-pressed',String(soundOn));$('#soundButton').textContent=soundOn?copy[language].soundOn:copy[language].soundOff;playTone('select')};
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&resultScreen.classList.contains('show'))resultScreen.classList.remove('show')});

  applyLanguage(language);
})();
