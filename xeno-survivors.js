(() => {
  'use strict';

  const $ = selector => document.querySelector(selector);
  const canvas = $('#game');
  const ctx = canvas.getContext('2d');
  const params = new URLSearchParams(location.search);
  const language = localStorage.getItem('siteLang') === 'en' ? 'en' : 'fr';
  document.documentElement.lang = language;
  document.querySelectorAll('[data-fr][data-en]').forEach(node => { node.textContent = node.dataset[language]; });

  const RUN_TIME = 480;
  const WORLD = 2600;
  const difficulties = {
    cadet:{fr:'CADET',en:'CADET',noteFr:'Résistant et généreux',noteEn:'Tough and generous',hp:1,damage:.72,speed:.9,spawn:1.08,score:1},
    sentinel:{fr:'SENTINELLE',en:'SENTINEL',noteFr:'La mission normale',noteEn:'The normal mission',hp:1.2,damage:1,speed:1,spawn:.9,score:1.35},
    overmind:{fr:'OVERMIND',en:'OVERMIND',noteFr:'Essaim brutal',noteEn:'Brutal swarm',hp:1.55,damage:1.32,speed:1.08,spawn:.72,score:1.8}
  };
  let difficultyKey = difficulties[params.get('difficulty')] ? params.get('difficulty') : 'cadet';
  let config = difficulties[difficultyKey];
  let width = innerWidth, height = innerHeight, dpr = 1;
  let playing = false, paused = false, choosing = false, ended = false;
  let elapsed = 0, kills = 0, score = 0, level = 1, xp = 0, xpNeed = 10, spawnClock = 0, hudClock = 0;
  let lastTime = performance.now(), shake = 0, soundOn = localStorage.getItem('xenoSurvivorsSound') !== 'off';
  let enemies = [], shots = [], hostileShots = [], drops = [], particles = [], rings = [];
  let boss = null, bossStages = new Set(), finalBossDefeated = false, announcementTimer = 0;
  let audioContext = null;
  const keys = new Set();
  const touch = {active:false,id:null,startX:0,startY:0,x:0,y:0};
  const joystick = $('#joystick');
  const player = {
    x:0,y:0,r:21,maxHp:100,hp:100,speed:190,damage:18,fireRate:.56,shotSpeed:610,shotSize:7,
    projectiles:1,pierce:0,magnet:110,armour:0,regen:0,invulnerable:0,fireClock:0,
    sporeLevel:0,sporeClock:3.5,orbitLevel:0,novaLevel:0,novaClock:6
  };
  const decor = [];
  const weapons = [
    {key:'plasma',icon:'✦'}, {key:'spore',icon:'☄'}, {key:'orbit',icon:'◉'}, {key:'nova',icon:'✺'}
  ];
  const enemyTypes = {
    jet:{r:18,hp:25,speed:136,damage:9,xp:3,color:'#ff647d',aircraft:true},
    apc:{r:20,hp:64,speed:66,damage:14,xp:4,color:'#ffb950'},
    tank:{r:28,hp:112,speed:43,damage:20,xp:6,color:'#a77cff'},
    helicopter:{r:22,hp:54,speed:76,damage:10,xp:4,color:'#54e7ff',ranged:true,aircraft:true}
  };
  const bossData = [
    {name:'DOMINION WARDEN',r:44,hp:650,speed:48,color:'#ff6d86'},
    {name:'NULL HARVESTER',r:50,hp:1050,speed:54,color:'#ad70ff'},
    {name:'SOLAR EXECUTOR',r:56,hp:1550,speed:58,color:'#ffb950'},
    {name:'THE HIVE BREAKER',r:68,hp:2600,speed:62,color:'#ff4c76'}
  ];

  const upgrades = [
    {id:'damage',icon:'✦',color:'#72ffe2',fr:'PLASMA DENSE',en:'DENSE PLASMA',descFr:'+30% de dégâts de plasma.',descEn:'+30% plasma damage.',max:7,apply:()=>player.damage*=1.3},
    {id:'rate',icon:'ϟ',color:'#caff69',fr:'NERFS SYNAPTIQUES',en:'SYNAPTIC NERVES',descFr:'Attaques automatiques 18% plus rapides.',descEn:'Automatic attacks fire 18% faster.',max:6,apply:()=>player.fireRate*=.82},
    {id:'multi',icon:'⋰',color:'#ffcf62',fr:'DIVISION CELLULAIRE',en:'CELL DIVISION',descFr:'Ajoute un projectile à chaque salve.',descEn:'Adds one projectile to every volley.',max:4,apply:()=>player.projectiles++},
    {id:'pierce',icon:'➳',color:'#ff7faa',fr:'MEMBRANE PERÇANTE',en:'PIERCING MEMBRANE',descFr:'Le plasma traverse un ennemi supplémentaire.',descEn:'Plasma passes through one extra enemy.',max:4,apply:()=>player.pierce++},
    {id:'vitality',icon:'♥',color:'#67ffad',fr:'CŒUR GÉMINÉ',en:'TWIN HEART',descFr:'+25 bio-vie maximale et guérison complète.',descEn:'+25 maximum bio-life and a full heal.',max:5,apply:()=>{player.maxHp+=25;player.hp=player.maxHp}},
    {id:'speed',icon:'»',color:'#65cfff',fr:'PATTES VECTORIELLES',en:'VECTOR LEGS',descFr:'+12% de vitesse de déplacement.',descEn:'+12% movement speed.',max:5,apply:()=>player.speed*=1.12},
    {id:'armour',icon:'⬡',color:'#8fa7ff',fr:'CARAPACE MIROIR',en:'MIRROR CARAPACE',descFr:'Réduit les dégâts reçus de 8%.',descEn:'Reduces incoming damage by 8%.',max:5,apply:()=>player.armour=Math.min(.45,player.armour+.08)},
    {id:'magnet',icon:'⌁',color:'#f0a8ff',fr:'ATTRACTION PSIONIQUE',en:'PSIONIC PULL',descFr:'Attire l’énergie de 45% plus loin.',descEn:'Pulls energy from 45% farther away.',max:4,apply:()=>player.magnet*=1.45},
    {id:'regen',icon:'✚',color:'#74ff8e',fr:'SÈVE RÉGÉNÉRANTE',en:'REGENERATIVE SAP',descFr:'Régénère 1.5 bio-vie par seconde.',descEn:'Regenerates 1.5 bio-life per second.',max:4,apply:()=>player.regen+=1.5},
    {id:'spore',icon:'☄',color:'#d1ff69',fr:'NUAGE DE SPORES',en:'SPORE CLOUD',descFr:'Une explosion biologique frappe les ennemis proches.',descEn:'A biological blast strikes nearby enemies.',max:6,apply:()=>player.sporeLevel++},
    {id:'orbit',icon:'◉',color:'#62eaff',fr:'LUNES VIVANTES',en:'LIVING MOONS',descFr:'Des organismes orbitaux protègent le héros.',descEn:'Orbiting organisms protect the hero.',max:5,apply:()=>player.orbitLevel++},
    {id:'nova',icon:'✺',color:'#ff79d1',fr:'NOVA PSIONIQUE',en:'PSIONIC NOVA',descFr:'Libère périodiquement une onde qui repousse l’essaim.',descEn:'Periodically releases a wave that pushes the swarm.',max:5,apply:()=>player.novaLevel++}
  ];
  const upgradeLevels = Object.fromEntries(upgrades.map(item => [item.id,0]));

  function resize(){
    width = innerWidth; height = innerHeight; dpr = Math.min(2,devicePixelRatio || 1);
    canvas.width = Math.round(width*dpr); canvas.height = Math.round(height*dpr);
    canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  addEventListener('resize',resize); resize();

  function seedDecor(){
    let seed = 918273;
    const random = () => { seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; };
    decor.length=0;
    for(let i=0;i<240;i++)decor.push({x:(random()-.5)*WORLD,y:(random()-.5)*WORLD,size:12+random()*38,type:Math.floor(random()*4),phase:random()*6.28});
  }
  seedDecor();

  function renderDifficulties(){
    const box=$('#difficulty'); box.replaceChildren();
    Object.entries(difficulties).forEach(([key,item])=>{
      const button=document.createElement('button'); button.type='button'; button.classList.toggle('selected',key===difficultyKey);
      button.innerHTML=`${item[language]}<small>${language==='fr'?item.noteFr:item.noteEn}</small>`;
      button.onclick=()=>{difficultyKey=key;config=item;renderDifficulties();tone(540,.06,'sine',.05)};
      box.append(button);
    });
  }
  renderDifficulties();

  function resetPlayer(){
    Object.assign(player,{x:0,y:0,maxHp:100,hp:100,speed:190,damage:18,fireRate:.56,shotSpeed:610,shotSize:7,projectiles:1,pierce:0,magnet:110,armour:0,regen:0,invulnerable:0,fireClock:0,sporeLevel:0,sporeClock:3.5,orbitLevel:0,novaLevel:0,novaClock:6});
    Object.keys(upgradeLevels).forEach(key=>upgradeLevels[key]=0);
  }

  function startRun(){
    config=difficulties[difficultyKey]; resetPlayer();
    enemies=[];shots=[];hostileShots=[];drops=[];particles=[];rings=[];boss=null;bossStages.clear();finalBossDefeated=false;
    elapsed=0;kills=0;score=0;level=1;xp=0;xpNeed=10;spawnClock=.5;hudClock=0;ended=false;paused=false;choosing=false;playing=true;
    $('#launch').classList.remove('show');$('#result').classList.remove('show');$('#pauseScreen').classList.remove('show');
    announce(language==='fr'?'LA RUCHE S’ÉVEILLE':'THE HIVE AWAKENS'); updateHud(true); lastTime=performance.now();
    tone(220,.18,'sawtooth',.06);tone(440,.24,'sine',.04);
  }

  function tone(frequency,duration=.05,type='sine',volume=.035){
    if(!soundOn)return;
    try{
      audioContext ||= new(window.AudioContext||window.webkitAudioContext)();
      if(audioContext.state==='suspended')audioContext.resume();
      const oscillator=audioContext.createOscillator(),gain=audioContext.createGain(),now=audioContext.currentTime;
      oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,now);gain.gain.setValueAtTime(volume,now);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
      oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.start(now);oscillator.stop(now+duration);
    }catch{}
  }

  function spawnEnemy(forcedType){
    if(enemies.length>190)return;
    const progress=elapsed/RUN_TIME;
    let type=forcedType;
    if(!type){const roll=Math.random();type=roll<.08+progress*.14?'helicopter':roll<.23+progress*.2?'tank':roll<.64?'apc':'jet'}
    const base=enemyTypes[type],angle=Math.random()*Math.PI*2,distance=Math.max(width,height)*.67+130+Math.random()*110;
    const maxHp=base.hp*config.hp*(1+progress*.75);
    enemies.push({type,x:player.x+Math.cos(angle)*distance,y:player.y+Math.sin(angle)*distance,r:base.r,hp:maxHp,maxHp,speed:base.speed*config.speed*(.94+Math.random()*.13),damage:base.damage*config.damage,xp:base.xp,color:base.color,ranged:base.ranged,aircraft:base.aircraft,attack:Math.random(),shoot:1+Math.random(),boss:false,dead:false,phase:Math.random()*6.28,lastOrbit:-1,bank:Math.random()<.5?-1:1});
  }

  function spawnBoss(stage){
    const data=bossData[stage],angle=Math.random()*Math.PI*2,distance=Math.max(width,height)*.55+180;
    const maxHp=data.hp*config.hp;
    boss={type:'boss',name:data.name,x:player.x+Math.cos(angle)*distance,y:player.y+Math.sin(angle)*distance,r:data.r,hp:maxHp,maxHp,speed:data.speed*config.speed,damage:(18+stage*5)*config.damage,xp:24+stage*10,color:data.color,attack:1,shoot:1.3,boss:true,stage,dead:false,phase:0,lastOrbit:-1};
    enemies.push(boss); announce(`${language==='fr'?'BOSS DÉTECTÉ':'BOSS DETECTED'} · ${data.name}`); updateBoss(); tone(92,.6,'sawtooth',.08);
  }

  function update(dt){
    elapsed=Math.min(RUN_TIME,elapsed+dt); player.invulnerable=Math.max(0,player.invulnerable-dt);
    if(player.regen)player.hp=Math.min(player.maxHp,player.hp+player.regen*dt);
    const input=movementVector();
    player.x=Math.max(-WORLD/2,Math.min(WORLD/2,player.x+input.x*player.speed*dt));
    player.y=Math.max(-WORLD/2,Math.min(WORLD/2,player.y+input.y*player.speed*dt));

    const bossTimes=[90,210,330,450];
    bossTimes.forEach((time,index)=>{if(elapsed>=time&&!bossStages.has(index)){bossStages.add(index);spawnBoss(index)}});
    if(elapsed<RUN_TIME){
      spawnClock-=dt;
      if(spawnClock<=0){
        const count=1+Math.floor(elapsed/120)+(Math.random()<elapsed/RUN_TIME*.55?1:0);
        for(let i=0;i<count;i++)spawnEnemy();
        spawnClock=config.spawn*Math.max(.3,1-elapsed/RUN_TIME*.58);
      }
    }
    updateWeapons(dt); updateEnemies(dt); updateShots(dt); updateDrops(dt); updateParticles(dt);
    if(elapsed>=RUN_TIME&&finalBossDefeated&&!ended)finish(true);
    if(!ended&&player.hp<=0)finish(false);
    hudClock-=dt;if(hudClock<=0){updateHud();hudClock=.12}
  }

  function movementVector(){
    let x=(keys.has('arrowright')||keys.has('d')?1:0)-(keys.has('arrowleft')||keys.has('a')?1:0);
    let y=(keys.has('arrowdown')||keys.has('s')?1:0)-(keys.has('arrowup')||keys.has('w')?1:0);
    if(touch.active){x=touch.x;y=touch.y}
    const length=Math.hypot(x,y)||1;return{x:x/length,y:y/length};
  }

  function updateWeapons(dt){
    player.fireClock-=dt;
    if(player.fireClock<=0&&enemies.length){
      const target=nearestEnemy(760);
      if(target){
        const angle=Math.atan2(target.y-player.y,target.x-player.x),spread=.13;
        for(let i=0;i<player.projectiles;i++){
          const offset=(i-(player.projectiles-1)/2)*spread,a=angle+offset;
          shots.push({x:player.x,y:player.y,vx:Math.cos(a)*player.shotSpeed,vy:Math.sin(a)*player.shotSpeed,r:player.shotSize,damage:player.damage,pierce:player.pierce,life:1.6,color:'#73ffe6'});
        }
        player.fireClock=player.fireRate;tone(620,.035,'triangle',.018);
      }
    }
    if(player.sporeLevel){
      player.sporeClock-=dt;
      if(player.sporeClock<=0){
        const radius=145+player.sporeLevel*22,damage=18+player.sporeLevel*11;
        rings.push({x:player.x,y:player.y,r:5,max:radius,life:.55,color:'#caff69'});
        enemies.forEach(enemy=>{if(!enemy.dead&&distance(enemy,player)<radius+enemy.r)hitEnemy(enemy,damage)});
        player.sporeClock=Math.max(2.2,5-player.sporeLevel*.42);tone(180,.23,'sine',.045);
      }
    }
    if(player.novaLevel){
      player.novaClock-=dt;
      if(player.novaClock<=0){
        const radius=230+player.novaLevel*28,damage=12+player.novaLevel*8;
        rings.push({x:player.x,y:player.y,r:8,max:radius,life:.8,color:'#ff78d4'});
        enemies.forEach(enemy=>{const d=distance(enemy,player);if(!enemy.dead&&d<radius){hitEnemy(enemy,damage);const force=(radius-d)*.48,a=Math.atan2(enemy.y-player.y,enemy.x-player.x);enemy.x+=Math.cos(a)*force;enemy.y+=Math.sin(a)*force}});
        hostileShots=hostileShots.filter(shot=>distance(shot,player)>radius);player.novaClock=Math.max(4.2,8-player.novaLevel*.6);shake=Math.max(shake,7);tone(95,.4,'sawtooth',.045);
      }
    }
  }

  function orbitPositions(){
    const count=player.orbitLevel?1+Math.floor((player.orbitLevel-1)/2):0,radius=62+player.orbitLevel*6,now=elapsed*2.2;
    return Array.from({length:count},(_,i)=>({x:player.x+Math.cos(now+i*Math.PI*2/count)*radius,y:player.y+Math.sin(now+i*Math.PI*2/count)*radius,r:10+player.orbitLevel}));
  }

  function updateEnemies(dt){
    const orbits=orbitPositions();
    enemies.forEach(enemy=>{
      if(enemy.dead)return;
      const dx=player.x-enemy.x,dy=player.y-enemy.y,d=Math.hypot(dx,dy)||1,nx=dx/d,ny=dy/d;
      let pace=1;
      if(enemy.ranged&&d<330)pace=d<205?-.42:.12;
      if(enemy.type==='jet'){
        const strafe=Math.sin(enemy.phase*1.8)*enemy.bank;
        enemy.x+=-ny*enemy.speed*.3*strafe*dt;enemy.y+=nx*enemy.speed*.3*strafe*dt;
        pace=d<105?1.45:1.08;
      }
      if(enemy.type==='tank')pace=.92;
      if(enemy.boss&&d<enemy.r+player.r+25)pace=.35;
      enemy.x+=nx*enemy.speed*pace*dt;enemy.y+=ny*enemy.speed*pace*dt;enemy.phase+=dt*3;
      enemy.attack-=dt;
      if(d<enemy.r+player.r+3&&enemy.attack<=0){hurtPlayer(enemy.damage);enemy.attack=enemy.boss?.65:.9}
      enemy.shoot-=dt;
      if((enemy.ranged||enemy.boss)&&d<620&&enemy.shoot<=0){
        const count=enemy.boss?5+enemy.stage:1;
        for(let i=0;i<count;i++){
          const a=Math.atan2(dy,dx)+(i-(count-1)/2)*(enemy.boss?.17:0);
          hostileShots.push({x:enemy.x,y:enemy.y,vx:Math.cos(a)*(enemy.boss?190:155),vy:Math.sin(a)*(enemy.boss?190:155),r:enemy.boss?7:5,damage:enemy.damage*(enemy.boss?.55:.7),life:4,color:enemy.color});
        }
        enemy.shoot=enemy.boss?Math.max(.8,1.8-enemy.stage*.18):2.2+Math.random();
      }
      orbits.forEach((orb,index)=>{if(distance(enemy,orb)<enemy.r+orb.r&&enemy.lastOrbit!==Math.floor(elapsed*4)*10+index){enemy.lastOrbit=Math.floor(elapsed*4)*10+index;hitEnemy(enemy,10+player.orbitLevel*8)}});
    });
    enemies=enemies.filter(enemy=>!enemy.dead&&distance(enemy,player)<Math.max(width,height)*1.7+600);
  }

  function updateShots(dt){
    shots.forEach(shot=>{
      shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;shot.life-=dt;
      for(const enemy of enemies){
        if(enemy.dead||shot.hit?.has(enemy))continue;
        if(distance(shot,enemy)<shot.r+enemy.r){
          shot.hit ||= new Set();shot.hit.add(enemy);hitEnemy(enemy,shot.damage);spawnParticles(shot.x,shot.y,enemy.color,5);
          if(shot.pierce--<=0){shot.life=0;break}
        }
      }
    });
    shots=shots.filter(shot=>shot.life>0);
    hostileShots.forEach(shot=>{shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;shot.life-=dt;if(distance(shot,player)<shot.r+player.r){hurtPlayer(shot.damage);shot.life=0}});
    hostileShots=hostileShots.filter(shot=>shot.life>0&&distance(shot,player)<1000);
  }

  function updateDrops(dt){
    drops.forEach(drop=>{
      drop.phase+=dt*4;const d=distance(drop,player);
      if(d<player.magnet){const speed=150+(player.magnet-d)*4,a=Math.atan2(player.y-drop.y,player.x-drop.x);drop.x+=Math.cos(a)*speed*dt;drop.y+=Math.sin(a)*speed*dt}
      if(d<player.r+12){
        drop.dead=true;
        if(drop.type==='heal')player.hp=Math.min(player.maxHp,player.hp+18);
        else gainXp(drop.value);
      }
    });
    drops=drops.filter(drop=>!drop.dead&&distance(drop,player)<1100);
  }

  function updateParticles(dt){
    particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.97;p.vy*=.97;p.life-=dt});particles=particles.filter(p=>p.life>0);
    rings.forEach(r=>{r.life-=dt;r.r+=(r.max-r.r)*Math.min(1,dt*8)});rings=rings.filter(r=>r.life>0);
  }

  function hitEnemy(enemy,damage){
    if(enemy.dead)return;enemy.hp-=damage;score+=Math.round(damage);
    if(enemy.hp<=0)killEnemy(enemy);if(enemy===boss)updateBoss();
  }

  function killEnemy(enemy){
    enemy.dead=true;kills++;score+=enemy.boss?2500*(enemy.stage+1):100;
    drops.push({x:enemy.x,y:enemy.y,r:7,type:'xp',value:enemy.xp,phase:Math.random()*6.28,dead:false});
    if(Math.random()<.035)drops.push({x:enemy.x+8,y:enemy.y-6,r:8,type:'heal',value:0,phase:0,dead:false});
    spawnParticles(enemy.x,enemy.y,enemy.color,enemy.boss?36:11);shake=Math.max(shake,enemy.boss?12:2);
    if(enemy.boss){
      announce(`${enemy.name} · ${language==='fr'?'ÉLIMINÉ':'ELIMINATED'}`);tone(110,.6,'sawtooth',.07);boss=null;$('#bossPanel').hidden=true;
      if(enemy.stage===3)finalBossDefeated=true;
    }
  }

  function hurtPlayer(amount){
    if(player.invulnerable>0||ended)return;
    const damage=Math.max(1,amount*(1-player.armour));player.hp-=damage;player.invulnerable=.42;shake=Math.max(shake,8);
    spawnParticles(player.x,player.y,'#8affd8',9);tone(76,.15,'square',.055);
  }

  function gainXp(amount){
    xp+=amount;tone(920,.025,'sine',.012);
    if(xp>=xpNeed&&!choosing){xp-=xpNeed;level++;xpNeed=Math.round(10+level*7.5);openUpgrade()}
  }

  function openUpgrade(){
    choosing=true;const available=upgrades.filter(item=>upgradeLevels[item.id]<item.max),choices=[];
    while(choices.length<Math.min(3,available.length)){const item=available[Math.floor(Math.random()*available.length)];if(!choices.includes(item))choices.push(item)}
    const box=$('#upgradeChoices');box.replaceChildren();
    choices.forEach(item=>{
      const button=document.createElement('button');button.type='button';button.className='upgrade-card';button.style.setProperty('--power',item.color);
      button.innerHTML=`<span class="upgrade-icon">${item.icon}</span><small>${language==='fr'?'ÉVOLUTION':'EVOLUTION'} ${upgradeLevels[item.id]+1} / ${item.max}</small><strong>${language==='fr'?item.fr:item.en}</strong><p>${language==='fr'?item.descFr:item.descEn}</p><em>${language==='fr'?'CHOISIR':'CHOOSE'} →</em>`;
      button.onclick=()=>{upgradeLevels[item.id]++;item.apply();choosing=false;$('#upgrade').classList.remove('show');updateWeaponStrip();tone(330,.12,'triangle',.06);tone(660,.2,'sine',.04);if(xp>=xpNeed)setTimeout(()=>{xp-=xpNeed;level++;xpNeed=Math.round(10+level*7.5);openUpgrade()},120)};
      box.append(button);
    });
    $('#upgrade').classList.add('show');updateHud(true);
  }

  function nearestEnemy(range){let best=null,bestDistance=range;for(const enemy of enemies){if(enemy.dead)continue;const d=distance(enemy,player);if(d<bestDistance){best=enemy;bestDistance=d}}return best}
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  function spawnParticles(x,y,color,count){for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,s=30+Math.random()*150;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:2+Math.random()*4,color,life:.35+Math.random()*.55,max:.9})}}

  function draw(){
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
    let sx=0,sy=0;if(shake>0){sx=(Math.random()-.5)*shake;sy=(Math.random()-.5)*shake;shake*=.88;if(shake<.3)shake=0}
    ctx.save();ctx.translate(width/2-player.x+sx,height/2-player.y+sy);
    drawGround();drawDecor();drawDrops();drawRings();drawShots();drawEnemies();drawPlayer();drawParticles();ctx.restore();
    drawEdgeBossMarker();
    if(player.invulnerable>0){ctx.fillStyle=`rgba(255,72,120,${Math.min(.16,player.invulnerable*.3)})`;ctx.fillRect(0,0,width,height)}
  }

  function drawGround(){
    const left=player.x-width/2-120,top=player.y-height/2-120,right=player.x+width/2+120,bottom=player.y+height/2+120;
    const gradient=ctx.createRadialGradient(player.x,player.y,0,player.x,player.y,Math.max(width,height));gradient.addColorStop(0,'#102c30');gradient.addColorStop(.55,'#071721');gradient.addColorStop(1,'#030912');ctx.fillStyle=gradient;ctx.fillRect(left,top,right-left,bottom-top);
    const grid=90;ctx.lineWidth=1;ctx.strokeStyle='rgba(83,255,217,.07)';ctx.beginPath();for(let x=Math.floor(left/grid)*grid;x<right;x+=grid){ctx.moveTo(x,top);ctx.lineTo(x,bottom)}for(let y=Math.floor(top/grid)*grid;y<bottom;y+=grid){ctx.moveTo(left,y);ctx.lineTo(right,y)}ctx.stroke();
    ctx.strokeStyle='rgba(187,255,101,.12)';ctx.lineWidth=2;ctx.strokeRect(-WORLD/2,-WORLD/2,WORLD,WORLD);
  }

  function drawDecor(){
    const margin=Math.max(width,height)*.7;
    decor.forEach(item=>{if(Math.abs(item.x-player.x)>margin||Math.abs(item.y-player.y)>margin)return;ctx.save();ctx.translate(item.x,item.y);const pulse=.72+Math.sin(elapsed*1.3+item.phase)*.2;
      if(item.type===0){ctx.fillStyle='#123d3c';ctx.strokeStyle=`rgba(106,255,207,${pulse*.38})`;ctx.lineWidth=3;ctx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3,r=item.size*(i%2?1:.72),x=Math.cos(a)*r,y=Math.sin(a)*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.closePath();ctx.fill();ctx.stroke()}
      else if(item.type===1){ctx.strokeStyle=`rgba(157,105,255,${pulse*.4})`;ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,item.size*.75,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(0,0,item.size*.35,0,Math.PI*2);ctx.stroke()}
      else if(item.type===2){ctx.fillStyle=`rgba(202,255,105,${pulse*.18})`;ctx.beginPath();ctx.ellipse(0,0,item.size*1.3,item.size*.55,item.phase,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#7fffaa44';ctx.stroke()}
      else{ctx.fillStyle='#1a5262';ctx.shadowColor='#62eaff';ctx.shadowBlur=10;ctx.beginPath();ctx.moveTo(0,-item.size);ctx.lineTo(item.size*.55,item.size*.65);ctx.lineTo(-item.size*.55,item.size*.65);ctx.closePath();ctx.fill();ctx.shadowBlur=0}ctx.restore()});
  }

  function drawDrops(){drops.forEach(drop=>{ctx.save();ctx.translate(drop.x,drop.y+Math.sin(drop.phase)*3);ctx.shadowBlur=15;ctx.shadowColor=drop.type==='heal'?'#6dffa7':'#b06cff';ctx.fillStyle=drop.type==='heal'?'#75ffad':'#a875ff';ctx.beginPath();ctx.arc(0,0,drop.r,0,Math.PI*2);ctx.fill();ctx.fillStyle='#efffff';ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(drop.type==='heal'?'+':'✦',0,.5);ctx.restore()})}
  function drawRings(){rings.forEach(r=>{ctx.strokeStyle=r.color;ctx.globalAlpha=Math.max(0,r.life/.8);ctx.lineWidth=5;ctx.shadowBlur=15;ctx.shadowColor=r.color;ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;ctx.shadowBlur=0})}
  function drawShots(){shots.forEach(shot=>drawOrb(shot.x,shot.y,shot.r,shot.color));hostileShots.forEach(shot=>drawOrb(shot.x,shot.y,shot.r,shot.color))}
  function drawOrb(x,y,r,color){ctx.save();ctx.shadowBlur=15;ctx.shadowColor=color;ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.restore()}

  function drawEnemies(){enemies.forEach(enemy=>{if(enemy.dead)return;ctx.save();ctx.translate(enemy.x,enemy.y);ctx.rotate(Math.atan2(player.y-enemy.y,player.x-enemy.x));ctx.shadowColor=enemy.color;ctx.shadowBlur=enemy.boss?28:12;
      if(enemy.boss){ctx.fillStyle='#162031';ctx.strokeStyle=enemy.color;ctx.lineWidth=6;ctx.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5,r=enemy.r*(i%2?1:.72);ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r)}ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle=enemy.color;ctx.fillRect(-enemy.r*.25,-enemy.r*.52,enemy.r*.7,enemy.r*.25)}
      else if(enemy.type==='jet'){
        ctx.fillStyle='#263443';ctx.strokeStyle=enemy.color;ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(enemy.r*1.45,0);ctx.lineTo(enemy.r*.15,-enemy.r*.28);ctx.lineTo(-enemy.r*.45,-enemy.r);ctx.lineTo(-enemy.r*.72,-enemy.r*.92);ctx.lineTo(-enemy.r*.48,-enemy.r*.22);ctx.lineTo(-enemy.r*1.05,-enemy.r*.1);ctx.lineTo(-enemy.r*1.1,enemy.r*.1);ctx.lineTo(-enemy.r*.48,enemy.r*.22);ctx.lineTo(-enemy.r*.72,enemy.r*.92);ctx.lineTo(-enemy.r*.45,enemy.r);ctx.lineTo(enemy.r*.15,enemy.r*.28);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#75dfff';ctx.beginPath();ctx.ellipse(enemy.r*.45,0,enemy.r*.35,enemy.r*.18,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffb34d';ctx.fillRect(-enemy.r*1.18,-enemy.r*.15,enemy.r*.28,enemy.r*.3)
      }
      else if(enemy.type==='tank'){
        ctx.fillStyle='#151d28';ctx.fillRect(-enemy.r*.82,-enemy.r*.78,enemy.r*1.58,enemy.r*.28);ctx.fillRect(-enemy.r*.82,enemy.r*.5,enemy.r*1.58,enemy.r*.28);ctx.fillStyle='#34404b';ctx.strokeStyle=enemy.color;ctx.lineWidth=3;ctx.fillRect(-enemy.r*.65,-enemy.r*.54,enemy.r*1.3,enemy.r*1.08);ctx.strokeRect(-enemy.r*.65,-enemy.r*.54,enemy.r*1.3,enemy.r*1.08);ctx.beginPath();ctx.arc(0,0,enemy.r*.38,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle=enemy.color;ctx.fillRect(enemy.r*.05,-3,enemy.r*1.05,6);ctx.beginPath();ctx.arc(0,0,5,0,Math.PI*2);ctx.fill()
      }
      else if(enemy.type==='helicopter'){
        ctx.fillStyle='#263743';ctx.strokeStyle=enemy.color;ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(enemy.r*.15,0,enemy.r*.72,enemy.r*.5,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#18242e';ctx.fillRect(-enemy.r*1.25,-4,enemy.r*1.18,8);ctx.strokeStyle=enemy.color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(-enemy.r*1.25,0,enemy.r*.24,0,Math.PI*2);ctx.moveTo(-enemy.r*1.48,0);ctx.lineTo(-enemy.r*1.02,0);ctx.moveTo(-enemy.r*1.25,-enemy.r*.23);ctx.lineTo(-enemy.r*1.25,enemy.r*.23);ctx.stroke();ctx.save();ctx.rotate(enemy.phase*2.8);ctx.strokeStyle='#d8fbffcc';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-enemy.r*1.35,0);ctx.lineTo(enemy.r*1.35,0);ctx.moveTo(0,-enemy.r*1.35);ctx.lineTo(0,enemy.r*1.35);ctx.stroke();ctx.restore();ctx.fillStyle='#69dfff';ctx.beginPath();ctx.ellipse(enemy.r*.42,0,enemy.r*.25,enemy.r*.25,0,0,Math.PI*2);ctx.fill()
      }
      else{
        ctx.fillStyle='#1c2732';ctx.strokeStyle=enemy.color;ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(-enemy.r*.86,-enemy.r*.58,enemy.r*1.72,enemy.r*1.16,5);ctx.fill();ctx.stroke();ctx.fillStyle='#0b1017';for(let y=-1;y<=1;y+=2){ctx.beginPath();ctx.arc(-enemy.r*.48,y*enemy.r*.67,4,0,Math.PI*2);ctx.arc(enemy.r*.48,y*enemy.r*.67,4,0,Math.PI*2);ctx.fill()}ctx.fillStyle=enemy.color;ctx.fillRect(enemy.r*.1,-2,enemy.r*.9,4);ctx.fillRect(-enemy.r*.34,-enemy.r*.22,enemy.r*.48,enemy.r*.44)
      }
      ctx.shadowBlur=0;if(enemy.boss||enemy.hp<enemy.maxHp){ctx.rotate(-Math.atan2(player.y-enemy.y,player.x-enemy.x));ctx.fillStyle='#040812';ctx.fillRect(-enemy.r,-enemy.r-11,enemy.r*2,5);ctx.fillStyle=enemy.color;ctx.fillRect(-enemy.r,-enemy.r-11,enemy.r*2*Math.max(0,enemy.hp/enemy.maxHp),5)}ctx.restore()})}

  function drawPlayer(){
    const move=movementVector(),angle=Math.atan2(move.y,move.x);ctx.save();ctx.translate(player.x,player.y);if(move.x||move.y)ctx.rotate(angle+Math.PI/2);ctx.shadowColor='#7effbc';ctx.shadowBlur=24;
    ctx.fillStyle='#54d56f';ctx.beginPath();ctx.ellipse(0,-5,player.r*1.05,player.r*.88,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#06151e';ctx.beginPath();ctx.ellipse(-8,-8,5,8,-.2,0,Math.PI*2);ctx.ellipse(8,-8,5,8,.2,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#68d873';ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-9,20);ctx.lineTo(-17,32);ctx.moveTo(9,20);ctx.lineTo(17,32);ctx.moveTo(-8,31);ctx.lineTo(-11,43);ctx.moveTo(8,31);ctx.lineTo(11,43);ctx.stroke();ctx.fillStyle='#3caf5a';ctx.strokeStyle='#baff78';ctx.lineWidth=2.5;ctx.beginPath();ctx.ellipse(0,21,14,18,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#91ff75';ctx.beginPath();ctx.ellipse(0,18,5,8,0,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.restore();
    orbitPositions().forEach(orb=>{drawOrb(orb.x,orb.y,orb.r,'#6eeaff');ctx.strokeStyle='#c8ffff88';ctx.lineWidth=2;ctx.beginPath();ctx.arc(orb.x,orb.y,orb.r+4,0,Math.PI*2);ctx.stroke()});
  }
  function drawParticles(){particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.fillRect(p.x-p.r/2,p.y-p.r/2,p.r,p.r)});ctx.globalAlpha=1}
  function drawEdgeBossMarker(){if(!boss||boss.dead)return;const sx=boss.x-player.x+width/2,sy=boss.y-player.y+height/2;if(sx>40&&sx<width-40&&sy>90&&sy<height-80)return;const a=Math.atan2(sy-height/2,sx-width/2),radius=Math.min(width,height)*.39,x=width/2+Math.cos(a)*radius,y=height/2+Math.sin(a)*radius;ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.fillStyle=boss.color;ctx.shadowColor=boss.color;ctx.shadowBlur=14;ctx.beginPath();ctx.moveTo(14,0);ctx.lineTo(-10,-9);ctx.lineTo(-10,9);ctx.closePath();ctx.fill();ctx.restore()}

  function updateHud(force=false){
    const remaining=Math.max(0,Math.ceil(RUN_TIME-elapsed)),minutes=Math.floor(remaining/60),seconds=remaining%60;
    $('#timer').textContent=`${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;$('#level').textContent=level;$('#kills').textContent=kills;
    $('#healthLabel').textContent=`BIO-VIE ${Math.max(0,Math.ceil(player.hp))} / ${player.maxHp}`;$('#healthBar').style.width=`${Math.max(0,player.hp/player.maxHp*100)}%`;
    $('#xpLabel').textContent=`${xp} / ${xpNeed}`;$('#xpBar').style.width=`${Math.min(100,xp/xpNeed*100)}%`;
    const sector=elapsed<120?(language==='fr'?'JARDIN BIO-LUMINEUX':'BIOLUMINESCENT GARDEN'):elapsed<240?(language==='fr'?'FAILLE CRISTALLINE':'CRYSTAL RIFT'):elapsed<360?(language==='fr'?'RUINES DU NOYAU':'CORE RUINS'):(language==='fr'?'PORTAIL DOMINION':'DOMINION GATE');$('#sector').textContent=sector;
    if(force)updateWeaponStrip();if(boss)updateBoss();
  }
  function updateBoss(){if(!boss||boss.dead){$('#bossPanel').hidden=true;return}$('#bossPanel').hidden=false;$('#bossTitle').textContent=boss.name;const ratio=Math.max(0,boss.hp/boss.maxHp);$('#bossHealth').style.width=`${ratio*100}%`;$('#bossPercent').textContent=`${Math.ceil(ratio*100)}%`}
  function updateWeaponStrip(){const strip=$('#weaponStrip');strip.replaceChildren();weapons.forEach(item=>{const rank=item.key==='plasma'?1+upgradeLevels.damage+upgradeLevels.rate+upgradeLevels.multi:player[`${item.key}Level`]||0,node=document.createElement('span');node.className=`weapon${rank?'':' locked'}`;node.innerHTML=`${item.icon}<b>${rank||'—'}</b>`;strip.append(node)})}

  function announce(message){const node=$('#announcement');node.textContent=message;node.classList.add('show');clearTimeout(announcementTimer);announcementTimer=setTimeout(()=>node.classList.remove('show'),1900)}
  function pauseGame(show=true){if(!playing||ended||choosing)return;paused=show;$('#pauseScreen').classList.toggle('show',show)}
  function finish(win){
    ended=true;playing=false;paused=false;choosing=false;$('#upgrade').classList.remove('show');$('#pauseScreen').classList.remove('show');
    const survival=Math.floor(elapsed),finalScore=Math.round((score+kills*120+level*850+survival*40)*(win?2:1)*config.score);
    if(win)window.DanArcadeScores?.record('xeno-survivors.html',finalScore,`${finalScore.toLocaleString()} pts · ${kills} kills`,`${config[language]} · LV ${level} · ${formatTime(survival)}`);
    const card=$('#result .result-card');card.classList.toggle('lost',!win);$('#resultKicker').textContent=win?(language==='fr'?'EXTRACTION RÉUSSIE':'EXTRACTION COMPLETE'):(language==='fr'?'SIGNAL BIOLOGIQUE PERDU':'BIOLOGICAL SIGNAL LOST');
    $('#resultTitle').innerHTML=win?(language==='fr'?'LA RUCHE<br><span>SURVIT</span>':'THE HIVE<br><span>SURVIVES</span>'):(language==='fr'?'SENTINELLE<br><span>TOMBÉE</span>':'SENTINEL<br><span>FALLEN</span>');
    $('#resultStats').innerHTML=`<div><small>${language==='fr'?'SCORE':'SCORE'}</small><strong>${finalScore.toLocaleString()}</strong></div><div><small>${language==='fr'?'ÉLIMINÉS':'ELIMINATED'}</small><strong>${kills}</strong></div><div><small>${language==='fr'?'NIVEAU':'LEVEL'}</small><strong>${level}</strong></div><div><small>${language==='fr'?'SURVIE':'SURVIVAL'}</small><strong>${formatTime(survival)}</strong></div><div><small>${language==='fr'?'MUTATIONS':'MUTATIONS'}</small><strong>${Object.values(upgradeLevels).reduce((a,b)=>a+b,0)}</strong></div><div><small>${language==='fr'?'DIFFICULTÉ':'DIFFICULTY'}</small><strong>${config[language]}</strong></div>`;
    $('#result').classList.add('show');win?window.DanArcadeFX?.play('cheer',{volume:.3,duration:2.6}):window.DanArcadeFX?.play('metal',{volume:.3,rate:.6});
  }
  function formatTime(seconds){return`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`}

  function frame(now){
    const dt=Math.min(.033,(now-lastTime)/1000||0);lastTime=now;if(playing&&!paused&&!choosing&&!ended)update(dt);draw();requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  addEventListener('keydown',event=>{const key=event.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d',' '].includes(key))event.preventDefault();keys.add(key);if(key==='escape'||key==='p')paused?pauseGame(false):pauseGame(true)});
  addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));
  canvas.addEventListener('pointerdown',event=>{
    if(event.pointerType==='mouse'||!playing||paused||choosing)return;event.preventDefault();touch.active=true;touch.id=event.pointerId;touch.startX=event.clientX;touch.startY=event.clientY;touch.x=0;touch.y=0;joystick.style.left=`${event.clientX}px`;joystick.style.top=`${event.clientY}px`;joystick.classList.add('active');canvas.setPointerCapture?.(event.pointerId);
  });
  canvas.addEventListener('pointermove',event=>{if(!touch.active||event.pointerId!==touch.id)return;const dx=event.clientX-touch.startX,dy=event.clientY-touch.startY,length=Math.hypot(dx,dy)||1,power=Math.min(1,length/45);touch.x=dx/length*power;touch.y=dy/length*power;joystick.querySelector('i').style.transform=`translate(${touch.x*35}px,${touch.y*35}px)`});
  const releaseTouch=event=>{if(event&&event.pointerId!==touch.id)return;touch.active=false;touch.id=null;touch.x=touch.y=0;joystick.classList.remove('active');joystick.querySelector('i').style.transform=''};
  canvas.addEventListener('pointerup',releaseTouch);canvas.addEventListener('pointercancel',releaseTouch);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing&&!paused&&!choosing)pauseGame(true)});

  $('#start').onclick=startRun;$('#again').onclick=startRun;$('#pause').onclick=()=>pauseGame(true);$('#resume').onclick=()=>pauseGame(false);
  $('#sound').onclick=()=>{soundOn=!soundOn;localStorage.setItem('xenoSurvivorsSound',soundOn?'on':'off');$('#sound').textContent=soundOn?'◖))':'×';$('#sound').setAttribute('aria-pressed',String(soundOn));if(soundOn)tone(620,.08,'sine',.05)};
  updateWeaponStrip();updateHud(true);
  if(params.get('launch')==='1')setTimeout(startRun,80);
})();
