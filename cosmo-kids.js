const menu=document.querySelector('#menu'),play=document.querySelector('#play'),area=document.querySelector('#gameArea');
const instruction=document.querySelector('#instruction'),newRound=document.querySelector('#newRound');
const starCount=document.querySelector('#starCount'),celebration=document.querySelector('#celebration');
const encouragement=document.querySelector('#encouragement'),rewardIcon=document.querySelector('#rewardIcon');
const rewardTitle=document.querySelector('#rewardTitle'),rewardText=document.querySelector('#rewardText');
let stars=0,currentGame='',soundOn=true,audioContext,praiseIndex=0;

const gameNames={shapes:['MISSION FORMES','Les formes'],memory:['MISSION MÉMOIRE','Mémoire spatiale'],counting:['MISSION ÉTOILES','Compte les étoiles'],pattern:['MISSION LOGIQUE','La suite magique']};
const praises=[['Bravo!','Tu as réussi!','🌟'],['Super!','Quel beau travail!','🚀'],['Youpi!','Tu es fantastique!','🌈'],['Hourra!','Mission accomplie!','🪐'],['Yay!','Encore une victoire!','🎉'],['Magnifique!','Continue comme ça!','💫']];
const encouragements=['Oui, c’est ça!','Super choix!','Tu l’as trouvé!','Bravo, exploratrice!','Quelle championne!'];
const shuffle=a=>[...a].sort(()=>Math.random()-.5);

function audioReady(){if(!soundOn)return;audioContext||=new(window.AudioContext||window.webkitAudioContext)();if(audioContext.state==='suspended')audioContext.resume();return audioContext}
function tone(frequency,delay=0,duration=.14,volume=.08,wave='sine',endFrequency=frequency){
  const ctx=audioReady();if(!ctx)return;const o=ctx.createOscillator(),g=ctx.createGain(),now=ctx.currentTime+delay;
  o.connect(g);g.connect(ctx.destination);o.type=wave;o.frequency.setValueAtTime(frequency,now);o.frequency.exponentialRampToValueAtTime(Math.max(40,endFrequency),now+duration);
  g.gain.setValueAtTime(.001,now);g.gain.linearRampToValueAtTime(volume,now+.018);g.gain.exponentialRampToValueAtTime(.001,now+duration);o.start(now);o.stop(now+duration+.02);
}
function applause(){
  const ctx=audioReady();if(!ctx)return;
  for(let i=0;i<16;i++){const start=ctx.currentTime+.05+i*.045+Math.random()*.035,buffer=ctx.createBuffer(1,Math.floor(ctx.sampleRate*.055),ctx.sampleRate),data=buffer.getChannelData(0);
    for(let j=0;j<data.length;j++)data[j]=(Math.random()*2-1)*(1-j/data.length);
    const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=buffer;filter.type='bandpass';filter.frequency.value=900+Math.random()*1200;gain.gain.value=.035+Math.random()*.025;
    source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);source.start(start)}
}
function speakPraise(text){if(!soundOn||!('speechSynthesis'in window))return;speechSynthesis.cancel();const voice=new SpeechSynthesisUtterance(text);voice.lang='fr-CA';voice.pitch=1.35;voice.rate=.92;voice.volume=.85;speechSynthesis.speak(voice)}
function sound(type='good'){
  if(type==='tap'){tone(430,0,.07,.045,'sine',520);return}if(type==='flip'){tone(330,0,.08,.05,'triangle',520);return}
  if(type==='no'){tone(210,0,.13,.065,'triangle',155);tone(155,.12,.14,.05,'triangle',120);return}
  if(type==='match'){tone(520,0,.1,.065);tone(660,.09,.1,.07);tone(820,.18,.13,.075);return}
  tone(520,0,.12,.075);tone(660,.09,.12,.08);tone(880,.18,.2,.09);
}
function cheer(message){encouragement.textContent=message||encouragements[Math.floor(Math.random()*encouragements.length)];encouragement.classList.remove('show');void encouragement.offsetWidth;encouragement.classList.add('show');setTimeout(()=>encouragement.classList.remove('show'),900)}
function burst(){for(let i=0;i<18;i++){const p=document.createElement('i');p.className='spark';p.textContent=['⭐','✨','💜','💚'][i%4];p.style.setProperty('--x',`${(Math.random()-.5)*520}px`);p.style.setProperty('--y',`${-100-Math.random()*330}px`);p.style.setProperty('--r',`${Math.random()*540-270}deg`);celebration.append(p);setTimeout(()=>p.remove(),1500)}}
function celebrate(){
  stars++;starCount.textContent=stars;starCount.parentElement.classList.remove('score-pop');void starCount.offsetWidth;starCount.parentElement.classList.add('score-pop');
  const praise=praises[praiseIndex++%praises.length];rewardTitle.textContent=praise[0];rewardText.textContent=praise[1];rewardIcon.textContent=praise[2];
  sound('good');setTimeout(applause,180);setTimeout(()=>speakPraise(`${praise[0]} ${praise[1]}`),380);celebration.classList.add('show');celebration.setAttribute('aria-hidden','false');burst();
  setTimeout(()=>{celebration.classList.remove('show');celebration.setAttribute('aria-hidden','true');newRound.classList.remove('hidden')},1900);
}
function openGame(game){currentGame=game;menu.classList.remove('active');play.classList.add('active');document.querySelector('#gameKicker').textContent=gameNames[game][0];document.querySelector('#gameTitle').textContent=gameNames[game][1];newRound.classList.add('hidden');sound('tap');buildGame();window.scrollTo({top:0,behavior:'smooth'})}
function buildGame(){area.innerHTML='';newRound.classList.add('hidden');({shapes:buildShapes,memory:buildMemory,counting:buildCounting,pattern:buildPattern}[currentGame])()}

function buildShapes(){
  instruction.textContent='Touche une forme, puis sa maison pareille!';const colors={circle:'#ff6b9d',square:'#62f2d1',triangle:'#ffd760',star:'#9c7bff'},kinds=Object.keys(colors),order=shuffle(kinds);
  area.innerHTML='<div class="shape-board"><div class="pieces"></div><div class="targets"></div></div>';const pieces=area.querySelector('.pieces'),targets=area.querySelector('.targets');let selected=null,matched=0;
  shuffle(kinds).forEach(kind=>{const b=document.createElement('button');b.className='shape';b.dataset.kind=kind;b.setAttribute('aria-label',kind);b.innerHTML=`<span style="background:${colors[kind]}"></span>`;b.onclick=()=>{sound('tap');pieces.querySelectorAll('.shape').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');selected=b};pieces.append(b)});
  order.forEach(kind=>{const b=document.createElement('button');b.className='shape target';b.dataset.kind=kind;b.setAttribute('aria-label',`Maison ${kind}`);b.innerHTML=`<span style="background:${colors[kind]};opacity:.25"></span>`;b.onclick=()=>{if(!selected)return;if(selected.dataset.kind===kind){b.classList.add('matched');selected.classList.add('done');selected=null;sound('match');cheer();if(++matched===kinds.length)setTimeout(celebrate,450)}else{sound('no');cheer('Essaie encore!');b.animate([{transform:'translateX(-7px)'},{transform:'translateX(7px)'},{transform:'none'}],{duration:300})}};targets.append(b)});
}
function buildMemory(){
  instruction.textContent='Trouve les deux images pareilles!';const icons=['🚀','🪐','👽','🌙','🛸','⭐'];let open=[],lock=false,pairs=0;const board=document.createElement('div');board.className='memory-board';area.append(board);
  shuffle([...icons,...icons]).forEach(icon=>{const b=document.createElement('button');b.className='memory-card';b.dataset.icon=icon;b.setAttribute('aria-label','Carte cachée');b.textContent=icon;b.onclick=()=>{if(lock||b.classList.contains('open')||b.classList.contains('matched'))return;b.classList.add('open');open.push(b);sound('flip');if(open.length===2){lock=true;if(open[0].dataset.icon===open[1].dataset.icon){open.forEach(x=>x.classList.add('matched'));open=[];lock=false;sound('match');cheer();if(++pairs===icons.length)setTimeout(celebrate,450)}else setTimeout(()=>{open.forEach(x=>x.classList.remove('open'));open=[];lock=false;sound('no');cheer('Presque! Essaie encore!')},700)}};board.append(b)});
}
function buildCounting(){
  instruction.textContent='Combien vois-tu d’étoiles?';const answer=1+Math.floor(Math.random()*7),cloud=document.createElement('div');cloud.className='count-stars';for(let i=0;i<answer;i++){const s=document.createElement('span');s.textContent='⭐';s.style.animationDelay=`${i*.06}s`;cloud.append(s)}
  const choices=new Set([answer]);while(choices.size<3)choices.add(1+Math.floor(Math.random()*7));const buttons=document.createElement('div');buttons.className='answers';shuffle([...choices]).forEach(n=>{const b=document.createElement('button');b.className='answer';b.textContent=n;b.onclick=()=>{if(n===answer){b.classList.add('right');buttons.querySelectorAll('button').forEach(x=>x.disabled=true);sound('match');cheer();setTimeout(celebrate,350)}else{sound('no');cheer('Compte encore une fois!');b.classList.add('wrong');setTimeout(()=>b.classList.remove('wrong'),400)}};buttons.append(b)});area.append(cloud,buttons);
}
function buildPattern(){
  instruction.textContent='Quelle image vient après?';const sets=[['🚀','🌙'],['👽','🛸'],['⭐','🪐'],['🌎','🌙','☀️']],base=sets[Math.floor(Math.random()*sets.length)],seq=[];for(let i=0;i<5;i++)seq.push(base[i%base.length]);const answer=base[5%base.length],row=document.createElement('div');row.className='pattern-row';seq.forEach(x=>{const s=document.createElement('span');s.className='pattern-item';s.textContent=x;row.append(s)});const q=document.createElement('span');q.className='pattern-question';q.textContent='?';row.append(q);
  const pool=new Set([answer]);['🚀','🌙','👽','🛸','⭐','🪐','🌎','☀️'].filter(x=>!base.includes(x)).sort(()=>Math.random()-.5).slice(0,2).forEach(x=>pool.add(x));const buttons=document.createElement('div');buttons.className='pattern-answers';shuffle([...pool]).forEach(x=>{const b=document.createElement('button');b.className='answer';b.textContent=x;b.onclick=()=>{if(x===answer){q.textContent=answer;b.classList.add('right');buttons.querySelectorAll('button').forEach(y=>y.disabled=true);sound('match');cheer();setTimeout(celebrate,350)}else{sound('no');cheer('Regarde bien la suite!');b.classList.add('wrong');setTimeout(()=>b.classList.remove('wrong'),400)}};buttons.append(b)});area.append(row,buttons);
}

document.querySelectorAll('[data-game]').forEach(button=>button.addEventListener('click',()=>openGame(button.dataset.game)));
document.querySelector('#backButton').onclick=()=>{sound('tap');play.classList.remove('active');menu.classList.add('active');area.innerHTML=''};
document.querySelector('#soundButton').onclick=e=>{soundOn=!soundOn;e.currentTarget.textContent=soundOn?'🔊':'🔇';e.currentTarget.setAttribute('aria-label',soundOn?'Désactiver les sons':'Activer les sons');if(soundOn){sound('match');cheer('Les sons sont activés!')}else if('speechSynthesis'in window)speechSynthesis.cancel()};
newRound.onclick=()=>{sound('tap');buildGame()};
