const menu=document.querySelector('#menu'),play=document.querySelector('#play'),area=document.querySelector('#gameArea');
const instruction=document.querySelector('#instruction'),newRound=document.querySelector('#newRound');
const starCount=document.querySelector('#starCount'),celebration=document.querySelector('#celebration');
const encouragement=document.querySelector('#encouragement'),rewardIcon=document.querySelector('#rewardIcon');
const rewardTitle=document.querySelector('#rewardTitle'),rewardText=document.querySelector('#rewardText');
const themeButton=document.querySelector('#themeButton'),languageButton=document.querySelector('#languageButton');
let stars=0,currentGame='',soundOn=true,audioContext,praiseIndex=0,theme='cosmos',language='fr',lastMemorySignature='',storyStep=0,storyRewarded=false;

const copy={
  fr:{home:'Accueil',welcomeKicker:'MISSION DES PETITS EXPLORATEURS',welcomeTitle:'Choisis un jeu!',welcomeText:'Sans pub. Sans achat. Joue autant que tu veux.',parent:'💜 Conçu pour les petites mains — aucun lien caché dans les jeux.',play:'Jouer',listen:'Écouter',again:'Encore! 🔄',themeCosmos:'Mode Cosmos',themeUnicorn:'Mode Licorne',soundOn:'Désactiver les sons',soundOff:'Activer les sons',
    cards:{shapes:['MISSION FORMES','Les formes','Trouve les paires'],memory:['MISSION MÉMOIRE','Mémoire spatiale','De nouvelles cartes chaque fois'],counting:['MISSION ÉTOILES','Compte les étoiles','Choisis le bon nombre'],pattern:['MISSION LOGIQUE','La suite magique','Quelle image vient après?'],story:['MISSION DODO','L’histoire du dodo','Écoute, choisis et continue l’aventure']},
    instructions:{shapes:'Touche une forme, puis sa maison pareille!',memory:'Trouve les deux images pareilles!',counting:'Combien vois-tu d’étoiles?',pattern:'Quelle image vient après?',story:'Écoute l’histoire et choisis pour continuer.'},
    retry:'Essaie encore!',almost:'Presque! Essaie encore!',countAgain:'Compte encore une fois!',lookAgain:'Regarde bien la suite!',soundsOn:'Les sons sont activés!',read:'🔊 Écouter',goodNight:'Bonne nuit, petit rêveur!',reread:'Relire l’histoire 🌙'},
  en:{home:'Home',welcomeKicker:'LITTLE EXPLORERS MISSION',welcomeTitle:'Choose a game!',welcomeText:'No ads. No purchases. Play as much as you like.',parent:'💜 Made for little hands — no hidden links inside the games.',play:'Play',listen:'Listen',again:'Again! 🔄',themeCosmos:'Cosmos Mode',themeUnicorn:'Unicorn Mode',soundOn:'Turn sounds off',soundOff:'Turn sounds on',
    cards:{shapes:['SHAPES MISSION','Shapes','Match every shape'],memory:['MEMORY MISSION','Magic Memory','New pictures every time'],counting:['COUNTING MISSION','Count the stars','Choose the right number'],pattern:['LOGIC MISSION','Magic Pattern','Which picture comes next?'],story:['BEDTIME MISSION','The bedtime story','Listen, choose and continue the adventure']},
    instructions:{shapes:'Touch a shape, then its matching home!',memory:'Find the two matching pictures!',counting:'How many stars can you see?',pattern:'Which picture comes next?',story:'Listen to the story and choose what happens next.'},
    retry:'Try again!',almost:'Almost! Try again!',countAgain:'Count one more time!',lookAgain:'Look carefully at the pattern!',soundsOn:'The sounds are on!',read:'🔊 Listen',goodNight:'Good night, little dreamer!',reread:'Read the story again 🌙'}
};
const themeData={
  cosmos:{brand:'Cosmo Kids',avatar:'👽',brandIcon:'🪐',icons:{shapes:'🔷',memory:'🚀',counting:'⭐',pattern:'🛸',story:'🌙'},countIcon:'⭐',memory:['🚀','🪐','👽','🌙','🛸','⭐','☄️','🌎','☀️','🔭','🛰️','🌌','🌠','🤖','🌈','💫'],patterns:[['🚀','🌙'],['👽','🛸'],['⭐','🪐'],['🌎','🌙','☀️'],['🤖','🚀','⭐']],storyImage:'assets/cosmo-kids/bedtime-cosmos-v1.png'},
  unicorn:{brand:'Licorne Kids',avatar:'🦄',brandIcon:'🌈',icons:{shapes:'💎',memory:'🦄',counting:'🌸',pattern:'🦋',story:'🌙'},countIcon:'🌸',memory:['🦄','🌈','🌸','🦋','👑','💖','✨','🌙','☁️','🍓','🧁','🎀','💎','🧚','🌺','⭐'],patterns:[['🦄','🌈'],['🌸','🦋'],['💖','✨'],['👑','💎','🎀'],['☁️','🌙','⭐']],storyImage:'assets/cosmo-kids/bedtime-unicorn-v1.png'}
};
const praiseSets={
  fr:[['Bravo!','Tu as réussi!','🌟'],['Super!','Quel beau travail!','🚀'],['Youpi!','Tu es fantastique!','🌈'],['Hourra!','Mission accomplie!','🪐'],['Yay!','Encore une victoire!','🎉'],['Magnifique!','Continue comme ça!','💫']],
  en:[['Bravo!','You did it!','🌟'],['Amazing!','Wonderful work!','🚀'],['Yay!','You are fantastic!','🌈'],['Hooray!','Mission complete!','🪐'],['Woohoo!','Another victory!','🎉'],['Wonderful!','Keep going!','💫']]
};
const encouragementSets={fr:['Oui, c’est ça!','Super choix!','Tu l’as trouvé!','Bravo, exploratrice!','Quelle championne!'],en:['Yes, that’s it!','Great choice!','You found it!','Well done, explorer!','You are a champion!']};
const shuffle=a=>[...a].sort(()=>Math.random()-.5);
const stories={
  cosmos:{
    fr:[
      {text:'La nuit est douce sur la petite lune. Lumi et Bibi suivent un sentier de lumière vers leur maison-fusée.',question:'Qui brille au-dessus du chemin?',choices:[['La petite étoile ⭐','La petite étoile bâille et éclaire doucement leurs pas.'],['La lune souriante 🌙','La lune sourit et dépose une lumière calme sur le chemin.']]},
      {text:'Dans le jardin lunaire, les fleurs ferment lentement leurs pétales. Bibi roule tout doucement pour ne pas les réveiller.',question:'De quelle couleur est la fleur la plus endormie?',choices:[['Violette 💜','La fleur violette fait un tout petit bâillement.'],['Bleue 💙','La fleur bleue se blottit sous une feuille.']]},
      {text:'Un petit nuage a peur d’être seul. Lumi lui tend la main et Bibi allume une veilleuse ronde.',question:'Que peuvent-ils dire au petit nuage?',choices:[['Bonne nuit 🌙','Le nuage se sent rassuré et ferme les yeux.'],['Nous sommes là 💛','Le nuage sourit. Il sait maintenant qu’il a des amis.']]},
      {text:'La porte de la maison-fusée s’ouvre. À l’intérieur, les couvertures sont chaudes et la petite étoile chante très bas.',question:'Que font Lumi et Bibi avant de dormir?',choices:[['Un gros câlin 🤗','Le câlin est doux comme un nuage.'],['Une grande respiration 🌬️','Ils inspirent doucement… puis soufflent lentement.']]}
    ],
    en:[
      {text:'The night is gentle on the little moon. Lumi and Bibi follow a glowing path toward their cozy rocket home.',question:'Who is shining above the path?',choices:[['The little star ⭐','The little star yawns and softly lights their steps.'],['The smiling moon 🌙','The moon smiles and lays calm light on the path.']]},
      {text:'In the moon garden, the flowers slowly close their petals. Bibi rolls very quietly so they can sleep.',question:'What color is the sleepiest flower?',choices:[['Purple 💜','The purple flower gives one tiny yawn.'],['Blue 💙','The blue flower snuggles beneath a leaf.']]},
      {text:'A small cloud is afraid to be alone. Lumi holds out a hand and Bibi turns on a round night-light.',question:'What can they say to the little cloud?',choices:[['Good night 🌙','The cloud feels safe and closes its eyes.'],['We are here 💛','The cloud smiles. Now it knows it has friends.']]},
      {text:'The rocket-home door opens. Inside, the blankets are warm and the little star sings very softly.',question:'What do Lumi and Bibi do before sleep?',choices:[['A big cuddle 🤗','The cuddle is as soft as a cloud.'],['One deep breath 🌬️','They breathe in gently… then breathe out slowly.']]}
    ],
    endings:{fr:'Lumi et Bibi se glissent sous leur couverture. La maison-fusée ferme ses petites lumières. Toute la lune se repose. Chut… bonne nuit.',en:'Lumi and Bibi snuggle under their blanket. The rocket home dims its little lights. The whole moon rests. Shhh… good night.'}
  },
  unicorn:{
    fr:[
      {text:'Plume la petite licorne et Lila la luciole suivent un arc-en-ciel endormi jusqu’au château des nuages.',question:'Comment avancent-elles sans réveiller les fleurs?',choices:[['Sur la pointe des sabots 🦄','Plume marche si doucement que les gouttes de rosée restent immobiles.'],['En volant tout bas 🪽','Lila montre un chemin léger juste au-dessus des pétales.']]},
      {text:'Une petite fleur rose bâille au bord du chemin. Ses pétales ont travaillé toute la journée.',question:'Que peut lui dire Plume?',choices:[['Bonne nuit, petite fleur 🌸','La fleur sourit et replie ses pétales.'],['Fais de beaux rêves ✨','La fleur imagine déjà un merveilleux rêve.']]},
      {text:'Un bébé nuage ne retrouve plus sa famille. Plume s’arrête et Lila fait briller sa lumière rose.',question:'Comment peuvent-elles aider le nuage?',choices:[['Suivre la luciole 💡','Le nuage suit la lumière de Lila et retrouve son chemin.'],['Tenir le sabot de Plume 💜','Le bébé nuage se sent courageux près de Plume.']]},
      {text:'Au château, un lit de nuages attend Plume. La lune souriante baisse la lumière du ciel.',question:'Que choisit Plume avant de dormir?',choices:[['Une petite histoire 📖','Lila raconte une histoire avec une voix toute douce.'],['Un câlin de nuage ☁️','Le nuage entoure Plume comme une couverture.']]}
    ],
    en:[
      {text:'Plume the little unicorn and Lila the firefly follow a sleepy rainbow toward the cloud castle.',question:'How do they move without waking the flowers?',choices:[['On tiptoe hooves 🦄','Plume walks so softly that the dew drops stay still.'],['Flying very low 🪽','Lila shows a light path just above the petals.']]},
      {text:'A small pink flower yawns beside the path. Its petals worked hard all day.',question:'What can Plume say to the flower?',choices:[['Good night, little flower 🌸','The flower smiles and folds up its petals.'],['Sweet dreams ✨','The flower is already imagining a wonderful dream.']]},
      {text:'A baby cloud cannot find its family. Plume stops and Lila makes her pink light glow.',question:'How can they help the cloud?',choices:[['Follow the firefly 💡','The cloud follows Lila’s light and finds the way home.'],['Hold Plume’s hoof 💜','The baby cloud feels brave beside Plume.']]},
      {text:'At the castle, a cloud bed is waiting for Plume. The smiling moon turns down the sky lights.',question:'What does Plume choose before sleep?',choices:[['A little story 📖','Lila tells a story in a very soft voice.'],['A cloud cuddle ☁️','The cloud wraps around Plume like a blanket.']]}
    ],
    endings:{fr:'Plume ferme les yeux. Lila devient une minuscule veilleuse rose. Le château flotte doucement sous la lune. Chut… bonne nuit.',en:'Plume closes her eyes. Lila becomes a tiny pink night-light. The castle floats gently beneath the moon. Shhh… good night.'}
  }
};

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
function speak(text,calm=false){if(!soundOn||!('speechSynthesis'in window))return;speechSynthesis.cancel();const voice=new SpeechSynthesisUtterance(text);voice.lang=language==='fr'?'fr-CA':'en-CA';voice.pitch=calm?1.08:1.35;voice.rate=calm?.78:.92;voice.volume=.86;speechSynthesis.speak(voice)}
function speakPraise(text){speak(text)}
function sound(type='good'){
  if(type==='tap'){tone(430,0,.07,.045,'sine',520);return}if(type==='flip'){tone(330,0,.08,.05,'triangle',520);return}
  if(type==='no'){tone(210,0,.13,.065,'triangle',155);tone(155,.12,.14,.05,'triangle',120);return}
  if(type==='match'){tone(520,0,.1,.065);tone(660,.09,.1,.07);tone(820,.18,.13,.075);return}
  tone(520,0,.12,.075);tone(660,.09,.12,.08);tone(880,.18,.2,.09);
}
function cheer(message){const options=encouragementSets[language];encouragement.textContent=message||options[Math.floor(Math.random()*options.length)];encouragement.classList.remove('show');void encouragement.offsetWidth;encouragement.classList.add('show');setTimeout(()=>encouragement.classList.remove('show'),900)}
function burst(){const icons=theme==='cosmos'?['⭐','✨','💜','💚']:['🌸','✨','💖','🌈'];for(let i=0;i<18;i++){const p=document.createElement('i');p.className='spark';p.textContent=icons[i%icons.length];p.style.setProperty('--x',`${(Math.random()-.5)*520}px`);p.style.setProperty('--y',`${-100-Math.random()*330}px`);p.style.setProperty('--r',`${Math.random()*540-270}deg`);celebration.append(p);setTimeout(()=>p.remove(),1500)}}
function celebrate(){
  stars++;starCount.textContent=stars;starCount.parentElement.classList.remove('score-pop');void starCount.offsetWidth;starCount.parentElement.classList.add('score-pop');
  const praises=praiseSets[language],praise=praises[praiseIndex++%praises.length];rewardTitle.textContent=praise[0];rewardText.textContent=praise[1];rewardIcon.textContent=praise[2];
  sound('good');setTimeout(applause,180);setTimeout(()=>speakPraise(`${praise[0]} ${praise[1]}`),380);celebration.classList.add('show');celebration.setAttribute('aria-hidden','false');burst();
  setTimeout(()=>{celebration.classList.remove('show');celebration.setAttribute('aria-hidden','true');newRound.classList.remove('hidden')},1900);
}
function labels(){return copy[language]}
function cardCopy(game){const base=[...labels().cards[game]];if(game==='memory')base[1]=theme==='cosmos'?(language==='fr'?'Mémoire spatiale':'Space Memory'):(language==='fr'?'Mémoire enchantée':'Enchanted Memory');if(game==='counting'){base[0]=language==='fr'?(theme==='cosmos'?'MISSION ÉTOILES':'MISSION FLEURS'):(theme==='cosmos'?'STAR MISSION':'FLOWER MISSION');base[1]=language==='fr'?(theme==='cosmos'?'Compte les étoiles':'Compte les fleurs'):(theme==='cosmos'?'Count the stars':'Count the flowers')}return base}
function refreshInterface(){
  const t=labels(),data=themeData[theme];document.body.dataset.theme=theme;document.documentElement.lang=language;document.querySelector('#homeLabel').textContent=t.home;document.querySelector('#welcomeKicker').textContent=t.welcomeKicker;document.querySelector('#welcomeTitle').textContent=t.welcomeTitle;document.querySelector('#welcomeText').textContent=t.welcomeText;document.querySelector('#parentNote').textContent=t.parent;document.querySelector('#brandIcon').textContent=data.brandIcon;document.querySelector('#brandName').textContent=data.brand;document.querySelector('#welcomeAvatar').textContent=data.avatar;document.querySelector('#themeIcon').textContent=theme==='cosmos'?'🦄':'🪐';document.querySelector('#themeLabel').textContent=theme==='cosmos'?t.themeUnicorn:t.themeCosmos;languageButton.textContent=language==='fr'?'EN':'FR';languageButton.setAttribute('aria-label',language==='fr'?'English':'Français');themeButton.setAttribute('aria-label',theme==='cosmos'?t.themeUnicorn:t.themeCosmos);
  document.querySelectorAll('[data-game]').forEach(button=>{const game=button.dataset.game,c=cardCopy(game);button.querySelector('.game-icon').textContent=data.icons[game];button.querySelector('b').textContent=c[1];button.querySelector('small').textContent=c[2];button.querySelector('em').textContent=game==='story'?t.listen:t.play});const orbit=theme==='cosmos'?['⭐','🚀','🌈','🪐']:['🌸','🦄','🌈','🦋'];document.querySelectorAll('.celebration-orbit i').forEach((item,i)=>item.textContent=orbit[i]);document.querySelector('.reward em').textContent=data.avatar;newRound.textContent=currentGame==='story'?t.reread:t.again;document.querySelector('#soundButton').setAttribute('aria-label',soundOn?t.soundOn:t.soundOff);
  if(currentGame){const c=cardCopy(currentGame);document.querySelector('#gameKicker').textContent=c[0];document.querySelector('#gameTitle').textContent=c[1]}
}
function openGame(game){currentGame=game;menu.classList.remove('active');play.classList.add('active');const c=cardCopy(game);document.querySelector('#gameKicker').textContent=c[0];document.querySelector('#gameTitle').textContent=c[1];newRound.classList.add('hidden');sound('tap');buildGame();window.scrollTo({top:0,behavior:'smooth'})}
function buildGame(){area.innerHTML='';newRound.classList.add('hidden');newRound.textContent=currentGame==='story'?labels().reread:labels().again;({shapes:buildShapes,memory:buildMemory,counting:buildCounting,pattern:buildPattern,story:buildStory}[currentGame])()}

function buildShapes(){
  instruction.textContent=labels().instructions.shapes;const colors={circle:'#ff6b9d',square:'#62f2d1',triangle:'#ffd760',star:'#9c7bff'},kinds=Object.keys(colors),order=shuffle(kinds);
  area.innerHTML='<div class="shape-board"><div class="pieces"></div><div class="targets"></div></div>';const pieces=area.querySelector('.pieces'),targets=area.querySelector('.targets');let selected=null,matched=0;
  shuffle(kinds).forEach(kind=>{const b=document.createElement('button');b.className='shape';b.dataset.kind=kind;b.setAttribute('aria-label',kind);b.innerHTML=`<span style="background:${colors[kind]}"></span>`;b.onclick=()=>{sound('tap');pieces.querySelectorAll('.shape').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');selected=b};pieces.append(b)});
  order.forEach(kind=>{const b=document.createElement('button');b.className='shape target';b.dataset.kind=kind;b.setAttribute('aria-label',`${language==='fr'?'Maison':'Home'} ${kind}`);b.innerHTML=`<span style="background:${colors[kind]};opacity:.25"></span>`;b.onclick=()=>{if(!selected)return;if(selected.dataset.kind===kind){b.classList.add('matched');selected.classList.add('done');selected=null;sound('match');cheer();if(++matched===kinds.length)setTimeout(celebrate,450)}else{sound('no');cheer(labels().retry);b.animate([{transform:'translateX(-7px)'},{transform:'translateX(7px)'},{transform:'none'}],{duration:300})}};targets.append(b)});
}
function buildMemory(){
  instruction.textContent=labels().instructions.memory;let icons,signature,attempts=0;do{icons=shuffle(themeData[theme].memory).slice(0,6);signature=[...icons].sort().join('')}while(signature===lastMemorySignature&&attempts++<8);lastMemorySignature=signature;let open=[],lock=false,pairs=0;const board=document.createElement('div');board.className='memory-board';area.append(board);
  shuffle([...icons,...icons]).forEach(icon=>{const b=document.createElement('button');b.className='memory-card';b.dataset.icon=icon;b.setAttribute('aria-label',language==='fr'?'Carte cachée':'Hidden card');b.textContent=icon;b.onclick=()=>{if(lock||b.classList.contains('open')||b.classList.contains('matched'))return;b.classList.add('open');open.push(b);sound('flip');if(open.length===2){lock=true;if(open[0].dataset.icon===open[1].dataset.icon){open.forEach(x=>x.classList.add('matched'));open=[];lock=false;sound('match');cheer();if(++pairs===icons.length)setTimeout(celebrate,450)}else setTimeout(()=>{open.forEach(x=>x.classList.remove('open'));open=[];lock=false;sound('no');cheer(labels().almost)},700)}};board.append(b)});
}
function buildCounting(){
  instruction.textContent=theme==='cosmos'?labels().instructions.counting:(language==='fr'?'Combien vois-tu de fleurs?':'How many flowers can you see?');const answer=1+Math.floor(Math.random()*7),cloud=document.createElement('div');cloud.className='count-stars';for(let i=0;i<answer;i++){const s=document.createElement('span');s.textContent=themeData[theme].countIcon;s.style.animationDelay=`${i*.06}s`;cloud.append(s)}
  const choices=new Set([answer]);while(choices.size<3)choices.add(1+Math.floor(Math.random()*7));const buttons=document.createElement('div');buttons.className='answers';shuffle([...choices]).forEach(n=>{const b=document.createElement('button');b.className='answer';b.textContent=n;b.onclick=()=>{if(n===answer){b.classList.add('right');buttons.querySelectorAll('button').forEach(x=>x.disabled=true);sound('match');cheer();setTimeout(celebrate,350)}else{sound('no');cheer(labels().countAgain);b.classList.add('wrong');setTimeout(()=>b.classList.remove('wrong'),400)}};buttons.append(b)});area.append(cloud,buttons);
}
function buildPattern(){
  instruction.textContent=labels().instructions.pattern;const sets=themeData[theme].patterns,base=sets[Math.floor(Math.random()*sets.length)],seq=[];for(let i=0;i<5;i++)seq.push(base[i%base.length]);const answer=base[5%base.length],row=document.createElement('div');row.className='pattern-row';seq.forEach(x=>{const s=document.createElement('span');s.className='pattern-item';s.textContent=x;row.append(s)});const q=document.createElement('span');q.className='pattern-question';q.textContent='?';row.append(q);
  const pool=new Set([answer]);themeData[theme].memory.filter(x=>!base.includes(x)).sort(()=>Math.random()-.5).slice(0,2).forEach(x=>pool.add(x));const buttons=document.createElement('div');buttons.className='pattern-answers';shuffle([...pool]).forEach(x=>{const b=document.createElement('button');b.className='answer';b.textContent=x;b.onclick=()=>{if(x===answer){q.textContent=answer;b.classList.add('right');buttons.querySelectorAll('button').forEach(y=>y.disabled=true);sound('match');cheer();setTimeout(celebrate,350)}else{sound('no');cheer(labels().lookAgain);b.classList.add('wrong');setTimeout(()=>b.classList.remove('wrong'),400)}};buttons.append(b)});area.append(row,buttons);
}

function buildStory(){storyStep=0;storyRewarded=false;instruction.textContent=labels().instructions.story;renderStory()}
function rewardStory(ending){
  if(storyRewarded)return;storyRewarded=true;stars++;starCount.textContent=stars;starCount.parentElement.classList.remove('score-pop');void starCount.offsetWidth;starCount.parentElement.classList.add('score-pop');tone(392,0,.35,.035,'sine',523);tone(523,.28,.5,.03,'sine',659);setTimeout(()=>speak(ending,true),250);newRound.textContent=labels().reread;newRound.classList.remove('hidden');
}
function renderStory(){
  clearTimeout(renderStory.advance);clearTimeout(renderStory.voice);instruction.textContent=labels().instructions.story;const story=stories[theme],pages=story[language],image=themeData[theme].storyImage;area.innerHTML='';const book=document.createElement('div');book.className='story-book';const pictureWrap=document.createElement('div');pictureWrap.className='story-picture-wrap';const picture=document.createElement('img');picture.className='story-picture';picture.src=image;picture.alt=theme==='cosmos'?(language==='fr'?'Lumi et Bibi dans un jardin lunaire':'Lumi and Bibi in a moon garden'):(language==='fr'?'Plume et Lila sur le chemin arc-en-ciel':'Plume and Lila on the rainbow path');const progress=document.createElement('div');progress.className='story-progress';progress.textContent=pages.map((_,i)=>i<storyStep?'●':i===storyStep?'◉':'○').join(' ');pictureWrap.append(picture,progress);const page=document.createElement('div');page.className='story-page';book.append(pictureWrap,page);area.append(book);
  if(storyStep>=pages.length){const ending=story.endings[language];progress.textContent='● ● ● ●';page.innerHTML=`<div class="story-ending"><span>${theme==='cosmos'?'🌙':'🦄'}</span><h3>${labels().goodNight}</h3><p></p><em class="story-rest">${theme==='cosmos'?'✨ 💤 🪐':'🌙 💤 🌈'}</em></div>`;page.querySelector('p').textContent=ending;instruction.textContent=labels().goodNight;rewardStory(ending);return}
  const chapter=pages[storyStep],listen=document.createElement('button');listen.className='story-listen';listen.type='button';listen.textContent=labels().read;listen.onclick=()=>speak(chapter.text,true);const text=document.createElement('p');text.className='story-text';text.textContent=chapter.text;const question=document.createElement('div');question.className='story-question';const prompt=document.createElement('b');prompt.textContent=chapter.question;const choices=document.createElement('div');choices.className='story-choices';chapter.choices.forEach(([choice,response])=>{const button=document.createElement('button');button.className='story-choice';button.textContent=choice;button.onclick=()=>{choices.querySelectorAll('button').forEach(x=>x.disabled=true);sound('match');const answer=document.createElement('p');answer.className='story-response';answer.textContent=response;question.append(answer);speak(response,true);renderStory.advance=setTimeout(()=>{storyStep++;renderStory()},2400)};choices.append(button)});question.append(prompt,choices);page.append(listen,text,question);renderStory.voice=setTimeout(()=>speak(chapter.text,true),350);
}

document.querySelectorAll('[data-game]').forEach(button=>button.addEventListener('click',()=>openGame(button.dataset.game)));
document.querySelector('#backButton').onclick=()=>{sound('tap');clearTimeout(renderStory.advance);clearTimeout(renderStory.voice);if('speechSynthesis'in window)speechSynthesis.cancel();play.classList.remove('active');menu.classList.add('active');area.innerHTML='';currentGame='';refreshInterface()};
document.querySelector('#soundButton').onclick=e=>{soundOn=!soundOn;e.currentTarget.textContent=soundOn?'🔊':'🔇';e.currentTarget.setAttribute('aria-label',soundOn?labels().soundOn:labels().soundOff);if(soundOn){sound('match');cheer(labels().soundsOn)}else if('speechSynthesis'in window)speechSynthesis.cancel()};
themeButton.onclick=()=>{theme=theme==='cosmos'?'unicorn':'cosmos';sound('tap');refreshInterface();if(play.classList.contains('active'))buildGame()};
languageButton.onclick=()=>{language=language==='fr'?'en':'fr';sound('tap');refreshInterface();if(play.classList.contains('active')){if(currentGame==='story')renderStory();else buildGame()}};
newRound.onclick=()=>{sound('tap');buildGame()};
refreshInterface();
