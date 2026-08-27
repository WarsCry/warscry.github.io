(()=>{
const canvas=document.querySelector('#game'),menu=document.querySelector('#menu'),squadEl=document.querySelector('#squad'),phaseEl=document.querySelector('#phase'),roundEl=document.querySelector('#round'),hostilesEl=document.querySelector('#hostiles');
const unitRole=document.querySelector('#unitRole'),unitName=document.querySelector('#unitName'),unitStats=document.querySelector('#unitStats'),abilityButton=document.querySelector('#ability'),endTurnButton=document.querySelector('#endTurn'),hintEl=document.querySelector('#hint'),toastEl=document.querySelector('#toast'),dieEl=document.querySelector('#die'),rollText=document.querySelector('#rollText'),enemyIntentsEl=document.querySelector('#enemyIntents');
if(!window.BABYLON){menu.querySelector('p').textContent='The 3D table could not load. Check your connection and reload the mission.';return}

const B=BABYLON,V=B.Vector3,C=B.Color3,CELL=1.42;
const MAP=[
  '#############',
  '#...........#',
  '#....#......#',
  '#....#..#...#',
  '#...........#',
  '#..#.....#..#',
  '#..#........#',
  '#...........#',
  '#############'
];
const WIDTH=MAP[0].length,HEIGHT=MAP.length;
const HERO_DEFS=[
  {id:'vexa',name:'VEXA',role:'PHASE SCOUT',color:'#72ffe0',hp:8,move:5,range:4,damage:2,ability:'PHASE DASH',abilityText:'Gain three extra movement tiles this turn.',x:1,z:1,type:'scout'},
  {id:'krag',name:'KRAG',role:'CARAPACE GUARD',color:'#cbff68',hp:14,move:3,range:1,damage:3,ability:'AEGIS SHELL',abilityText:'Gain five shield points for the enemy turn.',x:1,z:3,type:'guard'},
  {id:'lyra',name:'LYRA',role:'SPORE MEDIC',color:'#ff88d7',hp:10,move:4,range:3,damage:1,ability:'MEND SPORES',abilityText:'Restore four health to the most injured alien.',x:1,z:5,type:'medic'},
  {id:'mokk',name:'MOKK',role:'ACID GRENADIER',color:'#ffb45e',hp:11,move:3,range:4,damage:2,ability:'ACID NOVA',abilityText:'Choose an enemy. Deal three damage to it and adjacent units.',abilityRange:5,x:2,z:7,type:'grenadier'},
  {id:'syl',name:'SYL',role:'VOID SEER',color:'#a985ff',hp:9,move:4,range:5,damage:2,ability:'MIND RIFT',abilityText:'Damage one enemy and stun its next turn.',abilityRange:6,x:2,z:2,type:'seer'}
];
const ENEMY_DEFS=[
  {id:'rifleman',name:'RIFLEMAN',role:'SOLAR INFANTRY',color:'#ff5d6d',hp:7,move:3,range:4,damage:2,x:11,z:1,type:'rifleman'},
  {id:'sniper',name:'SNIPER',role:'LONGSHOT OPERATIVE',color:'#ff9f5c',hp:5,move:2,range:7,damage:3,x:10,z:2,type:'sniper'},
  {id:'shield',name:'SHIELDGUARD',role:'BREACH BLOCKER',color:'#f6d45e',hp:11,move:2,range:1,damage:2,shield:3,x:11,z:4,type:'shieldguard'},
  {id:'fieldmedic',name:'FIELD MEDIC',role:'COMBAT SUPPORT',color:'#8fd9ff',hp:7,move:3,range:3,damage:1,x:10,z:6,type:'fieldmedic'},
  {id:'commander',name:'COMMANDER',role:'DOMINION OFFICER',color:'#ff6eb3',hp:13,move:3,range:4,damage:2,x:11,z:7,type:'commander'}
];
const DIFFICULTIES={cadet:{label:'CADET',hp:.82,damage:0,score:.8},standard:{label:'VETERAN',hp:1,damage:0,score:1},overmind:{label:'OVERMIND',hp:1.28,damage:1,score:1.4}};
const MISSIONS={assault:{label:'TOTAL ASSAULT',objective:'Defeat all five Dominion defenders.'},commander:{label:'HEADHUNTER',objective:'Eliminate the Dominion Commander.'},survival:{label:'HOLD THE BREACH',objective:'Keep at least one alien alive through round 6.'}};

const engine=new B.Engine(canvas,true,{stencil:true,adaptToDeviceRatio:true});
if(matchMedia('(pointer:coarse)').matches)engine.setHardwareScalingLevel(1/Math.min(devicePixelRatio||1,1.3));
let scene,camera,heroes=[],enemies=[],selected=null,selectionRing,turn='player',round=1,busy=false,started=false,abilityMode=false,pointerStart=null,selectedMission='assault',selectedDifficulty='standard';
const tiles=new Map(),materials={};
const arcadeFx=()=>window.DanArcadeFX;

const key=(x,z)=>`${x},${z}`;
const world=(x,z)=>new V((x-(WIDTH-1)/2)*CELL,.19,(z-(HEIGHT-1)/2)*CELL);
const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z);
const aliveUnits=()=>[...heroes,...enemies].filter(unit=>unit.alive);
const occupied=(ignore=null)=>new Set(aliveUnits().filter(unit=>unit!==ignore).map(unit=>key(unit.x,unit.z)));
const isFloor=(x,z)=>z>=0&&z<HEIGHT&&x>=0&&x<WIDTH&&MAP[z][x]==='.';
const neighbours=(x,z)=>[[x+1,z],[x-1,z],[x,z+1],[x,z-1]].filter(([nx,nz])=>isFloor(nx,nz));

function standard(name,color,emissive=null,alpha=1){const mat=new B.StandardMaterial(name,scene);mat.diffuseColor=C.FromHexString(color);mat.specularColor=new C(.24,.3,.32);mat.specularPower=72;mat.alpha=alpha;if(emissive)mat.emissiveColor=C.FromHexString(emissive).scale(.18);return mat}
function textureMaterial(mat,url,scale,tint){const texture=new B.Texture(url,scene,false,false,B.Texture.TRILINEAR_SAMPLINGMODE);texture.uScale=scale;texture.vScale=scale;texture.anisotropicFilteringLevel=16;mat.diffuseTexture=texture;mat.diffuseColor=C.FromHexString(tint);return mat}
function box(name,options,position,material){const mesh=B.MeshBuilder.CreateBox(name,options,scene);mesh.position.copyFrom(position);mesh.material=material;return mesh}
function part(unit,mesh,material){mesh.parent=unit.root;mesh.material=material;mesh.metadata={unit};unit.meshes.push(mesh);return mesh}
function createHealthBar(unit){
  const root=new B.TransformNode(`${unit.name} health`,scene);root.parent=unit.root;root.position.y=1.82;root.billboardMode=B.TransformNode.BILLBOARDMODE_ALL;
  const back=B.MeshBuilder.CreatePlane('health back',{width:.86,height:.11},scene);back.parent=root;back.material=standard('health background','#071014');back.isPickable=false;
  const fill=B.MeshBuilder.CreatePlane('health fill',{width:.8,height:.065},scene);fill.parent=root;fill.position.z=-.006;fill.material=standard(`${unit.name} health colour`,unit.team==='hero'?'#67ffe0':'#ff536a',unit.team==='hero'?'#67ffe0':'#ff536a');fill.isPickable=false;unit.healthFill=fill;updateHealthBar(unit);
}
function updateHealthBar(unit){if(!unit.healthFill)return;const ratio=Math.max(0,unit.hp/unit.maxHp);unit.healthFill.scaling.x=Math.max(.001,ratio);unit.healthFill.position.x=-(1-ratio)*.4;unit.healthFill.parent.setEnabled(unit.alive)}

function buildScene(){
  scene=new B.Scene(engine);scene.clearColor=new B.Color4(.008,.016,.02,1);scene.fogMode=B.Scene.FOGMODE_EXP2;scene.fogDensity=.014;scene.fogColor=new C(.025,.055,.06);
  camera=new B.ArcRotateCamera('table camera',-Math.PI/2,1.02,20,new V(0,.25,0),scene);camera.lowerRadiusLimit=11;camera.upperRadiusLimit=27;camera.lowerBetaLimit=.5;camera.upperBetaLimit=1.36;camera.wheelPrecision=40;camera.pinchPrecision=75;camera.panningSensibility=70;camera.inertia=.72;camera.attachControl(canvas,true);
  const ambient=new B.HemisphericLight('alien table ambience',new V(0,1,0),scene);ambient.intensity=.72;ambient.diffuse=new C(.58,.78,.75);ambient.groundColor=new C(.08,.12,.17);
  const keyLight=new B.DirectionalLight('table key light',new V(-.45,-1,.35),scene);keyLight.position=new V(9,16,-9);keyLight.intensity=1.05;
  const rim=new B.PointLight('breach glow',new V(-6,5,0),scene);rim.diffuse=new C(.2,1,.78);rim.intensity=1.6;rim.range=19;
  const enemyLight=new B.PointLight('dominion glow',new V(7,4,0),scene);enemyLight.diffuse=new C(1,.2,.25);enemyLight.intensity=1.25;enemyLight.range=17;
  const shadows=new B.ShadowGenerator(matchMedia('(pointer:coarse)').matches?1024:2048,keyLight);shadows.usePercentageCloserFiltering=true;shadows.filteringQuality=B.ShadowGenerator.QUALITY_MEDIUM;
  const glow=new B.GlowLayer('tabletop bloom',scene,{blurKernelSize:14});glow.intensity=.14;
  const pipeline=new B.DefaultRenderingPipeline('tabletop finish',true,scene,[camera]);pipeline.fxaaEnabled=true;pipeline.samples=matchMedia('(pointer:coarse)').matches?1:4;pipeline.imageProcessing.contrast=1.2;pipeline.imageProcessing.exposure=1.02;pipeline.bloomEnabled=false;

  materials.floorA=standard('graphite deck','#16282b');materials.floorB=standard('alloy deck','#203438');materials.floorC=standard('worn deck','#172329');materials.wall=standard('outpost wall','#26343d');materials.wallInset=standard('wall armour inset','#0c171e');materials.mint=standard('alien route','#14564f','#17ae92');materials.red=standard('dominion route','#69202c','#d52645');materials.void=standard('void table edge','#05080d');materials.move=standard('move highlight','#174f48','#39e5c5',.58);materials.selection=standard('selection ring','#173f39','#67ffe2',.78);
  textureMaterial(materials.floorA,'assets/textures/alien-hull-v1.webp',1.15,'#7b898c');textureMaterial(materials.floorB,'assets/textures/alien-circuit-v1.webp',1.05,'#667d7e');textureMaterial(materials.floorC,'assets/textures/alien-biomech-v1.webp',1.2,'#5d746d');textureMaterial(materials.wall,'assets/textures/alien-hull-v1.webp',1.5,'#68777c');textureMaterial(materials.wallInset,'assets/textures/alien-circuit-v1.webp',1.25,'#53696b');textureMaterial(materials.void,'assets/textures/alien-biomech-v1.webp',2.8,'#374842');
  const table=box('floating tactical table',{width:WIDTH*CELL+1.8,height:.48,depth:HEIGHT*CELL+1.8},new V(0,-.39,0),materials.void);table.receiveShadows=true;
  const underglow=box('table underglow',{width:WIDTH*CELL+1.2,height:.08,depth:HEIGHT*CELL+1.2},new V(0,-.68,0),materials.mint);underglow.isPickable=false;
  for(let z=0;z<HEIGHT;z++)for(let x=0;x<WIDTH;x++){
    const pos=world(x,z);
    if(isFloor(x,z)){
      const tile=B.MeshBuilder.CreateBox(`deck tile ${x}-${z}`,{width:CELL-.075,height:.16,depth:CELL-.075},scene);tile.position=new V(pos.x,.02,pos.z);tile.material=[materials.floorA,materials.floorB,materials.floorC][(x+z*2)%3];tile.metadata={tile:{x,z}};tile.receiveShadows=true;
      const inset=box('deck panel seam',{width:CELL*.5,height:.018,depth:.025},new V(pos.x+(x%2?.19:-.19),.112,pos.z+CELL*.39),x<5?materials.mint:x>7?materials.red:materials.wallInset);inset.isPickable=false;
      const highlight=B.MeshBuilder.CreateCylinder(`tile signal ${x}-${z}`,{height:.025,diameter:.82,tessellation:24},scene);highlight.position=new V(pos.x,.13,pos.z);highlight.material=materials.move;highlight.isPickable=false;highlight.setEnabled(false);
      tiles.set(key(x,z),{x,z,mesh:tile,highlight});
    }else{
      const boundary=x===0||z===0||x===WIDTH-1||z===HEIGHT-1,h=boundary?.52:1.08;
      const wall=box(`armoured wall ${x}-${z}`,{width:CELL-.06,height:h,depth:CELL-.06},new V(pos.x,h/2-.01,pos.z),materials.wall);wall.receiveShadows=true;wall.isPickable=false;
      const cap=box('wall cap light',{width:CELL*.56,height:.035,depth:.12},new V(pos.x,h+.015,pos.z),x<WIDTH/2?materials.mint:materials.red);cap.isPickable=false;
      if(!boundary){const face=box('wall inset',{width:CELL*.62,height:.38,depth:.035},new V(pos.x,h*.55,pos.z-CELL*.49),materials.wallInset);face.isPickable=false}
    }
  }
  for(const z of [-HEIGHT*CELL/2-.62,HEIGHT*CELL/2+.62]){const rail=box('table perimeter rail',{width:WIDTH*CELL+1.2,height:.22,depth:.18},new V(0,.05,z),z<0?materials.mint:materials.red);rail.isPickable=false}
  for(const x of [-WIDTH*CELL/2-.62,WIDTH*CELL/2+.62]){const rail=box('table perimeter rail',{width:.18,height:.22,depth:HEIGHT*CELL+1.2},new V(x,.05,0),x<0?materials.mint:materials.red);rail.isPickable=false}

  selectionRing=B.MeshBuilder.CreateTorus('selected miniature ring',{diameter:1.02,thickness:.07,tessellation:32},scene);selectionRing.position.y=.22;selectionRing.material=materials.selection;selectionRing.isPickable=false;selectionRing.setEnabled(false);
  heroes=HERO_DEFS.map(def=>createUnit(def,'hero',shadows));
  enemies=ENEMY_DEFS.map(def=>createUnit(def,'enemy',shadows));
  scene.onBeforeRenderObservable.add(()=>{const t=performance.now()*.001;if(selectionRing?.isEnabled()){selectionRing.rotation.y=t;selectionRing.scaling.setAll(1+Math.sin(t*4)*.045)}});
  return scene;
}

function createUnit(def,team,shadows){
  const unit={...def,team,maxHp:def.hp,alive:true,shield:def.shield||0,moveLeft:def.move,acted:false,abilityUsed:false,stunned:0,meshes:[],root:new B.TransformNode(`${def.name} miniature`,scene)};unit.root.position.copyFrom(world(def.x,def.z));unit.root.rotation.y=team==='hero'?Math.PI/2:-Math.PI/2;
  const primary=standard(`${def.id} armour`,def.color,team==='hero'?def.color:null),dark=standard(`${def.id} dark armour`,team==='hero'?'#10252b':'#20252d'),skin=standard(`${def.id} skin`,team==='hero'?'#8fe8cf':'#d9ad8c'),glowMat=standard(`${def.id} energy`,def.color,def.color);
  const base=part(unit,B.MeshBuilder.CreateCylinder(`${def.name} miniature base`,{height:.13,diameter:.94,tessellation:28},scene),team==='hero'?materials.mint:materials.red);base.position.y=.03;
  if(team==='hero')buildAlienMini(unit,primary,dark,glowMat);else buildHumanMini(unit,primary,dark,skin,glowMat);
  unit.root.getChildMeshes().forEach(mesh=>{mesh.metadata={unit};mesh.isPickable=true;mesh.receiveShadows=true;shadows.addShadowCaster(mesh)});
  createHealthBar(unit);
  return unit;
}

function buildAlienMini(unit,primary,dark,glowMat){
  const body=part(unit,B.MeshBuilder.CreateCapsule('alien torso',{height:.82,radius:.25,tessellation:12,subdivisions:3},scene),primary);body.position.y=.67;
  const head=part(unit,B.MeshBuilder.CreateSphere('alien head',{diameter:.48,segments:16},scene),primary);head.position.y=1.22;head.scaling=new V(1.05,1.25,.82);
  const eye=part(unit,B.MeshBuilder.CreateSphere('alien visor',{diameter:.24,segments:10},scene),glowMat);eye.position=new V(0,1.26,.19);eye.scaling=new V(1.5,.35,.3);
  for(const side of [-1,1]){const arm=part(unit,B.MeshBuilder.CreateCapsule('alien arm',{height:.57,radius:.09,tessellation:8},scene),dark);arm.position=new V(side*.31,.72,0);arm.rotation.z=side*.22}
  if(unit.type==='scout')for(const side of [-1,1]){const antenna=part(unit,B.MeshBuilder.CreateCylinder('phase antenna',{height:.43,diameter:.055,tessellation:8},scene),glowMat);antenna.position=new V(side*.13,1.62,0);antenna.rotation.z=side*.22}
  if(unit.type==='guard')for(const side of [-1,1]){const shell=part(unit,B.MeshBuilder.CreateSphere('carapace shoulder',{diameter:.48,segments:12},scene),primary);shell.position=new V(side*.36,.87,0);shell.scaling=new V(1.15,.72,1.05)}
  if(unit.type==='medic'){const halo=part(unit,B.MeshBuilder.CreateTorus('spore halo',{diameter:.72,thickness:.055,tessellation:28},scene),glowMat);halo.position.y=1.5;halo.rotation.x=Math.PI/2;const vial=part(unit,B.MeshBuilder.CreateCylinder('spore vial',{height:.48,diameter:.16,tessellation:10},scene),glowMat);vial.position=new V(-.28,.65,-.16)}
  if(unit.type==='grenadier'){const pack=part(unit,B.MeshBuilder.CreateBox('acid reservoir',{width:.52,height:.58,depth:.25},scene),dark);pack.position=new V(0,.76,-.25);const cannon=part(unit,B.MeshBuilder.CreateCylinder('acid launcher',{height:.68,diameter:.14,tessellation:10},scene),glowMat);cannon.position=new V(.34,.87,.16);cannon.rotation.x=Math.PI/2}
  if(unit.type==='seer')for(let i=0;i<3;i++){const orb=part(unit,B.MeshBuilder.CreateSphere('seer orbit',{diameter:.15,segments:8},scene),glowMat);const a=i*Math.PI*2/3;orb.position=new V(Math.sin(a)*.43,1.3+Math.cos(a)*.18,Math.cos(a)*.2)}
}

function buildHumanMini(unit,primary,dark,skin,glowMat){
  const torso=part(unit,B.MeshBuilder.CreateBox('human armour torso',{width:.48,height:.62,depth:.32},scene),primary);torso.position.y=.72;
  const head=part(unit,B.MeshBuilder.CreateSphere('human head',{diameter:.34,segments:14},scene),skin);head.position.y=1.18;
  const helmet=part(unit,B.MeshBuilder.CreateSphere('human helmet',{diameter:.42,segments:12,slice:.58},scene),dark);helmet.position.y=1.24;helmet.scaling.y=.72;
  for(const side of [-1,1]){const leg=part(unit,B.MeshBuilder.CreateCapsule('human leg',{height:.47,radius:.09,tessellation:8},scene),dark);leg.position=new V(side*.13,.31,0);const arm=part(unit,B.MeshBuilder.CreateCapsule('human arm',{height:.5,radius:.085,tessellation:8},scene),primary);arm.position=new V(side*.31,.72,0);arm.rotation.z=side*.16}
  if(unit.type==='shieldguard'){const shield=part(unit,B.MeshBuilder.CreateBox('solar riot shield',{width:.16,height:.72,depth:.58},scene),primary);shield.position=new V(-.42,.72,.08);const slit=part(unit,B.MeshBuilder.CreateBox('shield light',{width:.18,height:.08,depth:.42},scene),glowMat);slit.position=new V(-.51,.87,.08)}else{
    const barrel=part(unit,B.MeshBuilder.CreateCylinder('human rifle',{height:unit.type==='sniper'?.88:.58,diameter:.09,tessellation:8},scene),dark);barrel.position=new V(.31,.76,.25);barrel.rotation.x=Math.PI/2;
  }
  if(unit.type==='fieldmedic'){const pack=part(unit,B.MeshBuilder.CreateBox('medical field pack',{width:.4,height:.46,depth:.2},scene),glowMat);pack.position=new V(0,.75,-.27)}
  if(unit.type==='commander'){const crest=part(unit,B.MeshBuilder.CreateTorus('officer crest',{diameter:.48,thickness:.07,tessellation:18},scene),glowMat);crest.position.y=1.45;crest.rotation.x=Math.PI/2;const mantle=part(unit,B.MeshBuilder.CreateBox('officer mantle',{width:.78,height:.12,depth:.3},scene),primary);mantle.position.y=1.02}
}

function flood(unit,steps){
  const seen=new Map([[key(unit.x,unit.z),{distance:0,parent:null,x:unit.x,z:unit.z}]]),queue=[[unit.x,unit.z]],blocked=occupied(unit);
  while(queue.length){const [x,z]=queue.shift(),current=seen.get(key(x,z));if(current.distance>=steps)continue;for(const [nx,nz] of neighbours(x,z)){const k=key(nx,nz);if(seen.has(k)||blocked.has(k))continue;seen.set(k,{distance:current.distance+1,parent:key(x,z),x:nx,z:nz});queue.push([nx,nz])}}
  return seen;
}

function pathFromMap(map,goalKey){const path=[];let cursor=goalKey;while(map.get(cursor)?.parent){const node=map.get(cursor);path.unshift([node.x,node.z]);cursor=node.parent}return path}
function hasLineOfSight(a,b){const steps=Math.max(Math.abs(b.x-a.x),Math.abs(b.z-a.z))*3;for(let i=1;i<steps;i++){const t=i/steps,x=Math.round(a.x+(b.x-a.x)*t),z=Math.round(a.z+(b.z-a.z)*t);if(MAP[z]?.[x]==='#')return false}return true}
function canAttack(attacker,target,range=attacker.range){return target.alive&&distance(attacker,target)<=range&&(range<=1||hasLineOfSight(attacker,target))}
function inCover(unit){return [[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dz])=>MAP[unit.z+dz]?.[unit.x+dx]==='#')}
function enemyIntent(enemy){
  if(enemy.stunned)return 'STUNNED · SKIPS TURN';
  if(enemy.type==='fieldmedic'&&enemies.some(unit=>unit.alive&&unit.hp<unit.maxHp&&distance(enemy,unit)<=4))return 'RESTORE WOUNDED ALLY';
  const target=heroes.filter(hero=>hero.alive).sort((a,b)=>distance(enemy,a)-distance(enemy,b))[0];
  if(!target)return 'NO TARGET';
  return canAttack(enemy,target)?`ATTACK ${target.name} · ${enemy.damage} DMG`:`ADVANCE TOWARD ${target.name}`;
}

function clearOutlines(){for(const unit of aliveUnits())for(const mesh of unit.meshes){mesh.renderOutline=false;mesh.outlineWidth=.04}}
function outline(unit,color,width=.04){for(const mesh of unit.meshes){mesh.renderOutline=true;mesh.outlineColor=C.FromHexString(color);mesh.outlineWidth=width}}
function refreshHighlights(){
  for(const tile of tiles.values())tile.highlight.setEnabled(false);clearOutlines();
  if(selected?.alive){outline(selected,'#72ffe0',.055);selectionRing.setEnabled(true);selectionRing.position.copyFrom(world(selected.x,selected.z));selectionRing.position.y=.22}else selectionRing.setEnabled(false);
  if(!started||turn!=='player'||busy||!selected?.alive)return;
  if(abilityMode){for(const enemy of enemies.filter(enemy=>canAbilityTarget(selected,enemy)))outline(enemy,'#d78cff',.075);return}
  if(selected.moveLeft>0){const reachable=flood(selected,selected.moveLeft);for(const [tileKey,node] of reachable)if(node.distance>0)tiles.get(tileKey)?.highlight.setEnabled(true)}
  if(!selected.acted)for(const enemy of enemies.filter(enemy=>canAttack(selected,enemy)))outline(enemy,'#ff5b72',.065);
}

function selectHero(unit){if(!unit?.alive||unit.team!=='hero'||turn!=='player'||busy)return;selected=unit;abilityMode=false;renderUI();refreshHighlights();tone(420,.06,'sine')}
function canAbilityTarget(hero,target){return !hero.abilityUsed&&target.team==='enemy'&&target.alive&&['grenadier','seer'].includes(hero.type)&&canAttack(hero,target,hero.abilityRange)}

async function moveAlong(unit,path){for(const [x,z] of path){await tweenUnit(unit,x,z);unit.x=x;unit.z=z}renderUI()}
function tweenUnit(unit,x,z){return new Promise(resolve=>{const start=unit.root.position.clone(),end=world(x,z),began=performance.now(),duration=175;const observer=scene.onBeforeRenderObservable.add(()=>{const t=Math.min(1,(performance.now()-began)/duration),smooth=t*t*(3-2*t);unit.root.position=V.Lerp(start,end,smooth);unit.root.position.y=end.y+Math.sin(Math.PI*t)*.2;if(t>=1){scene.onBeforeRenderObservable.remove(observer);unit.root.position.copyFrom(end);arcadeFx()?.play('step',{volume:.15,rate:unit.team==='hero'?1.18:.88,cooldown:95});resolve()}})})}

async function moveSelected(x,z){
  if(!selected||busy||turn!=='player'||abilityMode)return;const reachable=flood(selected,selected.moveLeft),goal=key(x,z);if(!reachable.has(goal)||reachable.get(goal).distance===0)return;
  busy=true;refreshHighlights();const path=pathFromMap(reachable,goal),cost=path.length;await moveAlong(selected,path);selected.moveLeft=Math.max(0,selected.moveLeft-cost);busy=false;showToast(`${selected.name} MOVED ${cost} TILE${cost===1?'':'S'}`);renderUI();refreshHighlights();
}

function rollFlux(){const roll=1+Math.floor(Math.random()*6);dieEl.classList.add('rolling');setTimeout(()=>dieEl.classList.remove('rolling'),300);dieEl.textContent=roll;return roll}
function setRoll(text){rollText.textContent=text}
async function launchEffect(attacker,target,color){const orb=B.MeshBuilder.CreateSphere('combat energy',{diameter:.16,segments:8},scene);orb.material=standard(`combat flash ${Math.random()}`,color,color);orb.isPickable=false;const start=attacker.root.position.add(new V(0,.9,0)),end=target.root.position.add(new V(0,.75,0)),began=performance.now();return new Promise(resolve=>{const observer=scene.onBeforeRenderObservable.add(()=>{const t=Math.min(1,(performance.now()-began)/240);orb.position=V.Lerp(start,end,t);orb.scaling.setAll(1+Math.sin(Math.PI*t)*.7);if(t>=1){scene.onBeforeRenderObservable.remove(observer);orb.dispose();resolve()}})})}
function commanderBonus(attacker){return attacker.team==='enemy'&&enemies.some(enemy=>enemy.alive&&enemy.type==='commander'&&enemy!==attacker&&distance(enemy,attacker)<=3)?1:0}

async function attack(attacker,target,{free=false,ability=false}={}){
  const roll=rollFlux();setRoll(`${attacker.name} ROLLED ${roll}`);tone(attacker.team==='hero'?620:210,.1,'sawtooth');arcadeFx()?.play(ability?'magic':'laser',{volume:ability ? .24 : .2,rate:attacker.team==='hero'?1.08:.82,cooldown:80});await launchEffect(attacker,target,attacker.color);
  if(roll===1&&!ability){showToast(`${attacker.name} MISSED`);setRoll('MISS · FLUX COLLAPSE');tone(90,.16,'square')}else{
    let amount=attacker.damage+commanderBonus(attacker);if(roll===6)amount+=2;if(ability)amount=ability;else if(attacker.range>1&&inCover(target)){amount=Math.max(0,amount-1);showToast(`${target.name} COVER REDUCED DAMAGE`)}
    await damageUnit(target,amount);setRoll(roll===6?`CRITICAL · ${amount} DAMAGE`:`${amount} DAMAGE`);
  }
  if(attacker.team==='hero'&&!free)attacker.acted=true;renderUI();refreshHighlights();checkBattle();
}

async function damageUnit(target,amount){
  const absorbed=Math.min(target.shield||0,amount);target.shield-=absorbed;amount-=absorbed;if(absorbed)showToast(`${target.name} SHIELD ABSORBED ${absorbed}`);
  if(amount>0){target.hp=Math.max(0,target.hp-amount);showToast(`${target.name} TOOK ${amount} DAMAGE`);tone(target.team==='hero'?110:175,.13,'square');arcadeFx()?.play('metal',{volume:.24,rate:target.team==='hero' ? .82 : 1.2,cooldown:70});arcadeFx()?.hit(canvas,target.team==='hero'?'#ff526d':'#72ffe0',.45)}
  target.root.scaling=new V(1.18,.76,1.18);await wait(120);target.root.scaling.setAll(1);
  if(target.hp<=0){target.alive=false;target.meshes.forEach(mesh=>mesh.isPickable=false);showToast(`${target.name} ELIMINATED`);B.Animation.CreateAndStartAnimation('miniature defeated',target.root,'scaling',60,28,new V(1,1,1),new V(.02,.02,.02),B.Animation.ANIMATIONLOOPMODE_CONSTANT,null,()=>target.root.setEnabled(false))}
  updateHealthBar(target);
  renderUI();refreshHighlights();
}

async function basicHeroAttack(target){if(busy||turn!=='player'||!selected||selected.acted||!canAttack(selected,target))return;busy=true;refreshHighlights();await attack(selected,target);busy=false;renderUI();refreshHighlights()}

async function useAbility(){
  if(!selected||busy||turn!=='player'||selected.abilityUsed)return;
  if(abilityMode){abilityMode=false;renderUI();refreshHighlights();return}
  if(selected.type==='scout'){selected.moveLeft+=3;selected.abilityUsed=true;showToast('PHASE DASH · +3 MOVEMENT');tone(780,.15,'sine')}
  else if(selected.type==='guard'){selected.shield+=5;selected.abilityUsed=true;showToast('AEGIS SHELL · 5 SHIELD');tone(290,.18,'triangle')}
  else if(selected.type==='medic'){
    const wounded=heroes.filter(hero=>hero.alive&&hero.hp<hero.maxHp).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];if(!wounded){showToast('ALL ALIENS ARE AT FULL HEALTH');return}
    wounded.hp=Math.min(wounded.maxHp,wounded.hp+4);selected.abilityUsed=true;selected.acted=true;showToast(`MEND SPORES · ${wounded.name} RESTORED`);setRoll('+4 HEALTH');tone(520,.22,'sine');pulseUnit(wounded,'#ff8bdc');
  }else{abilityMode=true;showToast(`SELECT A TARGET FOR ${selected.ability}`)}
  renderUI();refreshHighlights();
}

async function useTargetAbility(target){
  if(!abilityMode||!selected||!canAbilityTarget(selected,target)||busy)return;busy=true;abilityMode=false;selected.abilityUsed=true;selected.acted=true;refreshHighlights();
  if(selected.type==='grenadier'){
    await launchEffect(selected,target,selected.color);const victims=enemies.filter(enemy=>enemy.alive&&distance(enemy,target)<=1);setRoll(`ACID NOVA · ${victims.length} TARGET${victims.length===1?'':'S'}`);for(const victim of victims)await damageUnit(victim,3);showToast('ACID NOVA DETONATED');tone(115,.3,'sawtooth');
  }else{
    await launchEffect(selected,target,selected.color);await damageUnit(target,2);if(target.alive)target.stunned=1;setRoll('MIND RIFT · ENEMY STUNNED');showToast(`${target.name} WILL MISS ITS NEXT TURN`);tone(240,.3,'sine');
  }
  busy=false;renderUI();refreshHighlights();checkBattle();
}

function pulseUnit(unit,color){const ring=B.MeshBuilder.CreateTorus('ability pulse',{diameter:.9,thickness:.05,tessellation:24},scene);ring.position=unit.root.position.add(new V(0,.3,0));ring.material=standard(`ability pulse ${Math.random()}`,color,color);ring.isPickable=false;const start=performance.now(),observer=scene.onBeforeRenderObservable.add(()=>{const t=(performance.now()-start)/600;ring.scaling.setAll(1+t*2);ring.visibility=1-t;if(t>=1){scene.onBeforeRenderObservable.remove(observer);ring.dispose()}})}

function findEnemyPath(unit,target){
  const blocked=occupied(unit),startKey=key(unit.x,unit.z),seen=new Map([[startKey,{parent:null,x:unit.x,z:unit.z}]]),queue=[[unit.x,unit.z]],goals=[];
  while(queue.length){const [x,z]=queue.shift(),nodeKey=key(x,z),candidate={x,z};if(nodeKey!==startKey&&distance(candidate,target)<=unit.range&&(unit.range<=1||hasLineOfSight(candidate,target)))goals.push(nodeKey);for(const [nx,nz] of neighbours(x,z)){const nk=key(nx,nz);if(seen.has(nk)||blocked.has(nk))continue;seen.set(nk,{parent:nodeKey,x:nx,z:nz});queue.push([nx,nz])}if(goals.length)break}
  return goals.length?pathFromMap(seen,goals[0]):[];
}

async function enemyTurn(){
  if(busy||turn!=='player'||!started)return;busy=true;turn='enemy';selected=null;abilityMode=false;renderUI();refreshHighlights();showToast('SOLAR DOMINION TURN');await wait(500);
  for(const enemy of enemies.filter(unit=>unit.alive)){
    if(!heroes.some(hero=>hero.alive))break;outline(enemy,'#ff536a',.07);
    if(enemy.stunned){enemy.stunned=0;showToast(`${enemy.name} IS STUNNED`);setRoll('MIND RIFT CANCELLED ACTION');await wait(650);clearOutlines();continue}
    if(enemy.type==='fieldmedic'){
      const wounded=enemies.filter(unit=>unit.alive&&unit.hp<unit.maxHp).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];if(wounded&&distance(enemy,wounded)<=4){wounded.hp=Math.min(wounded.maxHp,wounded.hp+3);showToast(`FIELD MEDIC RESTORED ${wounded.name}`);setRoll('+3 HUMAN HEALTH');pulseUnit(wounded,'#8fd9ff');await wait(650);clearOutlines();renderUI();continue}
    }
    let target=heroes.filter(hero=>hero.alive).sort((a,b)=>distance(enemy,a)-distance(enemy,b))[0];
    if(!canAttack(enemy,target)){const path=findEnemyPath(enemy,target).slice(0,enemy.move);if(path.length)await moveAlong(enemy,path)}
    target=heroes.filter(hero=>hero.alive).sort((a,b)=>distance(enemy,a)-distance(enemy,b))[0];if(target&&canAttack(enemy,target))await attack(enemy,target,{free:true});else{showToast(`${enemy.name} ADVANCED`);setRoll('DOMINION REPOSITIONED')}
    clearOutlines();await wait(420);if(checkBattle())break;
  }
  if(!checkBattle())startPlayerRound();busy=false;
}

function startPlayerRound(){turn='player';round++;if(selectedMission==='survival'&&round>6){finish(true);return}for(const hero of heroes.filter(unit=>unit.alive)){hero.moveLeft=hero.move;hero.acted=false;hero.abilityUsed=false;hero.shield=0}selected=heroes.find(hero=>hero.alive)||null;showToast(`ALIEN TURN · ROUND ${round}`);setRoll('FLUX DIE READY');renderUI();refreshHighlights()}

function checkBattle(){
  if(turn==='ended')return true;
  const missionWon=selectedMission==='commander'?!enemies.find(unit=>unit.type==='commander')?.alive:selectedMission==='survival'?round>6:!enemies.some(unit=>unit.alive);
  if(started&&missionWon){finish(true);return true}
  if(started&&!heroes.some(unit=>unit.alive)){finish(false);return true}
  return false;
}
function finish(win){started=false;turn='ended';busy=false;clearOutlines();selectionRing.setEnabled(false);const survivors=heroes.filter(hero=>hero.alive).length;if(win){const base=selectedMission==='survival'?130000:selectedMission==='commander'?115000:100000,score=Math.round((base-round*1000+survivors*5000)*DIFFICULTIES[selectedDifficulty].score);window.DanArcadeScores?.record('voidbound.html',score,`${MISSIONS[selectedMission].label} · ROUND ${round} · ${survivors}/5`,DIFFICULTIES[selectedDifficulty].label);arcadeFx()?.play('cheer',{volume:.32,duration:2.8});arcadeFx()?.hit(canvas,'#caff68',1)}else{arcadeFx()?.play('metal',{volume:.34,rate:.58});arcadeFx()?.shake(canvas,.8)}menu.querySelector('h1').innerHTML=win?'MISSION COMPLETE<br><span>ALIENS VICTORIOUS</span>':'SQUAD LOST<br><span>THE BREACH FAILED</span>';menu.querySelector('p').textContent=win?`${MISSIONS[selectedMission].label} complete. ${survivors} alien specialists survived the operation.`:'The Solar Dominion eliminated the alien squad. Rebuild your tactics and try the breach again.';document.querySelector('#start').textContent=win?'PLAY AGAIN':'RETRY MISSION';document.querySelector('#start').onclick=()=>location.reload();menu.classList.remove('hidden');renderUI()}

function renderUI(){
  phaseEl.textContent=turn==='player'?'ALIEN TURN':turn==='enemy'?'HUMAN TURN':'MISSION COMPLETE';roundEl.textContent=`ROUND ${round}`;hostilesEl.textContent=selectedMission==='survival'?`${Math.max(0,7-round)} ROUNDS TO HOLD`:selectedMission==='commander'?(enemies.find(unit=>unit.type==='commander')?.alive?'COMMANDER ACTIVE':'COMMANDER DOWN'):`${enemies.filter(unit=>unit.alive).length} HOSTILES`;
  squadEl.innerHTML=heroes.map(hero=>`<button class="hero-card${selected===hero?' selected':''}${hero.acted&&hero.moveLeft===0?' done':''}${!hero.alive?' dead':''}" data-hero="${hero.id}" style="--hero:${hero.color}" ${!hero.alive?'disabled':''}><span class="portrait">${hero.name[0]}</span><span><b>${hero.name}</b><small>${hero.role}</small></span><em>${hero.hp}/${hero.maxHp}${hero.shield?` +${hero.shield}`:''}</em></button>`).join('');
  squadEl.querySelectorAll('[data-hero]').forEach(button=>button.onclick=()=>selectHero(heroes.find(hero=>hero.id===button.dataset.hero)));
  if(selected?.alive){unitRole.textContent=selected.role;unitName.textContent=selected.name;unitStats.textContent=`HP ${selected.hp}/${selected.maxHp}${selected.shield?` · SHIELD ${selected.shield}`:''}${inCover(selected)?' · COVER':''} · MOVE ${selected.moveLeft} · RANGE ${selected.range} · ${selected.acted?'ATTACK USED':'ATTACK READY'}`;abilityButton.textContent=abilityMode?`CANCEL ${selected.ability}`:selected.ability;abilityButton.disabled=turn!=='player'||busy||selected.abilityUsed;abilityButton.classList.toggle('targeting',abilityMode)}else{unitRole.textContent='SELECT A HERO';unitName.textContent='YOUR SQUAD IS READY';unitStats.textContent='Tap a miniature or character card.';abilityButton.textContent='SPECIAL ABILITY';abilityButton.disabled=true;abilityButton.classList.remove('targeting')}
  endTurnButton.disabled=turn!=='player'||busy||!started;
  hintEl.textContent=turn==='enemy'?'The Solar Dominion is moving its miniatures.':abilityMode?`Choose a glowing enemy for ${selected.ability}.`:selected?'Green signals show movement. Red outlines show attackable enemies.':'Select an alien hero, then choose a glowing tile or enemy.';
  enemyIntentsEl.innerHTML=enemies.filter(enemy=>enemy.alive).map(enemy=>`<div class="enemy-intent" style="--intent:${enemy.color}"><i></i><div><b>${enemy.name}</b><span>${enemyIntent(enemy)}</span></div></div>`).join('')||'<div class="enemy-intent" style="--intent:#72ffe0"><i></i><div><b>SECTOR CLEAR</b></div></div>';
}

function showToast(text){toastEl.textContent=text;toastEl.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toastEl.classList.remove('show'),1200)}
function tone(frequency=.1,duration=.1,type='sine'){try{const ac=tone.ac||=new(window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();if(!tone.effects){tone.master=ac.createGain();tone.master.gain.value=1.2;tone.compressor=ac.createDynamicsCompressor();tone.compressor.threshold.value=-18;tone.compressor.knee.value=22;tone.compressor.ratio.value=6;tone.compressor.attack.value=.004;tone.compressor.release.value=.24;tone.effects=ac.createGain();tone.effects.gain.value=2.8;tone.effects.connect(tone.compressor);tone.compressor.connect(tone.master);tone.master.connect(ac.destination)}const osc=ac.createOscillator(),gain=ac.createGain(),now=ac.currentTime;osc.type=type;osc.frequency.setValueAtTime(frequency,now);osc.frequency.exponentialRampToValueAtTime(Math.max(40,frequency*.65),now+duration);gain.gain.setValueAtTime(.035,now);gain.gain.exponentialRampToValueAtTime(.001,now+duration);osc.connect(gain);gain.connect(tone.effects);osc.start(now);osc.stop(now+duration+.02)}catch{}}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function handlePick(clientX,clientY){
  if(!started||busy)return;const pick=scene.pick(clientX,clientY);if(!pick?.hit)return;const unit=pick.pickedMesh.metadata?.unit,tile=pick.pickedMesh.metadata?.tile;
  if(unit?.team==='hero')selectHero(unit);else if(unit?.team==='enemy'){if(abilityMode)useTargetAbility(unit);else basicHeroAttack(unit)}else if(tile)moveSelected(tile.x,tile.z);
}
function chooseOption(attribute,value){document.querySelectorAll(`[data-${attribute}]`).forEach(button=>{const active=button.dataset[attribute]===value;button.classList.toggle('selected',active);button.setAttribute('aria-pressed',String(active))})}
function prepareMission(){
  const difficulty=DIFFICULTIES[selectedDifficulty];
  enemies.forEach(enemy=>{const base=ENEMY_DEFS.find(def=>def.id===enemy.id);enemy.maxHp=Math.max(1,Math.round(base.hp*difficulty.hp));enemy.hp=enemy.maxHp;enemy.damage=base.damage+difficulty.damage;enemy.shield=base.shield||0;updateHealthBar(enemy)});
  hintEl.textContent=MISSIONS[selectedMission].objective;hostilesEl.textContent=selectedMission==='survival'?'SURVIVE 6 ROUNDS':selectedMission==='commander'?'COMMANDER TARGET':'5 HOSTILES';
}

buildScene();renderUI();refreshHighlights();engine.runRenderLoop(()=>scene.render());addEventListener('resize',()=>engine.resize());
canvas.addEventListener('pointerdown',event=>pointerStart={x:event.clientX,y:event.clientY,time:performance.now()});
canvas.addEventListener('pointerup',event=>{if(pointerStart&&Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)<7&&performance.now()-pointerStart.time<520)handlePick(event.clientX,event.clientY);pointerStart=null});
abilityButton.onclick=useAbility;endTurnButton.onclick=enemyTurn;
document.querySelectorAll('[data-mission]').forEach(button=>button.onclick=()=>{selectedMission=button.dataset.mission;chooseOption('mission',selectedMission)});
document.querySelectorAll('[data-difficulty]').forEach(button=>button.onclick=()=>{selectedDifficulty=button.dataset.difficulty;chooseOption('difficulty',selectedDifficulty)});
document.querySelector('#start').onclick=()=>{prepareMission();started=true;menu.classList.add('hidden');selected=heroes[0];showToast(`${MISSIONS[selectedMission].label} · ${DIFFICULTIES[selectedDifficulty].label}`);setRoll(MISSIONS[selectedMission].objective.toUpperCase());tone(520,.2,'sine');renderUI();refreshHighlights()};
})();
