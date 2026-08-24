const menu = document.querySelector('#menu');
const play = document.querySelector('#play');
const area = document.querySelector('#gameArea');
const instruction = document.querySelector('#instruction');
const newRound = document.querySelector('#newRound');
const starCount = document.querySelector('#starCount');
const celebration = document.querySelector('#celebration');
let stars = 0, currentGame = '', soundOn = true, audioContext;

const gameNames = {
  shapes: ['MISSION FORMES', 'Les formes'], memory: ['MISSION MÉMOIRE', 'Mémoire spatiale'],
  counting: ['MISSION ÉTOILES', 'Compte les étoiles'], pattern: ['MISSION LOGIQUE', 'La suite magique']
};
const shuffle = a => [...a].sort(() => Math.random() - .5);
function sound(type='good') {
  if (!soundOn) return;
  audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
  const o = audioContext.createOscillator(), g = audioContext.createGain(), now = audioContext.currentTime;
  o.connect(g); g.connect(audioContext.destination); o.type = 'sine';
  o.frequency.setValueAtTime(type === 'good' ? 520 : 180, now);
  o.frequency.exponentialRampToValueAtTime(type === 'good' ? 880 : 130, now + .16);
  g.gain.setValueAtTime(.12, now); g.gain.exponentialRampToValueAtTime(.001, now + .22);
  o.start(now); o.stop(now + .23);
}
function celebrate() {
  stars++; starCount.textContent = stars; sound('good'); celebration.classList.add('show');
  celebration.setAttribute('aria-hidden','false'); setTimeout(() => { celebration.classList.remove('show'); celebration.setAttribute('aria-hidden','true'); newRound.classList.remove('hidden'); }, 1250);
}
function openGame(game) {
  currentGame = game; menu.classList.remove('active'); play.classList.add('active');
  document.querySelector('#gameKicker').textContent = gameNames[game][0]; document.querySelector('#gameTitle').textContent = gameNames[game][1];
  newRound.classList.add('hidden'); buildGame(); window.scrollTo({top:0,behavior:'smooth'});
}
function buildGame(){ area.innerHTML=''; newRound.classList.add('hidden'); ({shapes:buildShapes,memory:buildMemory,counting:buildCounting,pattern:buildPattern}[currentGame])(); }

function buildShapes(){
  instruction.textContent='Touche une forme, puis sa maison pareille!';
  const colors={circle:'#ff6b9d',square:'#62f2d1',triangle:'#ffd760',star:'#9c7bff'}, kinds=Object.keys(colors), order=shuffle(kinds);
  area.innerHTML=`<div class="shape-board"><div class="pieces"></div><div class="targets"></div></div>`;
  const pieces=area.querySelector('.pieces'),targets=area.querySelector('.targets'); let selected=null,matched=0;
  shuffle(kinds).forEach(kind=>{const b=document.createElement('button');b.className='shape';b.dataset.kind=kind;b.setAttribute('aria-label',kind);b.innerHTML=`<span style="background:${colors[kind]}"></span>`;b.onclick=()=>{pieces.querySelectorAll('.shape').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');selected=b};pieces.append(b)});
  order.forEach(kind=>{const b=document.createElement('button');b.className='shape target';b.dataset.kind=kind;b.setAttribute('aria-label',`Maison ${kind}`);b.innerHTML=`<span style="background:${colors[kind]};opacity:.25"></span>`;b.onclick=()=>{if(!selected)return;if(selected.dataset.kind===kind){b.classList.add('matched');selected.classList.add('done');selected=null;sound();if(++matched===kinds.length)setTimeout(celebrate,450)}else{sound('no');b.animate([{transform:'translateX(-7px)'},{transform:'translateX(7px)'},{transform:'none'}],{duration:300})}};targets.append(b)});
}
function buildMemory(){
  instruction.textContent='Trouve les deux images pareilles!'; const icons=['🚀','🪐','👽','🌙','🛸','⭐']; let open=[],lock=false,pairs=0;
  const board=document.createElement('div');board.className='memory-board';area.append(board);
  shuffle([...icons,...icons]).forEach(icon=>{const b=document.createElement('button');b.className='memory-card';b.dataset.icon=icon;b.setAttribute('aria-label','Carte cachée');b.textContent=icon;b.onclick=()=>{if(lock||b.classList.contains('open')||b.classList.contains('matched'))return;b.classList.add('open');open.push(b);sound();if(open.length===2){lock=true;if(open[0].dataset.icon===open[1].dataset.icon){open.forEach(x=>x.classList.add('matched'));open=[];lock=false;if(++pairs===icons.length)setTimeout(celebrate,450)}else setTimeout(()=>{open.forEach(x=>x.classList.remove('open'));open=[];lock=false;sound('no')},700)}};board.append(b)});
}
function buildCounting(){
  instruction.textContent='Combien vois-tu d’étoiles?'; const answer=1+Math.floor(Math.random()*7);const cloud=document.createElement('div');cloud.className='count-stars';
  for(let i=0;i<answer;i++){const s=document.createElement('span');s.textContent='⭐';s.style.animationDelay=`${i*.06}s`;cloud.append(s)}
  const choices=new Set([answer]);while(choices.size<3)choices.add(1+Math.floor(Math.random()*7));const buttons=document.createElement('div');buttons.className='answers';
  shuffle([...choices]).forEach(n=>{const b=document.createElement('button');b.className='answer';b.textContent=n;b.onclick=()=>{if(n===answer){b.classList.add('right');buttons.querySelectorAll('button').forEach(x=>x.disabled=true);setTimeout(celebrate,350)}else{sound('no');b.classList.add('wrong');setTimeout(()=>b.classList.remove('wrong'),400)}};buttons.append(b)});area.append(cloud,buttons);
}
function buildPattern(){
  instruction.textContent='Quelle image vient après?'; const sets=[['🚀','🌙'],['👽','🛸'],['⭐','🪐'],['🌎','🌙','☀️']],base=sets[Math.floor(Math.random()*sets.length)],seq=[];for(let i=0;i<5;i++)seq.push(base[i%base.length]);const answer=base[5%base.length];
  const row=document.createElement('div');row.className='pattern-row';seq.forEach(x=>{const s=document.createElement('span');s.className='pattern-item';s.textContent=x;row.append(s)});const q=document.createElement('span');q.className='pattern-question';q.textContent='?';row.append(q);
  const pool=new Set([answer]);['🚀','🌙','👽','🛸','⭐','🪐','🌎','☀️'].filter(x=>!base.includes(x)).sort(()=>Math.random()-.5).slice(0,2).forEach(x=>pool.add(x));const buttons=document.createElement('div');buttons.className='pattern-answers';
  shuffle([...pool]).forEach(x=>{const b=document.createElement('button');b.className='answer';b.textContent=x;b.onclick=()=>{if(x===answer){q.textContent=answer;b.classList.add('right');buttons.querySelectorAll('button').forEach(y=>y.disabled=true);setTimeout(celebrate,350)}else{sound('no');b.classList.add('wrong');setTimeout(()=>b.classList.remove('wrong'),400)}};buttons.append(b)});area.append(row,buttons);
}

document.querySelectorAll('[data-game]').forEach(button=>button.addEventListener('click',()=>openGame(button.dataset.game)));
document.querySelector('#backButton').onclick=()=>{play.classList.remove('active');menu.classList.add('active');area.innerHTML=''};
document.querySelector('#soundButton').onclick=e=>{soundOn=!soundOn;e.currentTarget.textContent=soundOn?'🔊':'🔇';if(soundOn)sound()};
newRound.onclick=buildGame;
