(() => {
  'use strict';

  const GAME_ID='xeno-wordlock.html';
  const STORAGE_KEY='xenoWordlockStatsV1';
  const WORD_LENGTH=5;
  const MAX_GUESSES=6;
  const $=selector=>document.querySelector(selector);
  const board=$('#board'),keyboard=$('#keyboard'),message=$('#message'),resultScreen=$('#resultScreen');

  const banks={
    fr:[
      ['ALIEN','ESPACE'],['ASTRE','ESPACE'],['LASER','ESPACE'],['SONDE','ESPACE'],['ROBOT','ESPACE'],['RADAR','ESPACE'],['FUSÉE','ESPACE'],['TERRE','ESPACE'],
      ['ATOME','SCIENCE'],['VIRUS','SCIENCE'],['SÉRUM','SCIENCE'],['MÉTAL','SCIENCE'],['VERRE','SCIENCE'],['PHASE','SCIENCE'],['FORCE','SCIENCE'],['ONDES','SCIENCE'],
      ['OCÉAN','NATURE'],['PLUIE','NATURE'],['NUAGE','NATURE'],['FLEUR','NATURE'],['ARBRE','NATURE'],['TIGRE','NATURE'],['AIGLE','NATURE'],['NEIGE','NATURE'],
      ['TRAIN','VOYAGE'],['ROUTE','VOYAGE'],['PISTE','VOYAGE'],['PORTS','VOYAGE'],['AVION','VOYAGE'],['HÔTEL','VOYAGE'],['TAXIS','VOYAGE'],['MÉTRO','VOYAGE'],
      ['TABLE','OBJETS'],['LIVRE','OBJETS'],['PIANO','OBJETS'],['RADIO','OBJETS'],['ÉCRAN','OBJETS'],['PORTE','OBJETS'],['CLEFS','OBJETS'],['LAMPE','OBJETS'],
      ['OMBRE','MYSTÈRE'],['CRÂNE','MYSTÈRE'],['MAGIE','MYSTÈRE'],['RÉBUS','MYSTÈRE'],['SIGNE','MYSTÈRE'],['PIÈGE','MYSTÈRE'],['TRACE','MYSTÈRE'],['RÊVES','MYSTÈRE'],
      ['POMME','CUISINE'],['POIRE','CUISINE'],['PAINS','CUISINE'],['SUCRE','CUISINE'],['CRÈME','CUISINE'],['PIZZA','CUISINE'],['SAUCE','CUISINE'],['OEUFS','CUISINE'],
      ['CHANT','ACTIONS'],['DANSE','ACTIONS'],['SAUTE','ACTIONS'],['COURS','ACTIONS'],['PARLE','ACTIONS'],['OUVRE','ACTIONS'],['FERME','ACTIONS'],['GARDE','ACTIONS']
    ],
    en:[
      ['ALIEN','SPACE'],['STARS','SPACE'],['LASER','SPACE'],['PROBE','SPACE'],['ROBOT','SPACE'],['RADAR','SPACE'],['COMET','SPACE'],['EARTH','SPACE'],
      ['CELLS','SCIENCE'],['VIRUS','SCIENCE'],['SERUM','SCIENCE'],['METAL','SCIENCE'],['GLASS','SCIENCE'],['PHASE','SCIENCE'],['FORCE','SCIENCE'],['WAVES','SCIENCE'],
      ['OCEAN','NATURE'],['RAINY','NATURE'],['CLOUD','NATURE'],['BLOOM','NATURE'],['TREES','NATURE'],['TIGER','NATURE'],['EAGLE','NATURE'],['SNOWY','NATURE'],
      ['TRAIN','TRAVEL'],['ROUTE','TRAVEL'],['TRACK','TRAVEL'],['PORTS','TRAVEL'],['PLANE','TRAVEL'],['HOTEL','TRAVEL'],['TAXIS','TRAVEL'],['METRO','TRAVEL'],
      ['TABLE','OBJECTS'],['BOOKS','OBJECTS'],['PIANO','OBJECTS'],['RADIO','OBJECTS'],['PHONE','OBJECTS'],['DOORS','OBJECTS'],['CLOCK','OBJECTS'],['LIGHT','OBJECTS'],
      ['SHADE','MYSTERY'],['SKULL','MYSTERY'],['MAGIC','MYSTERY'],['CLUES','MYSTERY'],['SIGNS','MYSTERY'],['TRAPS','MYSTERY'],['TRAIL','MYSTERY'],['DREAM','MYSTERY'],
      ['APPLE','KITCHEN'],['PEARS','KITCHEN'],['BREAD','KITCHEN'],['SUGAR','KITCHEN'],['CREAM','KITCHEN'],['PIZZA','KITCHEN'],['SAUCE','KITCHEN'],['HONEY','KITCHEN'],
      ['SINGS','ACTIONS'],['DANCE','ACTIONS'],['JUMPS','ACTIONS'],['DRIVE','ACTIONS'],['SPEAK','ACTIONS'],['OPENS','ACTIONS'],['CLOSE','ACTIONS'],['GUARD','ACTIONS']
    ]
  };

  const copy={
    fr:{daily:'SIGNAL DU JOUR',random:'SIGNAL LIBRE',prompt:'ENTRE UN MOT DE CINQ LETTRES',short:'IL MANQUE DES LETTRES',invalid:'UTILISE SEULEMENT DES LETTRES',win:'CODE DÉCHIFFRÉ',lose:'SIGNAL PERDU',winText:(tries,time)=>`Transmission ouverte en ${tries} essai${tries>1?'s':''} · ${time}.`,loseText:'La transmission s’est refermée. Tu peux tenter un nouveau signal.',clue:theme=>`FAMILLE DU SIGNAL : ${theme}`,clueUsed:'INDICE DÉJÀ TRANSMIS',finished:'CETTE TRANSMISSION EST TERMINÉE',soundOn:'◖)) SON',soundOff:'◖)) MUET',enter:'VALIDER',back:'⌫',dailyDone:'SIGNAL DU JOUR DÉJÀ TERMINÉ — TU PEUX LE REVOIR'},
    en:{daily:'DAILY SIGNAL',random:'FREE SIGNAL',prompt:'ENTER A FIVE-LETTER WORD',short:'MORE LETTERS REQUIRED',invalid:'USE LETTERS ONLY',win:'CODE DECODED',lose:'SIGNAL LOST',winText:(tries,time)=>`Transmission opened in ${tries} ${tries===1?'try':'tries'} · ${time}.`,loseText:'The transmission closed. You can attempt a new signal.',clue:theme=>`SIGNAL FAMILY: ${theme}`,clueUsed:'CLUE ALREADY TRANSMITTED',finished:'THIS TRANSMISSION IS COMPLETE',soundOn:'◖)) SOUND',soundOff:'◖)) MUTED',enter:'ENTER',back:'⌫',dailyDone:'DAILY SIGNAL ALREADY COMPLETE — YOU CAN REVIEW IT'}
  };

  let language=localStorage.getItem('siteLang')==='en'?'en':'fr';
  let soundOn=localStorage.getItem('xenoWordlockSound')!=='off';
  let currentIndex=0,currentWord='',currentLabel='',currentTheme='',mode='daily';
  let row=0,currentGuess='',finished=false,clueUsed=false,seconds=0,timerId=0,audioContext;

  function normalize(word){return word.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z]/g,'')}
  function timeText(value=seconds){return `${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`}
  function dayNumber(){const now=new Date();return Math.floor((Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())-Date.UTC(2026,0,1))/86400000)}
  function stats(){
    try{
      const all=JSON.parse(localStorage.getItem(STORAGE_KEY))||{};
      return all[language]||{played:0,wins:0,streak:0,best:0,solved:[]};
    }catch{return {played:0,wins:0,streak:0,best:0,solved:[]}}
  }
  function saveStats(next){
    let all={};try{all=JSON.parse(localStorage.getItem(STORAGE_KEY))||{}}catch{}
    all[language]=next;localStorage.setItem(STORAGE_KEY,JSON.stringify(all));
  }
  function setTimer(active){clearInterval(timerId);timerId=0;if(active)timerId=setInterval(()=>{seconds++;$('#timer').textContent=timeText()},1000)}
  function playTone(kind='key'){
    if(!soundOn)return;
    try{
      audioContext||=new(window.AudioContext||window.webkitAudioContext)();if(audioContext.state==='suspended')audioContext.resume();
      const notes=kind==='win'?[420,560,720,940]:kind==='lose'?[220,175,135]:kind==='reveal'?[330,430]:[300];
      notes.forEach((frequency,index)=>{const oscillator=audioContext.createOscillator(),gain=audioContext.createGain(),start=audioContext.currentTime+index*.065;oscillator.type=kind==='lose'?'sawtooth':'sine';oscillator.frequency.value=frequency;gain.gain.setValueAtTime(.001,start);gain.gain.linearRampToValueAtTime(kind==='key'?.018:.05,start+.02);gain.gain.exponentialRampToValueAtTime(.001,start+.15);oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.start(start);oscillator.stop(start+.17)})
    }catch{}
  }
  function showMessage(text,state=''){message.textContent=text;message.className=`message ${state}`.trim()}
  function renderBoard(){
    const cells=[];for(let r=0;r<MAX_GUESSES;r++)for(let c=0;c<WORD_LENGTH;c++){const tile=document.createElement('div');tile.className='tile';tile.dataset.row=r;tile.dataset.col=c;tile.setAttribute('role','gridcell');cells.push(tile)}board.replaceChildren(...cells)
  }
  function renderKeyboard(){
    const rows=['QWERTYUIOP','ASDFGHJKL','ZXCVBNM'];keyboard.replaceChildren(...rows.map((letters,index)=>{const line=document.createElement('div');line.className='key-row';if(index===2)line.append(makeKey('ENTER',copy[language].enter,true));[...letters].forEach(letter=>line.append(makeKey(letter,letter,false)));if(index===2)line.append(makeKey('BACK',copy[language].back,true));return line}))
  }
  function makeKey(value,label,wide){const key=document.createElement('button');key.type='button';key.className=`key${wide?' wide':''}`;key.dataset.key=value;key.textContent=label;key.setAttribute('aria-label',value==='BACK'?(language==='fr'?'Effacer':'Delete'):label);key.onclick=()=>handleKey(value);return key}
  function tileAt(r,c){return board.querySelector(`[data-row="${r}"][data-col="${c}"]`)}
  function updateCurrentRow(){for(let c=0;c<WORD_LENGTH;c++){const tile=tileAt(row,c);if(!tile)continue;tile.textContent=currentGuess[c]||'';tile.classList.toggle('filled',Boolean(currentGuess[c]));tile.classList.toggle('current',c===currentGuess.length&&currentGuess.length<WORD_LENGTH)}}
  function scoreGuess(guess,target){
    const marks=Array(WORD_LENGTH).fill('absent'),remaining={};
    for(let i=0;i<WORD_LENGTH;i++)if(guess[i]===target[i])marks[i]='correct';else remaining[target[i]]=(remaining[target[i]]||0)+1;
    for(let i=0;i<WORD_LENGTH;i++)if(marks[i]!=='correct'&&remaining[guess[i]]>0){marks[i]='present';remaining[guess[i]]--}
    return marks;
  }
  function updateKeyboard(letter,mark){const key=keyboard.querySelector(`[data-key="${letter}"]`);if(!key)return;const priority={absent:1,present:2,correct:3};const previous=['absent','present','correct'].find(value=>key.classList.contains(value));if(!previous||priority[mark]>priority[previous]){key.classList.remove('absent','present','correct');key.classList.add(mark)}}
  async function submitGuess(){
    if(currentGuess.length!==WORD_LENGTH){showMessage(copy[language].short,'error');shakeRow();return}
    const guess=currentGuess,marks=scoreGuess(guess,currentWord);
    for(let i=0;i<WORD_LENGTH;i++){const tile=tileAt(row,i);setTimeout(()=>{tile.classList.add('reveal',marks[i]);updateKeyboard(guess[i],marks[i]);playTone('reveal')},i*115)}
    const won=guess===currentWord;row++;currentGuess='';
    if(won){finished=true;setTimer(false);setTimeout(()=>finishGame(true),WORD_LENGTH*115+310);return}
    if(row>=MAX_GUESSES){finished=true;setTimer(false);setTimeout(()=>finishGame(false),WORD_LENGTH*115+310);return}
    setTimeout(()=>{updateCurrentRow();showMessage(copy[language].prompt)},WORD_LENGTH*115+120)
  }
  function shakeRow(){for(let c=0;c<WORD_LENGTH;c++){const tile=tileAt(row,c);tile?.classList.add('shake');setTimeout(()=>tile?.classList.remove('shake'),380)}}
  function handleKey(value){
    if(finished){showMessage(copy[language].finished,'error');return}
    if(value==='ENTER'){submitGuess();return}
    if(value==='BACK'){currentGuess=currentGuess.slice(0,-1);updateCurrentRow();playTone();return}
    const letter=normalize(value);if(!/^[A-Z]$/.test(letter)){showMessage(copy[language].invalid,'error');return}
    if(currentGuess.length>=WORD_LENGTH)return;currentGuess+=letter;updateCurrentRow();playTone()
  }
  function randomIndex(){const length=banks[language].length,solved=new Set(stats().solved||[]),unseen=Array.from({length},(_,index)=>index).filter(index=>!solved.has(index)&&index!==currentIndex),pool=unseen.length?unseen:Array.from({length},(_,index)=>index).filter(index=>index!==currentIndex);return pool[Math.floor(Math.random()*pool.length)]??0}
  function begin(nextMode='random',forcedIndex=null){
    mode=nextMode;const bank=banks[language];currentIndex=forcedIndex??(mode==='daily'?((dayNumber()%bank.length)+bank.length)%bank.length:randomIndex());
    [currentLabel,currentTheme]=bank[currentIndex];currentWord=normalize(currentLabel);row=0;currentGuess='';finished=false;clueUsed=false;seconds=0;
    resultScreen.classList.remove('show');renderBoard();renderKeyboard();updateCurrentRow();setTimer(true);showMessage(copy[language].prompt);$('#clueButton').disabled=false;$('#clueText').textContent=language==='fr'?'Demande un indice pour révéler la famille du signal.':'Request a clue to reveal the signal family.';updateStatus()
  }
  function updateStatus(){
    const data=stats(),unique=new Set(data.solved||[]).size,percent=Math.round(unique/banks[language].length*100);
    $('#modeReadout').textContent=mode==='daily'?copy[language].daily:copy[language].random;$('#archiveReadout').textContent=`${String(unique).padStart(2,'0')} / ${banks[language].length}`;$('#streakReadout').textContent=data.streak||0;$('#timer').textContent=timeText();$('#playedStat').textContent=data.played||0;$('#winsStat').textContent=data.wins||0;$('#bestStat').textContent=data.best||0;$('#uniqueStat').textContent=unique;$('#percentReadout').textContent=`${percent}%`;$('#archiveFill').style.width=`${percent}%`
  }
  function useClue(){if(clueUsed){showMessage(copy[language].clueUsed,'error');return}clueUsed=true;$('#clueButton').disabled=true;const clue=copy[language].clue(currentTheme);$('#clueText').textContent=clue;showMessage(clue);playTone('reveal')}
  function finishGame(won){
    const data=stats();data.played=(data.played||0)+1;
    if(won){data.wins=(data.wins||0)+1;data.streak=(data.streak||0)+1;data.best=Math.max(data.best||0,data.streak);data.solved=Array.from(new Set([...(data.solved||[]),currentIndex]))}else data.streak=0;
    saveStats(data);updateStatus();const tries=Math.min(row,MAX_GUESSES),score=won?Math.max(100,1200-tries*125-seconds*2-(clueUsed?100:0)):0;
    $('#resultAlien').textContent=won?'👽':'📡';$('#resultTitle').textContent=won?copy[language].win:copy[language].lose;$('#resultText').textContent=won?copy[language].winText(tries,timeText()):copy[language].loseText;$('#answerWord').textContent=currentLabel;$('#resultScore').textContent=String(score).padStart(4,'0');resultScreen.classList.add('show');playTone(won?'win':'lose');
    if(won){window.DanArcadeFX?.burst($('#resultTitle'),'#caff63',24);window.DanArcadeScores?.record(GAME_ID,score,`${score} pts · ${tries}/6`,`${currentLabel} · ${timeText()}`)}
  }
  function applyLanguage(next){language=next==='en'?'en':'fr';document.documentElement.lang=language;localStorage.setItem('siteLang',language);document.querySelectorAll('[data-fr][data-en]').forEach(element=>element.textContent=element.dataset[language]);$('#languageButton').textContent=language==='fr'?'EN':'FR';$('#languageButton').setAttribute('aria-label',language==='fr'?'English':'Français');$('#soundButton').textContent=soundOn?copy[language].soundOn:copy[language].soundOff;$('#board').setAttribute('aria-label',language==='fr'?'Grille de décodage':'Decoder grid');document.dispatchEvent(new Event('fullscreenchange'));begin('daily')}

  document.addEventListener('keydown',event=>{if(resultScreen.classList.contains('show')){if(event.key==='Escape')resultScreen.classList.remove('show');return}if(event.key==='Enter')handleKey('ENTER');else if(event.key==='Backspace')handleKey('BACK');else if(/^[a-zA-ZÀ-ÿ]$/.test(event.key))handleKey(event.key)});
  $('#clueButton').onclick=useClue;$('#newWordButton').onclick=()=>begin('random');$('#dailyButton').onclick=()=>begin('daily');$('#nextButton').onclick=()=>begin('random');$('#closeResultButton').onclick=()=>resultScreen.classList.remove('show');$('#languageButton').onclick=()=>applyLanguage(language==='fr'?'en':'fr');$('#soundButton').onclick=()=>{soundOn=!soundOn;localStorage.setItem('xenoWordlockSound',soundOn?'on':'off');$('#soundButton').setAttribute('aria-pressed',String(soundOn));$('#soundButton').textContent=soundOn?copy[language].soundOn:copy[language].soundOff;playTone()};
  applyLanguage(language);
})();
