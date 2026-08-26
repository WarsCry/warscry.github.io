(()=>{
const canvas=document.querySelector('#game'),menu=document.querySelector('#menu'),msg=document.querySelector('#msg');
const healthText=document.querySelector('#health'),healthBar=document.querySelector('#healthBar'),ammoText=document.querySelector('#ammo'),leftText=document.querySelector('#left'),deckText=document.querySelector('#deckName');
const hitMarker=document.querySelector('#hitMarker'),damage=document.querySelector('#damage'),muzzle=document.querySelector('#muzzle'),weapon=document.querySelector('#weapon');
if(!window.BABYLON){menu.querySelector('p').textContent='The 3D engine could not load. Check your connection and reload the mission.';return}

const engine=new BABYLON.Engine(canvas,true,{preserveDrawingBuffer:false,stencil:true,adaptToDeviceRatio:true});
if(matchMedia('(pointer:coarse)').matches)engine.setHardwareScalingLevel(Math.min(1.35,Math.max(1,devicePixelRatio*.45)));
let scene,camera,core,coreLight,ambientLight,shadowGenerator,enemies=[],projectiles=[],specimens=[],interactiveNeons=[],brokenNeons=new Set(),started=false,health=100,ammo=40,kills=0,lastShot=0,aiming=false,sprinting=false,moveVector={x:0,y:0},turnDirection=0,currentLevel=1,pendingLevel=1,levelStartedAt=0;
const V=BABYLON.Vector3,C=BABYLON.Color3;
const WALK_SPEED=.42,BOOST_SPEED=WALK_SPEED*1.25,BASE_FOV=.92,AIM_FOV=.58,BOOST_FOV=1.03,HULL_LIMIT=34;
const audioState={ac:null,master:null,compressor:null,music:null,enemies:null,effects:null,running:false,timer:null,drones:[],beat:0,danger:.2,lastVoice:0,lastStep:0};
const DIFFICULTIES={beginner:{label:'BEGINNER',description:'More plasma, lighter enemy armour and slower, gentler attacks.',enemyHealth:.72,enemySpeed:.84,damage:.62,fireDelay:1.38,projectileTime:1.2,ammo:1.28},novice:{label:'NOVICE',description:'Balanced armour, enemy speed and fire pressure.',enemyHealth:1,enemySpeed:1,damage:1,fireDelay:1,projectileTime:1,ammo:1},pro:{label:'PRO',description:'Tougher armour, quicker soldiers and much heavier fire pressure.',enemyHealth:1.34,enemySpeed:1.16,damage:1.3,fireDelay:.78,projectileTime:.82,ammo:.9}};
let selectedDifficulty='novice';
const deckNodes={1:[],2:[],3:[],4:[],5:[]};
const LEVELS={
  1:{deck:'07',name:'DECK 07 · BIO-CORE ATRIUM',brief:'Secure the outer atrium and learn the ship’s defence systems.',ammo:42,spawn:[0,2,29],rotation:Math.PI,positions:[[-26,-18],[-14,-28],[0,-30],[14,-27],[26,-17],[-27,-5]],hp:74,eliteHp:96,eliteFrom:99,speed:.66,speedRange:.14,fireRange:16,fireMin:1.05,fireRangeDelay:.85,boltMin:4,boltRange:4,boltDuration:650,coreDamage:7,coreCooldown:1.4,grace:4.5,fog:'#050e12',fogDensity:.008,clear:[.006,.012,.025],light:[.42,.58,.66],ground:[.08,.12,.16],core:[.3,1,.78]},
  2:{deck:'08',name:'DECK 08 · REACTOR LABYRINTH',brief:'A measured Dominion squad is entering the expanded reactor maze. No attacker begins behind your deployment point.',ammo:50,spawn:[0,2,29],rotation:Math.PI,positions:[[-27,-18],[-15,-28],[0,-30],[15,-27],[27,-17],[-27,-3],[22,7]],hp:88,eliteHp:112,eliteFrom:99,speed:.74,speedRange:.15,fireRange:17,fireMin:1.05,fireRangeDelay:.8,boltMin:4,boltRange:4,boltDuration:620,coreDamage:7,coreCooldown:1.25,grace:5,fog:'#170817',fogDensity:.009,clear:[.03,.006,.025],light:[.65,.34,.5],ground:[.16,.035,.08],core:[.75,.28,.58]},
  3:{deck:'09',name:'DECK 09 · HYDROPONICS RING',brief:'Fight through the living greenhouse deck, using growth tanks and bio-columns as cover.',ammo:62,spawn:[0,2,29],rotation:Math.PI,positions:[[-28,-19],[-18,-29],[-4,-31],[11,-30],[26,-21],[29,-5],[-28,2],[-20,16],[20,13]],hp:98,eliteHp:126,eliteFrom:8,speed:.8,speedRange:.17,fireRange:19,fireMin:.9,fireRangeDelay:.72,boltMin:5,boltRange:4,boltDuration:570,coreDamage:8,coreCooldown:1.1,grace:4.5,fog:'#041a18',fogDensity:.0085,clear:[.004,.025,.022],light:[.34,.68,.55],ground:[.035,.16,.11],core:[.35,1,.55]},
  4:{deck:'10',name:'DECK 10 · NAVIGATION VAULT',brief:'The Dominion vanguard has reached the star-map vault. Use the consoles, pylons and curved partitions to break their fire lines.',ammo:74,spawn:[0,2,29],rotation:Math.PI,positions:[[-29,-18],[-19,-29],[-6,-31],[8,-31],[22,-27],[30,-12],[28,7],[-29,3],[-24,18],[23,18]],hp:110,eliteHp:142,eliteFrom:7,speed:.88,speedRange:.2,fireRange:22,fireMin:.78,fireRangeDelay:.64,boltMin:6,boltRange:4,boltDuration:520,coreDamage:9,coreCooldown:1,grace:4,fog:'#070d22',fogDensity:.0095,clear:[.006,.01,.035],light:[.34,.48,.78],ground:[.06,.08,.19],core:[.36,.55,1]},
  5:{deck:'11',name:'DECK 11 · COMMAND NEXUS',brief:'Final mission: enter the command nexus and defeat the Dominion Overseer. The arena has multiple cover positions—hide, move and choose your shots.',ammo:72,spawn:[0,2,30],rotation:Math.PI,positions:[[0,-19]],boss:true,bossHp:900,hp:900,eliteHp:900,eliteFrom:0,speed:1.02,speedRange:0,fireRange:48,fireMin:1.12,fireRangeDelay:.55,boltMin:6,boltRange:4,boltDuration:700,coreDamage:0,coreCooldown:2,grace:5.5,fog:'#13070a',fogDensity:.007,clear:[.025,.004,.006],light:[.68,.28,.24],ground:[.18,.035,.025],core:[1,.35,.22]}
};

function material(name,diffuse,emissive=null,alpha=1){const m=new BABYLON.StandardMaterial(name,scene);m.diffuseColor=C.FromHexString(diffuse);m.specularColor=new C(.65,.75,.82);m.specularPower=96;m.alpha=alpha;if(emissive)m.emissiveColor=C.FromHexString(emissive);return m}
function pbr(name,color,metallic=.65,roughness=.42,emissive=null){const m=new BABYLON.PBRMaterial(name,scene);m.albedoColor=C.FromHexString(color);m.metallic=metallic;m.roughness=roughness;m.environmentIntensity=.7;if(emissive)m.emissiveColor=C.FromHexString(emissive);return m}
function texturedMaterial(name,url,uScale,vScale){const m=material(name,'#b9c2c8');const texture=new BABYLON.Texture(url,scene);texture.uScale=uScale;texture.vScale=vScale;texture.anisotropicFilteringLevel=16;m.diffuseTexture=texture;const bump=new BABYLON.Texture(url,scene);bump.uScale=uScale;bump.vScale=vScale;bump.anisotropicFilteringLevel=16;bump.level=.18;m.bumpTexture=bump;m.specularColor=new C(.36,.43,.48);m.specularPower=128;return m}
function proceduralFloorMaterial(name,variant=0){
  const m=material(name,'#ffffff'),texture=new BABYLON.DynamicTexture(`${name} surface`,{width:512,height:512},scene,false),ctx=texture.getContext(),palette=variant?['#172126','#253238','#303d42']:['#1d282d','#2c393e','#37454a'];
  ctx.fillStyle=palette[0];ctx.fillRect(0,0,512,512);
  for(let row=0;row<3;row++)for(let col=0;col<3;col++){
    const x=8+col*168,y=8+row*168,w=160,h=160,gradient=ctx.createLinearGradient(x,y,x+w,y+h);gradient.addColorStop(0,palette[2]);gradient.addColorStop(.42,palette[1]);gradient.addColorStop(1,palette[0]);ctx.fillStyle=gradient;ctx.fillRect(x,y,w,h);
    ctx.strokeStyle=variant?'#526269':'#64757a';ctx.lineWidth=3;ctx.strokeRect(x+1.5,y+1.5,w-3,h-3);ctx.strokeStyle='#0a1014';ctx.lineWidth=5;ctx.strokeRect(x+8,y+8,w-16,h-16);
    ctx.fillStyle='#839398';for(const [bx,by] of [[x+16,y+16],[x+w-16,y+16],[x+16,y+h-16],[x+w-16,y+h-16]]){ctx.beginPath();ctx.arc(bx,by,3.2,0,Math.PI*2);ctx.fill()}
    if((row+col+variant)%3===0){ctx.fillStyle='#080d11';ctx.fillRect(x+42,y+65,76,34);ctx.fillStyle='#405157';for(let slit=0;slit<5;slit++)ctx.fillRect(x+49,y+70+slit*5.2,62,2)}
    else{ctx.strokeStyle='#182329';ctx.lineWidth=2;for(let line=0;line<3;line++){ctx.beginPath();ctx.moveTo(x+35+line*13,y+54);ctx.lineTo(x+92+line*11,y+111);ctx.stroke()}}
    ctx.fillStyle=(row+col+variant)%4===0?'#24766e':'#39494e';ctx.fillRect(x+20,y+h-24,32,4);
  }
  ctx.globalAlpha=.28;ctx.strokeStyle='#a8b7b9';ctx.lineWidth=1;for(let i=0;i<22;i++){const sx=(i*83+variant*29)%500,sy=(i*137+variant*47)%500;ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(Math.min(512,sx+18+(i%5)*7),Math.min(512,sy+3+(i%3)*4));ctx.stroke()}ctx.globalAlpha=1;
  texture.anisotropicFilteringLevel=16;texture.update(false);m.diffuseTexture=texture;m.diffuseColor=C.FromHexString(variant?'#a0aaad':'#b1babc');m.emissiveColor=new C(.015,.02,.021);m.specularColor=new C(.45,.52,.55);m.specularPower=140;return m;
}
function box(name,size,pos,mat,collision=false){const mesh=BABYLON.MeshBuilder.CreateBox(name,size,scene);mesh.position.copyFrom(pos);mesh.material=mat;mesh.checkCollisions=collision;return mesh}
function onDeck(level,node){deckNodes[level].push(node);return node}
function angleDistance(a,b){return Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)))}
function createBabyAlienSpecimen(x,z,index,angle,skin,belly,eyes,cordMaterial){
  const root=onDeck(3,new BABYLON.TransformNode(`sleeping baby alien specimen ${index}`,scene));root.position=new V(x,2.05,z);root.rotation.y=angle+Math.PI;
  const parts=[];function babyPart(mesh,mat){mesh.parent=root;mesh.material=mat;mesh.isPickable=false;parts.push(mesh);return mesh}
  const body=babyPart(BABYLON.MeshBuilder.CreateCapsule('tiny curled alien body',{height:.82,radius:.22,tessellation:10,subdivisions:3},scene),belly);body.position.y=-.2;body.rotation.x=-.28;
  const head=babyPart(BABYLON.MeshBuilder.CreateSphere('oversized baby alien head',{diameter:.72,segments:16},scene),skin);head.position.y=.38;head.scaling=new V(1.18,.9,.92);
  for(const side of [-1,1]){const eye=babyPart(BABYLON.MeshBuilder.CreateSphere('sleeping luminous eye',{diameter:.15,segments:10},scene),eyes);eye.position=new V(side*.16,.39,.3);eye.scaling=new V(1.25,.34,.25);const horn=babyPart(BABYLON.MeshBuilder.CreateCylinder('soft infant antenna',{height:.28,diameterTop:.02,diameterBottom:.1,tessellation:8},scene),skin);horn.position=new V(side*.21,.78,0);horn.rotation.z=side*.28}
  for(const side of [-1,1]){const arm=babyPart(BABYLON.MeshBuilder.CreateCapsule('curled infant arm',{height:.4,radius:.065,tessellation:8},scene),skin);arm.position=new V(side*.25,-.05,.05);arm.rotation.z=side*.92;arm.rotation.x=.35;const leg=babyPart(BABYLON.MeshBuilder.CreateCapsule('curled infant leg',{height:.47,radius:.08,tessellation:8},scene),skin);leg.position=new V(side*.15,-.52,.04);leg.rotation.z=side*.55;leg.rotation.x=-.6}
  const cord=babyPart(BABYLON.MeshBuilder.CreateTube('gentle nutrient cord',{path:[new V(0,-.5,-.08),new V(.27,-.78,-.18),new V(.16,-1.16,-.24),new V(0,-1.42,-.2)],radius:.025,tessellation:8},scene),cordMaterial);
  const bubbles=[];for(let bubbleIndex=0;bubbleIndex<5;bubbleIndex++){const bubble=babyPart(BABYLON.MeshBuilder.CreateSphere('nutrient bubble',{diameter:.055+bubbleIndex*.012,segments:6},scene),eyes);bubble.position=new V((bubbleIndex%2?-.36:.34)+index%3*.025,-1.25+bubbleIndex*.53,(bubbleIndex%3-.8)*.25);bubble.visibility=.56;bubbles.push(bubble)}
  specimens.push({root,baseY:2.05,baseRotation:angle+Math.PI,phase:index*.82,bubbles});
}

function buildScene(){
  scene=new BABYLON.Scene(engine);scene.clearColor=new BABYLON.Color4(.006,.012,.025,1);scene.collisionsEnabled=true;
  scene.fogMode=BABYLON.Scene.FOGMODE_EXP2;scene.fogDensity=.0045;scene.fogColor=new C(.018,.055,.07);
  camera=new BABYLON.UniversalCamera('sentinel',new V(0,2,29),scene);camera.minZ=.08;camera.maxZ=125;camera.fov=BASE_FOV;camera.speed=WALK_SPEED;camera.angularSensibility=2900;camera.inertia=.55;camera.ellipsoid=new V(.55,1,.55);camera.checkCollisions=true;
  camera.keysUp=[87];camera.keysDown=[83];camera.keysLeft=[65];camera.keysRight=[68];camera.attachControl(canvas,true);
  ambientLight=new BABYLON.HemisphericLight('ship ambience',new V(0,1,0),scene);ambientLight.intensity=.54;ambientLight.diffuse=new C(.42,.58,.66);ambientLight.groundColor=new C(.08,.12,.16);
  coreLight=new BABYLON.PointLight('core light',new V(0,4,0),scene);coreLight.diffuse=new C(.3,1,.78);coreLight.intensity=1.35;coreLight.range=34;
  const combatLight=new BABYLON.DirectionalLight('combat shadows',new V(-.45,-1,.25),scene);combatLight.position=new V(12,18,-8);combatLight.intensity=.42;shadowGenerator=new BABYLON.ShadowGenerator(1024,combatLight);shadowGenerator.useBlurExponentialShadowMap=true;shadowGenerator.blurKernel=24;
  const glow=new BABYLON.GlowLayer('neon bloom',scene,{blurKernelSize:24});glow.intensity=.27;
  const pipeline=new BABYLON.DefaultRenderingPipeline('clear ship pipeline',true,scene,[camera]);pipeline.fxaaEnabled=true;pipeline.samples=matchMedia('(pointer:coarse)').matches?1:4;pipeline.bloomEnabled=!matchMedia('(pointer:coarse)').matches;pipeline.bloomThreshold=.94;pipeline.bloomWeight=.045;pipeline.bloomScale=.55;pipeline.sharpenEnabled=true;pipeline.sharpen.edgeAmount=.22;pipeline.sharpen.colorAmount=.85;pipeline.imageProcessing.contrast=1.1;pipeline.imageProcessing.exposure=1.04;

  const hull=texturedMaterial('curved premium hull','assets/textures/starfall-bulkhead-v2.webp',3.6,2.1),innerHull=texturedMaterial('inner premium hull panels','assets/textures/starfall-bulkhead-v2.webp',1.08,1.45),metal=texturedMaterial('modular alien deck plating','assets/textures/starfall-deck-v2.webp',1.16,1.16),metalAlt=texturedMaterial('alternate holographic deck plating','assets/textures/starfall-deck-v2.webp',1.32,1.32),ceilingPanels=texturedMaterial('recessed ventilation ceiling armour','assets/textures/starfall-ceiling-v2.webp',3.2,3.2),machinerySkin=texturedMaterial('living machinery panel skin','assets/textures/starfall-living-machinery-v2.webp',1.05,1.15),metal2=texturedMaterial('lower deck armour','assets/textures/starfall-deck-v2.webp',5.8,5.8);hull.diffuseColor=C.FromHexString('#879a9d');innerHull.diffuseColor=C.FromHexString('#74898b');metal.diffuseColor=C.FromHexString('#a2aaac');metalAlt.diffuseColor=C.FromHexString('#6e8687');ceilingPanels.diffuseColor=C.FromHexString('#87979b');machinerySkin.diffuseColor=C.FromHexString('#6b806a');metal2.diffuseColor=C.FromHexString('#303b3d');
  const trim=material('alien trim','#123f3a','#075044'),purple=material('veyran alloy','#2d1750','#16052f');
  const dangerMat=material('warning light','#481824','#b4193f'),glass=material('observation glass','#07182b','#073e58',.72);

  const wall=BABYLON.MeshBuilder.CreateCylinder('rounded outer hull',{height:10,diameter:72,tessellation:80,cap:BABYLON.Mesh.NO_CAP},scene);wall.position.y=5;wall.material=hull;wall.material.backFaceCulling=false;wall.checkCollisions=true;
  const ceiling=BABYLON.MeshBuilder.CreateCylinder('armoured ceiling',{height:.35,diameter:72,tessellation:80},scene);ceiling.position.y=10;ceiling.material=ceilingPanels;
  const base=BABYLON.MeshBuilder.CreateCylinder('lower hull',{height:.38,diameter:72,tessellation:80},scene);base.position.y=-.22;base.material=metal2;base.checkCollisions=true;

  for(let x=-30;x<=30;x+=6)for(let z=-30;z<=30;z+=6)if(Math.hypot(x,z)<32.8){
    const alternate=Math.abs(x/6+z/6)%2===1,panel=box('fixed deck panel',{width:5.72,height:.16,depth:5.72},new V(x,.02,z),alternate?metalAlt:metal,true);panel.rotation.y=alternate?Math.PI/2:0;panel.receiveShadows=true;
  }
  for(let i=0;i<32;i++){
    const a=i*Math.PI*2/32,r=35.25,rib=box('curved bulkhead rib',{width:.48,height:8.9,depth:1.05},new V(Math.sin(a)*r,4.7,Math.cos(a)*r),i%8===0?purple:trim,true);rib.rotation.y=a;rib.isPickable=false;
    const lamp=box('rib lamp',{width:.13,height:3.4,depth:1.12},new V(Math.sin(a)*34.68,5.15,Math.cos(a)*34.68),i%4===0?dangerMat:trim);lamp.rotation.y=a;lamp.isPickable=false;
  }
  const boundaryMaterial=material('invisible hull safety','#000000',null,0);boundaryMaterial.disableColorWrite=true;
  for(let i=0;i<36;i++){const a=i*Math.PI*2/36,r=34.42,barrier=box('inner hull collision barrier',{width:6.15,height:11.5,depth:.82},new V(Math.sin(a)*r,5.25,Math.cos(a)*r),boundaryMaterial,true);barrier.rotation.y=a;barrier.visibility=0;barrier.isPickable=false}
  for(const diameter of [20,40,61]){const rail=BABYLON.MeshBuilder.CreateTorus('recessed ceiling rail',{diameter,thickness:.13,tessellation:88},scene);rail.position.y=9.57;rail.material=trim;rail.isPickable=false}
  for(let i=0;i<12;i++){
    const a=i*Math.PI*2/12,r=22,beam=box('radial ceiling armour',{width:.66,height:.32,depth:23},new V(Math.sin(a)*r,9.55,Math.cos(a)*r),ceilingPanels);beam.rotation.y=a;beam.isPickable=false;
    const lamp=box('overhead navigation light',{width:4.8,height:.12,depth:.26},new V(Math.sin(a)*27.5,9.32,Math.cos(a)*27.5),i%3===0?dangerMat:trim);lamp.rotation.y=a;lamp.isPickable=false;
  }
  const ceilingHub=BABYLON.MeshBuilder.CreateTorus('ceiling core aperture',{diameter:9.2,thickness:.45,tessellation:48},scene);ceilingHub.position.y=9.5;ceilingHub.material=purple;ceilingHub.isPickable=false;
  // A circular inner bulkhead turns the arena into an outer passage and a protected core chamber.
  // Four wide gates keep navigation readable while removing the empty-room feeling.
  for(let i=0;i<48;i++){
    const a=i*Math.PI*2/48,gateDistance=Math.min(...[0,Math.PI/2,Math.PI,Math.PI*1.5,Math.PI*2].map(g=>Math.abs(a-g)));
    if(gateDistance<.2)continue;
    const r=9.7,section=onDeck(1,box('inner curved bulkhead',{width:1.32,height:5.15,depth:.72},new V(Math.sin(a)*r,2.575,Math.cos(a)*r),innerHull,true));section.rotation.y=a;section.isPickable=true;
    if(i%4===0){const inset=onDeck(1,box('bulkhead inset',{width:.62,height:3.8,depth:.08},new V(Math.sin(a)*9.3,3.1,Math.cos(a)*9.3),i%8===0?purple:trim));inset.rotation.y=a;inset.isPickable=false}
  }
  for(const [x,z] of [[-2.75,9.65],[2.75,9.65],[-2.75,-9.65],[2.75,-9.65],[9.65,-2.75],[9.65,2.75],[-9.65,-2.75],[-9.65,2.75]]){
    const column=onDeck(1,BABYLON.MeshBuilder.CreateCylinder('rounded gate column',{height:6.4,diameter:1.05,tessellation:20},scene));column.position=new V(x,3.2,z);column.material=purple;column.checkCollisions=true;
    const beacon=onDeck(1,BABYLON.MeshBuilder.CreateSphere('gate beacon',{diameter:.3,segments:10},scene));beacon.position=new V(x,5.8,z);beacon.material=trim;beacon.isPickable=false;
  }
  for(const [x,z] of [[0,12],[12,0],[0,-12],[-12,0]]){const gateLight=onDeck(1,new BABYLON.PointLight('gate deck light',new V(x,2.2,z),scene));gateLight.diffuse=new C(.28,.75,.68);gateLight.intensity=.62;gateLight.range=12}
  for(const y of [.18,8.85]){const ring=BABYLON.MeshBuilder.CreateTorus('hull light ring',{diameter:69.2,thickness:.1,tessellation:88},scene);ring.position.y=y;ring.material=trim;ring.isPickable=false}

  for(const z of [-19,19])for(const x of [-19,19]){
    const pod=onDeck(1,BABYLON.MeshBuilder.CreateCylinder('curved machinery pod',{height:3.2,diameter:3.8,tessellation:20},scene));pod.position=new V(x,1.6,z);pod.material=purple;pod.checkCollisions=true;
    const cap=onDeck(1,BABYLON.MeshBuilder.CreateSphere('pod glow',{diameter:1.15,segments:16},scene));cap.position=new V(x,3.05,z);cap.material=trim;cap.isPickable=false;
    for(let j=-1;j<=1;j++){const pipe=onDeck(1,BABYLON.MeshBuilder.CreateTube('bio conduit',{path:[new V(x+j*.5,3.2,z),new V(x+j*.5,6.8,z),new V(x+j*.8,8.5,z*.86)],radius:.09,tessellation:8},scene));pipe.material=trim;pipe.isPickable=false}
  }
  for(const z of [-34.55,34.55]){
    const door=box('rounded blast door',{width:7.5,height:6.6,depth:.35},new V(0,3.3,z),machinerySkin,true);
    const top=BABYLON.MeshBuilder.CreateTorus('door arch',{diameter:7.5,thickness:.38,tessellation:32,arc:.5},scene);top.position=new V(0,5.9,z+(z>0?-.22:.22));top.rotation.x=Math.PI/2;top.material=trim;top.isPickable=false;
    for(const x of [-3.5,3.5])box('door light',{width:.18,height:5.4,depth:.48},new V(x,3,z+(z>0?-.25:.25)),dangerMat);
  }
  for(const a of [Math.PI/2,-Math.PI/2]){
    const pane=box('space window',{width:11,height:4.8,depth:.18},new V(Math.sin(a)*35.35,5,Math.cos(a)*35.35),glass);pane.rotation.y=a;pane.isPickable=false;
    for(let i=0;i<22;i++){const star=BABYLON.MeshBuilder.CreateSphere('distant star',{diameter:.04+Math.random()*.08,segments:4},scene);star.position=new V(Math.sin(a)*36.1+(Math.random()-.5)*.4,3+Math.random()*4,(Math.random()-.5)*10);star.material=material(`star${a}${i}`,'#ffffff','#bcecff');star.isPickable=false}
  }

  // Deck 08 is a concentric reactor labyrinth. Its offset gates force both the
  // player and the attackers to wind through a different map before reaching the core.
  const reactorHull=texturedMaterial('reactor armour','assets/textures/starfall-bulkhead-v2.webp',.72,1.3),reactorTrim=material('reactor trim','#5e173d','#d51d57'),reactorGlow=material('reactor energy','#ff8a38','#ff3f24'),reactorDark=pbr('reactor machinery','#130b1d',.8,.3);
  reactorHull.diffuseColor=C.FromHexString('#765b72');
  const outerGates=[Math.PI/4,Math.PI*3/4,Math.PI*5/4,Math.PI*7/4],innerGates=[0,Math.PI/2,Math.PI,Math.PI*3/2];
  function reactorRing(radius,count,gates,height,gap){
    const width=2*Math.PI*radius/count*.95;
    for(let i=0;i<count;i++){
      const a=i*Math.PI*2/count;if(gates.some(g=>angleDistance(a,g)<gap))continue;
      const section=onDeck(2,box('reactor labyrinth bulkhead',{width,height,depth:.72},new V(Math.sin(a)*radius,height/2,Math.cos(a)*radius),reactorHull,true));section.rotation.y=a;
      if(i%3===0){const strip=onDeck(2,box('reactor bulkhead pulse',{width:width*.55,height:2.5,depth:.075},new V(Math.sin(a)*(radius-.4),2.75,Math.cos(a)*(radius-.4)),i%6===0?reactorGlow:reactorTrim));strip.rotation.y=a;strip.isPickable=false}
    }
  }
  reactorRing(20.5,72,outerGates,4.15,.13);reactorRing(10.5,48,innerGates,5.35,.2);
  for(const radius of [20.85,10.85]){const floorRing=onDeck(2,BABYLON.MeshBuilder.CreateTorus('reactor floor circuit',{diameter:radius*2,thickness:.1,tessellation:80},scene));floorRing.position.y=.17;floorRing.material=reactorGlow;floorRing.isPickable=false}
  for(const a of outerGates){
    const channel=onDeck(2,box('reactor approach channel',{width:.16,height:.035,depth:9.5},new V(Math.sin(a)*25.2,.16,Math.cos(a)*25.2),reactorGlow));channel.rotation.y=a;channel.isPickable=false;
    for(const side of [-1,1]){
      const x=Math.sin(a)*20.5+Math.cos(a)*side*2.3,z=Math.cos(a)*20.5-Math.sin(a)*side*2.3;
      const pylon=onDeck(2,BABYLON.MeshBuilder.CreateCylinder('reactor gate pylon',{height:5.4,diameter:1.15,tessellation:18},scene));pylon.position=new V(x,2.7,z);pylon.material=reactorDark;pylon.checkCollisions=true;
      const crown=onDeck(2,BABYLON.MeshBuilder.CreateTorus('reactor gate crown',{diameter:1.25,thickness:.16,tessellation:20},scene));crown.position=new V(x,5.15,z);crown.material=reactorGlow;crown.isPickable=false;
    }
    const warningLight=onDeck(2,new BABYLON.PointLight('reactor warning light',new V(Math.sin(a)*18,3,Math.cos(a)*18),scene));warningLight.diffuse=new C(1,.18,.22);warningLight.intensity=.86;warningLight.range=13;
  }
  for(const a of innerGates){
    for(const side of [-1,1]){
      const x=Math.sin(a)*10.5+Math.cos(a)*side*2.2,z=Math.cos(a)*10.5-Math.sin(a)*side*2.2;
      const column=onDeck(2,BABYLON.MeshBuilder.CreateCylinder('inner reactor column',{height:6.2,diameter:.88,tessellation:16},scene));column.position=new V(x,3.1,z);column.material=reactorTrim;column.checkCollisions=true;
    }
  }
  for(const a of innerGates){
    const r=15.5,x=Math.sin(a)*r,z=Math.cos(a)*r;
    const reactor=onDeck(2,BABYLON.MeshBuilder.CreateCylinder('reactor capacitor',{height:4.4,diameter:2.35,tessellation:24},scene));reactor.position=new V(x,2.2,z);reactor.material=reactorDark;reactor.checkCollisions=true;
    for(const y of [.7,2.2,3.7]){const band=onDeck(2,BABYLON.MeshBuilder.CreateTorus('capacitor energy band',{diameter:2.45,thickness:.13,tessellation:28},scene));band.position=new V(x,y,z);band.material=reactorGlow;band.isPickable=false}
  }

  // Deck 09: a living hydroponics ring with rounded growth tanks, luminous
  // planters and overhead conduits. The gaps between clusters form broad lanes.
  const bioAlloy=texturedMaterial('hydroponics living alloy','assets/textures/starfall-living-machinery-v2.webp',.72,1.05),bioDark=pbr('hydroponics machinery','#071814',.72,.34),bioGlow=material('growth energy','#56ffc2','#19a86f'),bioGlass=material('nutrient glass','#173c42','#0a6170',.34),babySkin=material('infant mint skin','#7fe4c1','#143d35'),babyBelly=material('infant soft belly','#b7ffe1','#17483c'),babyEyes=material('infant sleeping eyes','#a9fff0','#5affdf'),babyCord=material('nutrient cord','#73c8c4','#287e76');bioAlloy.diffuseColor=C.FromHexString('#6b8a73');bioGlass.backFaceCulling=false;bioGlass.needDepthPrePass=true;
  for(let i=0;i<12;i++){
    const a=i*Math.PI*2/12,r=i%2?22:16,x=Math.sin(a)*r,z=Math.cos(a)*r;
    const tank=onDeck(3,BABYLON.MeshBuilder.CreateCylinder('rounded growth tank',{height:4.6,diameter:2.8,tessellation:24},scene));tank.position=new V(x,2.3,z);tank.material=i%2?bioGlass:bioAlloy;tank.checkCollisions=true;
    const crown=onDeck(3,BABYLON.MeshBuilder.CreateSphere('growth chamber crown',{diameter:2.25,segments:18},scene));crown.position=new V(x,4.25,z);crown.scaling.y=.55;crown.material=bioGlow;crown.isPickable=false;
    const root=onDeck(3,BABYLON.MeshBuilder.CreateTorus('growth tank base',{diameter:3.1,thickness:.22,tessellation:28},scene));root.position=new V(x,.28,z);root.material=bioGlow;root.isPickable=false;
    if(i%2){tank.metadata={glassTank:true,cracks:0};createBabyAlienSpecimen(x,z,i,a,babySkin,babyBelly,babyEyes,babyCord);for(const y of [.48,4.14]){const band=onDeck(3,BABYLON.MeshBuilder.CreateTorus('specimen tank seal',{diameter:2.76,thickness:.075,tessellation:28},scene));band.position=new V(x,y,z);band.material=bioGlow;band.isPickable=false}}
    for(const side of [-1,1]){const vine=onDeck(3,BABYLON.MeshBuilder.CreateTube('bio conduit vine',{path:[new V(x+side*.6,4.4,z),new V(x+side*.8,6.7,z),new V(x+side*1.7,8.6,z*.92)],radius:.075,tessellation:8},scene));vine.material=bioGlow;vine.isPickable=false}
  }
  for(const [x,z,rot] of [[-10,-7,.3],[10,-7,-.3],[-10,8,-.25],[10,8,.25]]){
    const planter=onDeck(3,box('curved bio planter',{width:5.4,height:1.35,depth:2.1},new V(x,.68,z),machinerySkin,true));planter.rotation.y=rot;
    for(let j=-2;j<=2;j++){const bloom=onDeck(3,BABYLON.MeshBuilder.CreateSphere('alien bloom',{diameter:.52+Math.abs(j)*.05,segments:10},scene));bloom.position=new V(x+j*.85,1.55,z);bloom.material=j%2?bioGlow:trim;bloom.isPickable=false}
  }
  for(const [x,z] of [[0,24],[24,0],[0,-24],[-24,0]]){const light=onDeck(3,new BABYLON.PointLight('hydroponics lamp',new V(x,4,z),scene));light.diffuse=new C(.3,1,.65);light.intensity=.72;light.range=15}

  // Deck 10: angular navigation consoles, holographic star globes and curved
  // partitions create a larger tactical vault with many broken sight lines.
  const navAlloy=pbr('navigation alloy','#18264d',.78,.3),navSkin=texturedMaterial('navigation textured armour','assets/textures/starfall-ceiling-v2.webp',.82,1.15),navTrim=material('navigation glow','#335ea8','#2d7dff'),navHolo=material('navigation hologram','#64cfff','#316cff',.42);navSkin.diffuseColor=C.FromHexString('#6178a8');
  for(const [x,z,rot] of [[-20,-17,.5],[0,-22,0],[20,-17,-.5],[-23,0,Math.PI/2],[23,0,Math.PI/2],[-18,18,-.5],[0,22,0],[18,18,.5]]){
    const console=onDeck(4,box('navigation command console',{width:5.4,height:2.25,depth:1.45},new V(x,1.12,z),navSkin,true));console.rotation.y=rot;console.rotation.x=-.06;
    const display=onDeck(4,box('navigation display',{width:4.4,height:.75,depth:.08},new V(x,2.12,z),navHolo));display.rotation.y=rot;display.rotation.x=-.35;display.isPickable=false;
  }
  for(let i=0;i<6;i++){
    const a=i*Math.PI*2/6,r=13.8,x=Math.sin(a)*r,z=Math.cos(a)*r,pylon=onDeck(4,BABYLON.MeshBuilder.CreateCylinder('star map pylon',{height:5.8,diameter:1.2,tessellation:18},scene));pylon.position=new V(x,2.9,z);pylon.material=navAlloy;pylon.checkCollisions=true;
    const globe=onDeck(4,BABYLON.MeshBuilder.CreateSphere('holographic star globe',{diameter:1.65,segments:14},scene));globe.position=new V(x,5.35,z);globe.material=navHolo;globe.isPickable=false;
    const orbit=onDeck(4,BABYLON.MeshBuilder.CreateTorus('hologram orbit',{diameter:2.15,thickness:.055,tessellation:32},scene));orbit.position.copyFrom(globe.position);orbit.rotation.x=a;orbit.material=navTrim;orbit.isPickable=false;
  }
  for(const radius of [9,27]){const route=onDeck(4,BABYLON.MeshBuilder.CreateTorus('navigation floor route',{diameter:radius*2,thickness:.075,tessellation:80},scene));route.position.y=.16;route.material=navTrim;route.isPickable=false}

  // Deck 11: a broad boss arena. Tall cover walls and reinforced pylons are
  // deliberately separated so the player can hide, flank and re-engage.
  const bossAlloy=texturedMaterial('nexus textured armour','assets/textures/starfall-living-machinery-v2.webp',.68,1.08),bossTrim=material('nexus energy','#8b2337','#ff284f'),bossGold=material('overseer gold','#8a642d','#ff9d32');bossAlloy.diffuseColor=C.FromHexString('#805357');
  for(let i=0;i<10;i++){
    const a=i*Math.PI*2/10,r=i%2?20:13.5,x=Math.sin(a)*r,z=Math.cos(a)*r;
    const shield=onDeck(5,box('nexus cover shield',{width:5.6,height:4.6,depth:1.05},new V(x,2.3,z),bossAlloy,true));shield.rotation.y=a;shield.isPickable=true;
    const slit=onDeck(5,box('nexus shield light',{width:3.5,height:.14,depth:1.12},new V(x,3.35,z),i%2?bossGold:bossTrim));slit.rotation.y=a;slit.isPickable=false;
    const leftX=x+Math.cos(a)*3,rightX=x-Math.cos(a)*3,leftZ=z-Math.sin(a)*3,rightZ=z+Math.sin(a)*3;
    for(const [px,pz] of [[leftX,leftZ],[rightX,rightZ]]){const pylon=onDeck(5,BABYLON.MeshBuilder.CreateCylinder('nexus cover pylon',{height:5.3,diameter:1.15,tessellation:18},scene));pylon.position=new V(px,2.65,pz);pylon.material=bossGold;pylon.checkCollisions=true}
  }
  for(const radius of [8,17,27]){const ring=onDeck(5,BABYLON.MeshBuilder.CreateTorus('nexus arena circuit',{diameter:radius*2,thickness:.09,tessellation:84},scene));ring.position.y=.17;ring.material=radius===17?bossGold:bossTrim;ring.isPickable=false}
  for(const [x,z] of [[0,26],[26,0],[0,-26],[-26,0]]){const light=onDeck(5,new BABYLON.PointLight('nexus combat lamp',new V(x,4,z),scene));light.diffuse=new C(1,.16,.22);light.intensity=.85;light.range=18}

  const dais=BABYLON.MeshBuilder.CreateCylinder('core dais',{height:.7,diameter:7,tessellation:32},scene);dais.position.y=.35;dais.material=purple;dais.checkCollisions=true;
  const coreRing=BABYLON.MeshBuilder.CreateTorus('core containment',{diameter:4.8,thickness:.32,tessellation:32},scene);coreRing.position.y=2.25;coreRing.material=trim;
  core=BABYLON.MeshBuilder.CreateSphere('living bio core',{diameter:3,segments:32},scene);core.position.y=2.4;core.material=material('living core','#4fffd9','#21c6a6');core.isPickable=false;
  const coreHalo=BABYLON.MeshBuilder.CreateTorus('core halo',{diameter:5.8,thickness:.08,tessellation:48},scene);coreHalo.position.y=2.4;coreHalo.rotation.x=Math.PI/2;coreHalo.material=trim;coreHalo.isPickable=false;

  registerInteractiveEnvironment();
  for(const level of [2,3,4,5])deckNodes[level].forEach(node=>node.setEnabled(false));
  scene.onBeforeRenderObservable.add(()=>{const t=performance.now()*.001;if(core){core.scaling.setAll(1+Math.sin(t*2.4)*.045);core.rotation.y=t*.25;coreHalo.rotation.z=t*.3}for(const specimen of specimens){specimen.root.position.y=specimen.baseY+Math.sin(t*1.25+specimen.phase)*.075;specimen.root.rotation.y=specimen.baseRotation+Math.sin(t*.7+specimen.phase)*.12;specimen.root.rotation.z=Math.sin(t*.9+specimen.phase)*.035;specimen.bubbles.forEach((bubble,index)=>bubble.position.y=-1.28+((t*.24+specimen.phase*.15+index*.42)%2.4))}if(started)update(scene.getEngine().getDeltaTime()/1000,t)});
  return scene;
}

function capsule(name,height,radius,parent,pos,mat){const mesh=BABYLON.MeshBuilder.CreateCapsule(name,{height,radius,tessellation:12,subdivisions:3},scene);mesh.parent=parent;mesh.position.copyFrom(pos);mesh.material=mat;return mesh}
function createEnemy(x,z,index,path){
  const config=LEVELS[currentLevel],difficulty=DIFFICULTIES[selectedDifficulty],bossLevel=!!config.boss,palette={1:['#172955','#9d742c','#226ac6','#0b5ab7'],2:['#342044','#a66331','#b62f59','#b8173f'],3:['#17443d','#9a7c2d','#23a37a','#16d8a0'],4:['#23365d','#a98b3f','#3d70ca','#347dff'],5:['#501b28','#c18a33','#d42b48','#ff244f']}[currentLevel];
  const root=new BABYLON.TransformNode(`Rigged Solar Dominion trooper ${index}`,scene);root.position=new V(x,0,z);
  const baseHp=bossLevel?config.bossHp:index>=config.eliteFrom?config.eliteHp:config.hp,maxHp=Math.round(baseHp*difficulty.enemyHealth);root.metadata={enemyRoot:true,boss:bossLevel,hp:maxHp,maxHp,alive:true,cool:(1.2+Math.random())*difficulty.fireDelay,speed:(config.speed+Math.random()*config.speedRange)*difficulty.enemySpeed,path,pathIndex:0,hitReact:0,recoil:0,nextStep:performance.now()+Math.random()*500,lastPain:0};
  const navy=pbr(`dominion navy ${index}`,palette[0],.72,.34),navyDark=pbr(`dominion undersuit ${index}`,'#080d18',.25,.68),gold=pbr(`solar gold ${index}`,palette[1],.82,.28),steel=pbr(`rifle metal ${index}`,'#151c24',.9,.25),visor=pbr(`helmet visor ${index}`,palette[2],.35,.18,palette[3]),red=pbr(`rank light ${index}`,'#531021',.35,.3,bossLevel?'#ff6b24':'#e51b4d');

  const hips=new BABYLON.TransformNode('hips rig',scene);hips.parent=root;hips.position.y=1.45;
  const pelvis=BABYLON.MeshBuilder.CreateCylinder('segmented pelvis armour',{height:.48,diameterTop:.68,diameterBottom:.92,tessellation:8},scene);pelvis.parent=hips;pelvis.material=navy;
  const spine=new BABYLON.TransformNode('spine rig',scene);spine.parent=hips;spine.position.y=.25;
  const chest=BABYLON.MeshBuilder.CreateCylinder('faceted chest armour',{height:1.2,diameterTop:1.18,diameterBottom:.82,tessellation:8},scene);chest.parent=spine;chest.position.y=.48;chest.scaling.z=.68;chest.material=navy;
  const chestPlate=box('layered breastplate',{width:.82,height:.68,depth:.13},new V(0,.52,-.43),gold);chestPlate.parent=spine;chestPlate.rotation.x=-.12;
  const abdomen=box('flexible abdomen',{width:.58,height:.42,depth:.44},new V(0,-.15,0),navyDark);abdomen.parent=spine;
  const backpack=box('life support backpack',{width:.7,height:.94,depth:.34},new V(0,.43,.48),steel);backpack.parent=spine;
  for(const side of [-1,1]){const tank=BABYLON.MeshBuilder.CreateCylinder('backpack pressure tank',{height:.72,diameter:.17,tessellation:10},scene);tank.parent=backpack;tank.position=new V(side*.22,0,.22);tank.material=gold}
  const rankLight=box('rank light',{width:.1,height:.32,depth:.05},new V(-.27,.56,-.51),red);rankLight.parent=spine;

  const neck=new BABYLON.TransformNode('neck rig',scene);neck.parent=spine;neck.position.y=1.35;
  const head=BABYLON.MeshBuilder.CreateSphere('sealed helmet',{diameter:.76,segments:18},scene);head.parent=neck;head.scaling=new V(.92,1.04,.96);head.material=navyDark;
  const helmetCrown=BABYLON.MeshBuilder.CreateCylinder('armoured helmet crown',{height:.34,diameterTop:.52,diameterBottom:.84,tessellation:10},scene);helmetCrown.parent=neck;helmetCrown.position.y=.25;helmetCrown.material=navy;
  const faceplate=box('full face visor',{width:.56,height:.25,depth:.12},new V(0,.01,-.39),visor);faceplate.parent=neck;faceplate.rotation.x=-.08;
  const respirator=box('respirator',{width:.28,height:.2,depth:.16},new V(0,-.22,-.39),steel);respirator.parent=neck;

  const shoulderRigs=[],elbows=[];
  for(const side of [-1,1]){
    const shoulder=new BABYLON.TransformNode(side<0?'left shoulder rig':'right shoulder rig',scene);shoulder.parent=spine;shoulder.position=new V(side*.7,.91,0);shoulderRigs.push(shoulder);
    const pauldron=BABYLON.MeshBuilder.CreateSphere('curved shoulder plate',{diameter:.58,segments:12,slice:.56},scene);pauldron.parent=shoulder;pauldron.position.y=-.05;pauldron.scaling=new V(1.05,.7,.9);pauldron.material=gold;
    capsule('upper arm armour',.74,.16,shoulder,new V(0,-.38,0),navy);
    const elbow=new BABYLON.TransformNode(side<0?'left elbow rig':'right elbow rig',scene);elbow.parent=shoulder;elbow.position.y=-.72;elbows.push(elbow);
    capsule('forearm armour',.64,.145,elbow,new V(0,-.3,-.02),navyDark);
    const gauntlet=box('armoured gauntlet',{width:.25,height:.24,depth:.28},new V(0,-.62,-.04),gold);gauntlet.parent=elbow;
  }
  const rifleRig=new BABYLON.TransformNode('rifle rig',scene);rifleRig.parent=elbows[1];rifleRig.position=new V(-.2,-.47,-.18);rifleRig.rotation=new V(Math.PI/2.3,0,-.08);
  const rifle=box('solar pulse rifle',{width:.25,height:.23,depth:1.28},new V(0,0,-.46),steel);rifle.parent=rifleRig;
  const rifleStock=box('rifle stock',{width:.3,height:.34,depth:.38},new V(0,.02,.28),navy);rifleStock.parent=rifleRig;
  const rifleCoil=BABYLON.MeshBuilder.CreateCylinder('rifle energy coil',{height:.5,diameter:.14,tessellation:12},scene);rifleCoil.parent=rifleRig;rifleCoil.position=new V(0,.15,-.5);rifleCoil.rotation.x=Math.PI/2;rifleCoil.material=red;
  const gunMuzzle=BABYLON.MeshBuilder.CreateSphere('rifle muzzle',{diameter:.13,segments:8},scene);gunMuzzle.parent=rifleRig;gunMuzzle.position=new V(0,0,-1.12);gunMuzzle.material=red;gunMuzzle.isPickable=false;

  const hipRigs=[],kneeRigs=[];
  for(const side of [-1,1]){
    const hip=new BABYLON.TransformNode(side<0?'left hip rig':'right hip rig',scene);hip.parent=hips;hip.position.x=side*.29;hipRigs.push(hip);
    capsule('armoured thigh',.86,.19,hip,new V(0,-.4,0),navy);
    const thighPlate=box('thigh plate',{width:.28,height:.5,depth:.12},new V(0,-.38,-.2),gold);thighPlate.parent=hip;
    const knee=new BABYLON.TransformNode(side<0?'left knee rig':'right knee rig',scene);knee.parent=hip;knee.position.y=-.8;kneeRigs.push(knee);
    capsule('armoured shin',.62,.17,knee,new V(0,-.28,0),navyDark);
    const kneePlate=box('knee guard',{width:.31,height:.24,depth:.15},new V(0,-.02,-.22),gold);kneePlate.parent=knee;
    const boot=box('magnetic combat boot',{width:.38,height:.22,depth:.64},new V(0,-.53,-.12),steel);boot.parent=knee;
  }

  const healthBack=box('enemy health back',{width:1.22,height:.085,depth:.025},new V(0,4.04,0),steel);healthBack.parent=root;healthBack.billboardMode=BABYLON.Mesh.BILLBOARDMODE_ALL;healthBack.isPickable=false;
  const healthFill=box('enemy health',{width:1.14,height:.052,depth:.035},new V(0,4.04,-.02),red);healthFill.parent=root;healthFill.billboardMode=BABYLON.Mesh.BILLBOARDMODE_ALL;healthFill.isPickable=false;
  for(const mesh of root.getChildMeshes()){mesh.metadata={enemy:root};mesh.isPickable=true;mesh.receiveShadows=true;shadowGenerator.addShadowCaster(mesh)}
  healthBack.metadata=null;healthFill.metadata=null;gunMuzzle.metadata=null;gunMuzzle.isPickable=false;
  root.metadata.parts={hips,spine,neck,shoulders:shoulderRigs,elbows,hipsRig:hipRigs,knees:kneeRigs,healthFill,muzzle:gunMuzzle};
  if(bossLevel){root.scaling.setAll(1.48);const auraMat=material('overseer aura','#ff6733','#ff2d45');for(const y of [1.15,2.45,3.55]){const aura=BABYLON.MeshBuilder.CreateTorus('overseer armour halo',{diameter:1.55+y*.12,thickness:.075,tessellation:32},scene);aura.parent=root;aura.position.y=y;aura.rotation.x=Math.PI/2;aura.material=auraMat;aura.isPickable=false}root.metadata.parts.healthFill.material=material('overseer health','#ff6b32','#ff244f')}
  return root;
}
function enemyPath(x,z,index){
  if(currentLevel===1){const gates=[new V(0,0,10.8),new V(10.8,0,0),new V(0,0,-10.8),new V(-10.8,0,0)],rootPos=new V(x,0,z),gate=gates.sort((a,b)=>V.DistanceSquared(a,rootPos)-V.DistanceSquared(b,rootPos))[0];return[gate,new V(0,0,0)]}
  if(currentLevel===2){const angle=Math.atan2(x,z),outerAngles=[Math.PI/4,Math.PI*3/4,Math.PI*5/4,Math.PI*7/4],innerAngles=[0,Math.PI/2,Math.PI,Math.PI*3/2];let outerIndex=0;for(let i=1;i<outerAngles.length;i++)if(angleDistance(angle,outerAngles[i])<angleDistance(angle,outerAngles[outerIndex]))outerIndex=i;const outer=outerAngles[outerIndex],inner=innerAngles[(outerIndex+(index%2))%4];return[new V(Math.sin(outer)*20.2,0,Math.cos(outer)*20.2),new V(Math.sin(inner)*10.2,0,Math.cos(inner)*10.2),new V(0,0,0)]}
  if(currentLevel===3){const sx=Math.sign(x)||1,sz=Math.sign(z)||-1;return Math.abs(x)>Math.abs(z)?[new V(sx*18,0,z*.35),new V(sx*9,0,0),new V(0,0,0)]:[new V(x*.35,0,sz*18),new V(0,0,sz*9),new V(0,0,0)]}
  if(currentLevel===4){const sx=Math.sign(x)||1,sz=Math.sign(z)||-1;return[new V(sx*22,0,sz*13),new V(sx*13,0,sz*7),new V(sx*6,0,0),new V(0,0,0)]}
  const orbit=[new V(-9,0,-9),new V(9,0,-9),new V(9,0,9),new V(-9,0,9)],rootPos=new V(x,0,z);let nearest=0;for(let i=1;i<orbit.length;i++)if(V.DistanceSquared(rootPos,orbit[i])<V.DistanceSquared(rootPos,orbit[nearest]))nearest=i;return[...orbit.slice(nearest),...orbit.slice(0,nearest)]
}
function resetEnemies(){enemies.forEach(e=>e.dispose(false,true));enemies=[];LEVELS[currentLevel].positions.forEach((p,i)=>enemies.push(createEnemy(p[0],p[1],i,enemyPath(p[0],p[1],i))))}

function show(text){msg.textContent=text;msg.classList.add('show');clearTimeout(show.timer);show.timer=setTimeout(()=>msg.classList.remove('show'),900)}
function updateHostileHUD(){const config=LEVELS[currentLevel];if(config.boss){const boss=enemies[0],ratio=boss?.metadata?.alive?Math.max(0,boss.metadata.hp/boss.metadata.maxHp):0;leftText.textContent=ratio?`OVERSEER: ${Math.ceil(ratio*100)}%`:'OVERSEER: DEFEATED'}else leftText.textContent=`HOSTILES: ${enemies.length-kills}`}
function animateClass(el,name){el.classList.remove(name);void el.offsetWidth;el.classList.add(name)}
function ensureAudio(){
  try{
    const ac=plasmaSound.ac||=new(window.AudioContext||window.webkitAudioContext)();audioState.ac=ac;if(ac.state==='suspended')ac.resume();
    if(!audioState.master){audioState.master=ac.createGain();audioState.master.gain.value=1.15;audioState.compressor=ac.createDynamicsCompressor();audioState.compressor.threshold.value=-18;audioState.compressor.knee.value=22;audioState.compressor.ratio.value=6;audioState.compressor.attack.value=.004;audioState.compressor.release.value=.24;audioState.master.connect(ac.destination);audioState.compressor.connect(audioState.master);audioState.music=ac.createGain();audioState.music.gain.value=.0001;audioState.music.connect(audioState.compressor);audioState.enemies=ac.createGain();audioState.enemies.gain.value=1.35;audioState.enemies.connect(audioState.compressor);audioState.effects=ac.createGain();audioState.effects.gain.value=1.9;audioState.effects.connect(audioState.compressor)}
    return ac;
  }catch{return null}
}
function synthTone(frequency,duration,volume,type='sine',bus=audioState.music,pan=0,slide=.72){
  const ac=ensureAudio();if(!ac||!bus)return;const now=ac.currentTime,o=ac.createOscillator(),g=ac.createGain(),p=ac.createStereoPanner?.();o.type=type;o.frequency.setValueAtTime(Math.max(20,frequency),now);o.frequency.exponentialRampToValueAtTime(Math.max(20,frequency*slide),now+duration);g.gain.setValueAtTime(Math.max(.0001,volume),now);g.gain.exponentialRampToValueAtTime(.0001,now+duration);o.connect(g);if(p){p.pan.value=Math.max(-1,Math.min(1,pan));g.connect(p);p.connect(bus)}else g.connect(bus);o.start(now);o.stop(now+duration+.02)
}
function noiseHit(duration,volume,cutoff,bus=audioState.music,pan=0){
  const ac=ensureAudio();if(!ac||!bus)return;const source=ac.createBufferSource(),buffer=ac.createBuffer(1,Math.ceil(ac.sampleRate*duration),ac.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,2);source.buffer=buffer;const filter=ac.createBiquadFilter(),gain=ac.createGain(),p=ac.createStereoPanner?.(),now=ac.currentTime;filter.type=cutoff<700?'lowpass':'bandpass';filter.frequency.value=cutoff;filter.Q.value=1.2;gain.gain.setValueAtTime(volume,now);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);source.connect(filter);filter.connect(gain);if(p){p.pan.value=Math.max(-1,Math.min(1,pan));gain.connect(p);p.connect(bus)}else gain.connect(bus);source.start(now)
}
function combatDanger(){
  const alive=enemies.filter(enemy=>enemy.metadata?.alive&&enemy.isEnabled());if(!alive.length)return .12;const nearest=Math.min(...alive.map(enemy=>V.Distance(camera.position,enemy.position))),nearDanger=Math.max(0,1-nearest/27),coreDanger=alive.some(enemy=>V.Distance(core.position,enemy.position)<8)?1:0,healthDanger=1-health/100,boss=currentLevel===5?.26:0;return Math.max(.16,Math.min(1,.12+nearDanger*.38+coreDanger*.28+healthDanger*.32+boss))
}
function musicBeat(){
  if(!audioState.running||!started)return;audioState.danger=combatDanger();const d=audioState.danger,beat=audioState.beat++,roots=[41.2,46.25,49,55,36.7],root=roots[currentLevel-1],scale=[1,1.125,1.2,1.5,1.6,1.8],note=root*2*scale[(beat+currentLevel)%scale.length];
  if(beat%2===0)synthTone(root,.38,.025+d*.018,'triangle',audioState.music,(beat%4-1.5)*.14,.76);if(beat%4===0)noiseHit(.18,.025+d*.03,145,audioState.music,0);if(d>.32&&beat%2===1)synthTone(note,.2,.012+d*.014,'square',audioState.music,beat%4===1?-.32:.32,.58);if(d>.58&&beat%3===0){noiseHit(.09,.013+d*.015,1600,audioState.music,(Math.random()-.5)*1.4);synthTone(root*4.5,.12,.009+d*.009,'sawtooth',audioState.music,(Math.random()-.5)*1.5,.45)}if(health<38&&beat%4===2){synthTone(740,.28,.018,'sine',audioState.music,-.55,.84);synthTone(555,.28,.015,'sine',audioState.music,.55,.84)}
  audioState.timer=setTimeout(musicBeat,Math.round(520-d*245));
}
function startCombatAudio(){
  const ac=ensureAudio();if(!ac)return;window.speechSynthesis?.cancel();stopCombatAudio();audioState.running=true;audioState.beat=0;const now=ac.currentTime,roots=[41.2,46.25,49,55,36.7],root=roots[currentLevel-1];audioState.music.gain.cancelScheduledValues(now);audioState.music.gain.setValueAtTime(.0001,now);audioState.music.gain.exponentialRampToValueAtTime(.48,now+.8);
  for(const [frequency,type,volume]of[[root,'sine',.045],[root*1.5,'sawtooth',.012]]){const oscillator=ac.createOscillator(),filter=ac.createBiquadFilter(),gain=ac.createGain();oscillator.type=type;oscillator.frequency.value=frequency;filter.type='lowpass';filter.frequency.value=type==='sine'?170:260;gain.gain.value=volume;oscillator.connect(filter);filter.connect(gain);gain.connect(audioState.music);oscillator.start();audioState.drones.push({oscillator,gain})}musicBeat()
}
function stopCombatAudio(){
  audioState.running=false;clearTimeout(audioState.timer);audioState.timer=null;if(!audioState.ac||!audioState.music)return;const now=audioState.ac.currentTime;audioState.music.gain.cancelScheduledValues(now);audioState.music.gain.setValueAtTime(Math.max(.0001,audioState.music.gain.value),now);audioState.music.gain.exponentialRampToValueAtTime(.0001,now+.45);for(const drone of audioState.drones){drone.gain.gain.exponentialRampToValueAtTime(.0001,now+.4);drone.oscillator.stop(now+.45)}audioState.drones=[]
}
function enemyPan(enemy){const relative=enemy.position.subtract(camera.position),angle=Math.atan2(relative.x,relative.z)-camera.rotation.y;return Math.max(-1,Math.min(1,Math.sin(angle)))}
function enemySound(kind,enemy){
  const ac=ensureAudio();if(!ac||!enemy)return;const distance=V.Distance(camera.position,enemy.position),near=Math.max(.16,1-distance/38),pan=enemyPan(enemy),boss=enemy.metadata.boss,base=boss?72:kind==='step'?92:118,volume=near*(boss?.085:kind==='step'?.018:.045);if(kind==='step'){noiseHit(.07,volume,220,audioState.enemies,pan);synthTone(base,.055,volume*.35,'sine',audioState.enemies,pan,.55);return}if(kind==='attack'){synthTone(base*1.7,.17,volume,'sawtooth',audioState.enemies,pan,.48);noiseHit(.09,volume*.55,1050,audioState.enemies,pan)}else if(kind==='pain'){synthTone(base,.22,volume*1.18,'square',audioState.enemies,pan,.52);noiseHit(.14,volume*.62,620,audioState.enemies,pan)}else if(kind==='death'){synthTone(base*.88,.48,volume*1.35,'sawtooth',audioState.enemies,pan,.25);noiseHit(.3,volume*.82,420,audioState.enemies,pan)}else if(kind==='core'){synthTone(base*1.25,.2,volume,'square',audioState.enemies,pan,.62);noiseHit(.1,volume*.55,850,audioState.enemies,pan)}
}
function enemyVoice(enemy,kind='attack',force=false){
  if(!enemy||!window.speechSynthesis)return;const now=performance.now();if(!force&&(now-audioState.lastVoice<4800||speechSynthesis.speaking))return;audioState.lastVoice=now;const boss=enemy.metadata?.boss,lines={start:boss?['Sentinel. Your vessel belongs to the Dominion.']:['Dominion squad, advance.','Secure this deck. Move.'],attack:boss?['You cannot save this ship.','Stand down, sentinel.']:['Target acquired.','Sentinel located.','Hold your firing line.','Advance on the core.'],core:['The bio-core is exposed.','Breach the living core.'],hurt:['Armour damaged.','I am hit.'],allyDown:['Unit down. Keep moving.'],death:boss?['The Dominion... does not... retreat.']:['Unit lost.'],victory:['The bio-core is ours.']},choices=lines[kind]||lines.attack,utterance=new SpeechSynthesisUtterance(choices[Math.floor(Math.random()*choices.length)]),voices=speechSynthesis.getVoices();utterance.voice=voices.find(voice=>/^en/i.test(voice.lang)&&/david|mark|guy|george|daniel|male/i.test(voice.name))||voices.find(voice=>/^en/i.test(voice.lang))||null;utterance.rate=boss?.72:.9;utterance.pitch=boss?.35:.55;utterance.volume=boss?.9:.78;speechSynthesis.speak(utterance)
}
function plasmaSound(hit=false){try{const fx=window.DanArcadeFX;if(hit)fx?.play('metal',{volume:.12,rate:1.7,cooldown:70});else fx?.play('laser',{volume:.2,rate:1.05,duration:.32,cooldown:95});const ac=ensureAudio();if(!ac)return;const o=ac.createOscillator(),g=ac.createGain(),n=ac.currentTime;o.type=hit?'square':'sawtooth';o.frequency.setValueAtTime(hit?250:720,n);o.frequency.exponentialRampToValueAtTime(hit?90:180,n+.13);g.gain.setValueAtTime(.08,n);g.gain.exponentialRampToValueAtTime(.001,n+.14);o.connect(g);g.connect(audioState.effects);o.start(n);o.stop(n+.15)}catch{}}
function environmentSound(kind){try{const fx=window.DanArcadeFX;if(kind==='break')fx?.play('metal',{volume:.27,rate:.86});else if(kind==='glass')fx?.play('magic',{volume:.16,rate:1.42,cooldown:100});const ac=ensureAudio();if(!ac)return;const duration=kind==='break'?.24:kind==='glass'?.18:.13,source=ac.createBufferSource(),buffer=ac.createBuffer(1,Math.ceil(ac.sampleRate*duration),ac.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,kind==='break'?1.4:2.7);source.buffer=buffer;const filter=ac.createBiquadFilter(),gain=ac.createGain(),now=ac.currentTime;filter.type=kind==='break'?'bandpass':'highpass';filter.frequency.value=kind==='break'?720:kind==='glass'?2100:2850;filter.Q.value=kind==='break'?.8:1.8;gain.gain.setValueAtTime(kind==='glass'?.065:.048,now);gain.gain.exponentialRampToValueAtTime(.001,now+duration);source.connect(filter);filter.connect(gain);gain.connect(audioState.effects);source.start(now);const oscillator=ac.createOscillator(),oscGain=ac.createGain();oscillator.type=kind==='flash'?'square':'sawtooth';oscillator.frequency.setValueAtTime(kind==='break'?190:kind==='glass'?1250:1900,now);oscillator.frequency.exponentialRampToValueAtTime(kind==='break'?55:kind==='glass'?420:650,now+duration);oscGain.gain.setValueAtTime(kind==='break'?.045:.018,now);oscGain.gain.exponentialRampToValueAtTime(.001,now+duration);oscillator.connect(oscGain);oscGain.connect(audioState.effects);oscillator.start(now);oscillator.stop(now+duration)}catch{}}
function impact(point,color='#ff315f'){
  for(let i=0;i<12;i++){const p=BABYLON.MeshBuilder.CreateSphere('impact particle',{diameter:.08+Math.random()*.09,segments:4},scene);p.position.copyFrom(point);p.material=material(`impact${Math.random()}`,color,color);p.isPickable=false;const v=new V((Math.random()-.5)*4,Math.random()*3,(Math.random()-.5)*4);let life=0;scene.onBeforeRenderObservable.add(function move(){const dt=engine.getDeltaTime()/1000;life+=dt;p.position.addInPlace(v.scale(dt));v.y-=5*dt;p.scaling.setAll(Math.max(0,1-life*2.2));if(life>.48){scene.onBeforeRenderObservable.removeCallback(move);p.dispose()}})}
}
function registerInteractiveEnvironment(){
  interactiveNeons=[];const excluded=/baby|infant|nutrient|living bio core|core halo|core containment|space window|distant star|impact|collision barrier/i;
  for(const mesh of scene.meshes){if(mesh.metadata?.glassTank){mesh.isPickable=true;continue}const emissive=mesh.material?.emissiveColor,energy=emissive?emissive.r*emissive.r+emissive.g*emissive.g+emissive.b*emissive.b:0;if(energy<.012||excluded.test(mesh.name))continue;mesh.metadata={...(mesh.metadata||{}),neon:{broken:false,flashing:false,unique:false}};mesh.isPickable=true;interactiveNeons.push(mesh)}
}
function prepareNeon(mesh){const state=mesh.metadata.neon;if(!state.unique){const clone=mesh.material.clone(`${mesh.name} reactive light`);mesh.material=clone;state.originalEmissive=clone.emissiveColor?.clone()||new C(0,0,0);state.originalBase=(clone.diffuseColor||clone.albedoColor)?.clone();state.unique=true;mesh.computeWorldMatrix(true);const position=mesh.getAbsolutePosition(),nearby=scene.lights.filter(light=>light instanceof BABYLON.PointLight&&!light.metadata?.environmentDamage).sort((a,b)=>V.DistanceSquared(a.position,position)-V.DistanceSquared(b.position,position))[0];if(nearby&&V.Distance(nearby.position,position)<4.8){nearby.metadata={...(nearby.metadata||{}),environmentDamage:true};state.light=nearby;state.lightIntensity=nearby.intensity}}return state}
function setNeonPower(mesh,on){const state=prepareNeon(mesh),mat=mesh.material;if(mat.emissiveColor)mat.emissiveColor.copyFrom(on?state.originalEmissive:new C(0,0,0));if(!on){if(mat.diffuseColor)mat.diffuseColor.scaleToRef(.18,mat.diffuseColor);else if(mat.albedoColor)mat.albedoColor.scaleToRef(.18,mat.albedoColor)}else if(state.originalBase){if(mat.diffuseColor)mat.diffuseColor.copyFrom(state.originalBase);else if(mat.albedoColor)mat.albedoColor.copyFrom(state.originalBase)}}
function flashNeon(mesh){const state=prepareNeon(mesh);if(state.flashing||state.broken)return;state.flashing=true;environmentSound('flash');show('NEON CIRCUIT FLICKERING');let pulse=0;const timer=setInterval(()=>{const on=pulse%2===1;setNeonPower(mesh,on);if(state.light)state.light.intensity=on?state.lightIntensity:state.lightIntensity*.12;pulse++;if(pulse>7){clearInterval(timer);setNeonPower(mesh,true);if(state.light)state.light.intensity=state.lightIntensity;state.flashing=false}},62)}
function breakNeon(mesh){const state=prepareNeon(mesh);if(state.broken){show('LIGHT ALREADY OFFLINE');return}state.broken=true;brokenNeons.add(mesh);setNeonPower(mesh,false);if(state.light)state.light.intensity=state.lightIntensity*.18;environmentSound('break');show('NEON LIGHT BROKEN · EMERGENCY LIGHTING HOLDS')}
function hitNeon(mesh,point){const state=prepareNeon(mesh),breakLimit=Math.max(1,Math.floor(interactiveNeons.length*.26));impact(point,state.originalEmissive?.toHexString()||'#65ffe0');if(state.broken){environmentSound('break');show('LIGHT ALREADY OFFLINE');return}if(state.flashing){environmentSound('flash');show('NEON CIRCUIT STILL FLICKERING');return}if(brokenNeons.size<breakLimit&&Math.random()<.34)breakNeon(mesh);else flashNeon(mesh)}
function glassCrack(tank,point){
  tank.metadata.cracks++;const center=tank.getAbsolutePosition(),normal=new V(point.x-center.x,0,point.z-center.z);if(normal.lengthSquared()<.01)normal.copyFromFloats(0,0,1);normal.normalize();const tangent=new V(normal.z,0,-normal.x),origin=point.add(normal.scale(.035)),lines=[],branches=6+Math.min(4,tank.metadata.cracks*2);
  for(let branch=0;branch<branches;branch++){const angle=branch*Math.PI*2/branches+(Math.random()-.5)*.35,length=.22+Math.random()*.34+tank.metadata.cracks*.035,end=origin.add(tangent.scale(Math.cos(angle)*length)).add(V.Up().scale(Math.sin(angle)*length));lines.push([origin,end]);if(branch%2===0){const mid=V.Lerp(origin,end,.58),twig=mid.add(tangent.scale(Math.cos(angle+1.05)*length*.34)).add(V.Up().scale(Math.sin(angle+1.05)*length*.34));lines.push([mid,twig])}}
  const crack=onDeck(3,BABYLON.MeshBuilder.CreateLineSystem('persistent bio-glass fracture',{lines},scene));crack.color=C.FromHexString(tank.metadata.cracks>2?'#dffeff':'#82e9ff');crack.alpha=.82;crack.isPickable=false;environmentSound('glass');impact(point,'#baf8ff');if(tank.metadata.cracks===1)show('BIO-GLASS CRACKED');else if(tank.metadata.cracks===2){show('NUTRIENT VAPOUR LEAK');leakMist(point)}else show('REINFORCED CONTAINMENT FIELD HOLDING')
}
function leakMist(point){const alarm=new BABYLON.PointLight('specimen breach alarm',point.add(new V(0,.4,0)),scene);alarm.diffuse=new C(1,.12,.18);alarm.intensity=1.8;alarm.range=5;setTimeout(()=>alarm.dispose(),650);for(let i=0;i<12;i++){const mist=BABYLON.MeshBuilder.CreateSphere('nutrient vapour',{diameter:.08+Math.random()*.14,segments:5},scene);mist.position=point.add(new V((Math.random()-.5)*.45,(Math.random()-.5)*.25,(Math.random()-.5)*.45));mist.material=material(`vapour ${Math.random()}`,'#a8fff0','#3ccfb1',.28);mist.isPickable=false;const drift=new V((Math.random()-.5)*.22,.32+Math.random()*.28,(Math.random()-.5)*.22);let life=0;scene.onBeforeRenderObservable.add(function rise(){const dt=engine.getDeltaTime()/1000;life+=dt;mist.position.addInPlace(drift.scale(dt));mist.visibility=Math.max(0,1-life/1.1);mist.scaling.setAll(1+life*.8);if(life>1.1){scene.onBeforeRenderObservable.removeCallback(rise);mist.dispose()}})}}
function handleEnvironmentShot(mesh,point){if(mesh.metadata?.glassTank){glassCrack(mesh,point);return true}if(mesh.metadata?.neon){hitNeon(mesh,point);return true}return false}
function shoot(){
  if(!started||!ammo||performance.now()-lastShot<180)return;lastShot=performance.now();ammo--;ammoText.textContent=ammo;animateClass(muzzle,'show');weapon.animate([{transform:`translateX(-50%) translateY(${aiming?'5':'0'}vh) scale(${aiming?'.82':'1'})`},{transform:`translateX(-50%) translateY(${aiming?'7':'2'}vh) scale(${aiming?'.82':'1'})`},{transform:`translateX(-50%) translateY(${aiming?'5':'0'}vh) scale(${aiming?'.82':'1'})`}],{duration:150});plasmaSound();
  const pick=scene.pickWithRay(camera.getForwardRay(100));
  if(pick?.hit&&pick.pickedMesh.metadata?.enemy?.metadata?.alive){const enemy=pick.pickedMesh.metadata.enemy;enemy.metadata.hp-=aiming?58:42;enemy.metadata.hitReact=1;const ratio=Math.max(0,enemy.metadata.hp/enemy.metadata.maxHp);enemy.metadata.parts.healthFill.scaling.x=ratio;enemy.metadata.parts.healthFill.position.x=-(1-ratio)*.55;impact(pick.pickedPoint);animateClass(hitMarker,'show');plasmaSound(true);if(performance.now()-enemy.metadata.lastPain>420){enemy.metadata.lastPain=performance.now();enemySound('pain',enemy);if(Math.random()<.16)enemyVoice(enemy,'hurt')}updateHostileHUD();show(enemy.metadata.hp>0?(enemy.metadata.boss?'✕ OVERSEER ARMOUR DAMAGED':'✕ ARMOUR HIT'):'✕ CRITICAL PLASMA IMPACT');if(enemy.metadata.hp<=0)killEnemy(enemy)}else if(pick?.hit&&handleEnvironmentShot(pick.pickedMesh,pick.pickedPoint)){}else{if(pick?.hit)impact(pick.pickedPoint,'#65ffe0');show('SHOT MISSED')}
}
function killEnemy(enemy){enemy.metadata.alive=false;enemySound('death',enemy);if(enemy.metadata.boss)enemyVoice(enemy,'death',true);else if(Math.random()<.28){const witness=enemies.find(other=>other!==enemy&&other.metadata.alive);if(witness)enemyVoice(witness,'allyDown')}kills++;updateHostileHUD();show(enemy.metadata.boss?'DOMINION OVERSEER DEFEATED':'DOMINION TROOPER NEUTRALIZED');enemy.getChildMeshes().forEach(m=>m.isPickable=false);BABYLON.Animation.CreateAndStartAnimation('trooper fall',enemy,'rotation.z',60,34,0,Math.PI*.48,BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);BABYLON.Animation.CreateAndStartAnimation('trooper drop',enemy,'position.y',60,34,enemy.position.y,enemy.position.y-.5,BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,null,()=>setTimeout(()=>enemy.setEnabled(false),450));if(kills===enemies.length){started=false;stopCombatAudio();setTimeout(completeLevel,1000)}}
function enemyHasSight(enemy){const muzzlePoint=enemy.metadata.parts.muzzle;muzzlePoint.computeWorldMatrix(true);const origin=muzzlePoint.getAbsolutePosition(),direction=camera.position.subtract(origin),distance=direction.length(),ray=new BABYLON.Ray(origin,direction.normalize(),distance-.5),block=scene.pickWithRay(ray,mesh=>mesh.isEnabled()&&mesh.isPickable&&mesh.checkCollisions&&!mesh.metadata?.enemy);return !block?.hit}
function enemyBolt(enemy){
  const config=LEVELS[currentLevel],difficulty=DIFFICULTIES[selectedDifficulty],muzzlePoint=enemy.metadata.parts.muzzle;muzzlePoint.computeWorldMatrix(true);const origin=muzzlePoint.getAbsolutePosition().clone(),target=camera.position.clone(),bolt=BABYLON.MeshBuilder.CreateSphere('solar bolt',{diameter:enemy.metadata.boss?.42:.22,segments:8},scene);enemy.metadata.recoil=1;enemySound('attack',enemy);if(Math.random()<(enemy.metadata.boss?.34:.22))enemyVoice(enemy,'attack');bolt.position.copyFrom(origin);bolt.material=material(`bolt${Math.random()}`,enemy.metadata.boss?'#ff5b38':'#ffb02e',enemy.metadata.boss?'#ff173e':'#ff6a00');bolt.isPickable=false;const start=performance.now(),duration=config.boltDuration*difficulty.projectileTime;
  projectiles.push(bolt);scene.onBeforeRenderObservable.add(function fly(){const k=Math.min(1,(performance.now()-start)/duration);bolt.position=BABYLON.Vector3.Lerp(origin,target,k);bolt.scaling.setAll(1+k*1.4);if(k>=1){scene.onBeforeRenderObservable.removeCallback(fly);bolt.dispose();projectiles=projectiles.filter(x=>x!==bolt);if(V.Distance(camera.position,target)<1.65)takeDamage(config.boltMin+Math.floor(Math.random()*config.boltRange));else show('SOLAR BOLT EVADED')}});
}
function takeDamage(amount){if(!started)return;amount=Math.max(1,Math.round(amount*DIFFICULTIES[selectedDifficulty].damage));health=Math.max(0,health-amount);healthText.textContent=health;healthBar.style.width=`${health}%`;animateClass(damage,'show');show('SOLAR BOLT IMPACT');if(!health)end(false)}
function update(dt,t){
  const config=LEVELS[currentLevel],graceActive=performance.now()-levelStartedAt<config.grace*1000;
  const radius=Math.hypot(camera.position.x,camera.position.z);if(radius>HULL_LIMIT){const scale=HULL_LIMIT/radius;camera.position.x*=scale;camera.position.z*=scale;camera.cameraDirection.x=0;camera.cameraDirection.z=0;if(performance.now()-(update.boundaryNotice||0)>1800){update.boundaryNotice=performance.now();show('OUTER HULL SEALED · EXPANSION ZONE RESERVED')}}camera.position.y=Math.max(1.72,Math.min(2.18,camera.position.y));
  if(turnDirection)camera.rotation.y+=turnDirection*dt*1.7;
  if(moveVector.x||moveVector.y){const forward=new V(Math.sin(camera.rotation.y),0,Math.cos(camera.rotation.y)),right=new V(forward.z,0,-forward.x),movement=forward.scale(moveVector.y*dt*5).add(right.scale(moveVector.x*dt*5));camera.cameraDirection.addInPlace(movement)}
  for(const enemy of enemies){if(!enemy.metadata.alive||!enemy.isEnabled())continue;const toCore=core.position.subtract(enemy.position),distance=Math.hypot(toCore.x,toCore.z),toPlayer=camera.position.subtract(enemy.position),playerDistance=Math.hypot(toPlayer.x,toPlayer.z);enemy.rotation.y=Math.atan2(toPlayer.x,toPlayer.z)+Math.PI;enemy.metadata.cool-=dt;
    const pathTarget=enemy.metadata.path[Math.min(enemy.metadata.pathIndex,enemy.metadata.path.length-1)],toTarget=pathTarget.subtract(enemy.position),pathDistance=Math.hypot(toTarget.x,toTarget.z),walking=enemy.metadata.boss||enemy.metadata.pathIndex<enemy.metadata.path.length-1||distance>4.1;
    if(!enemy.metadata.boss&&pathDistance<1.25&&enemy.metadata.pathIndex<enemy.metadata.path.length-1)enemy.metadata.pathIndex++;
    const rig=enemy.metadata.parts,phase=t*7.2+enemy.uniqueId,stride=walking?Math.sin(phase):0,now=performance.now();if(walking&&playerDistance<22&&now>enemy.metadata.nextStep){enemy.metadata.nextStep=now+(enemy.metadata.boss?430:540)+Math.random()*90;if(now-audioState.lastStep>75){audioState.lastStep=now;enemySound('step',enemy)}}rig.hips.position.y=1.45+(walking?Math.abs(Math.sin(phase*2))*.035:0);rig.hipsRig[0].rotation.x=stride*.58;rig.hipsRig[1].rotation.x=-stride*.58;rig.knees[0].rotation.x=Math.max(0,-stride)*.72;rig.knees[1].rotation.x=Math.max(0,stride)*.72;rig.shoulders[0].rotation.x=-stride*.32-.28;rig.shoulders[1].rotation.x=stride*.2-.72;rig.elbows[0].rotation.x=-.18;rig.elbows[1].rotation.x=-.72-enemy.metadata.recoil*.28;rig.spine.rotation.y=walking?Math.sin(phase)*.055:0;if(enemy.metadata.hitReact>0){rig.spine.rotation.z=Math.sin(enemy.metadata.hitReact*Math.PI)*.22;enemy.metadata.hitReact=Math.max(0,enemy.metadata.hitReact-dt*4.5)}else rig.spine.rotation.z=0;enemy.metadata.recoil=Math.max(0,enemy.metadata.recoil-dt*5);
    if(enemy.metadata.boss){if(pathDistance<1.35)enemy.metadata.pathIndex=(enemy.metadata.pathIndex+1)%enemy.metadata.path.length;const activeTarget=enemy.metadata.path[enemy.metadata.pathIndex],stepTarget=activeTarget.subtract(enemy.position);stepTarget.y=0;const hpRatio=enemy.metadata.hp/enemy.metadata.maxHp,phaseSpeed=hpRatio<.34?1.38:hpRatio<.67?1.18:1;if(stepTarget.lengthSquared()>.01)enemy.position.addInPlace(stepTarget.normalize().scale(enemy.metadata.speed*phaseSpeed*dt));enemy.rotation.y=Math.atan2(toPlayer.x,toPlayer.z)+Math.PI;if(!graceActive&&playerDistance<config.fireRange&&enemy.metadata.cool<0&&enemyHasSight(enemy)){enemy.metadata.cool=(config.fireMin+Math.random()*config.fireRangeDelay)*DIFFICULTIES[selectedDifficulty].fireDelay/(hpRatio<.34?1.28:1);enemyBolt(enemy)}continue}
    if(distance>4.1){const activeTarget=enemy.metadata.path[Math.min(enemy.metadata.pathIndex,enemy.metadata.path.length-1)],stepTarget=activeTarget.subtract(enemy.position);stepTarget.y=0;if(stepTarget.lengthSquared()>.01){const step=stepTarget.normalize().scale(enemy.metadata.speed*dt);enemy.position.addInPlace(step);enemy.rotation.y=Math.atan2(step.x,step.z)+Math.PI}}else if(!graceActive&&enemy.metadata.cool<0){enemy.metadata.cool=config.coreCooldown;enemySound('core',enemy);if(Math.random()<.3)enemyVoice(enemy,'core');takeDamage(config.coreDamage);show('BIO-CORE UNDER ATTACK')}
    if(!graceActive&&playerDistance<config.fireRange&&enemy.metadata.cool<0&&enemyHasSight(enemy)){enemy.metadata.cool=(config.fireMin+Math.random()*config.fireRangeDelay)*DIFFICULTIES[selectedDifficulty].fireDelay;enemyBolt(enemy)}
  }
}
function updateView(){if(camera)camera.fov=aiming?AIM_FOV:sprinting?BOOST_FOV:BASE_FOV}
function setAim(value){aiming=value;document.body.classList.toggle('aiming',value);updateView()}
function thrusterSound(){try{const ac=ensureAudio();if(!ac)return;const o=ac.createOscillator(),g=ac.createGain(),n=ac.currentTime;o.type='sawtooth';o.frequency.setValueAtTime(70,n);o.frequency.exponentialRampToValueAtTime(155,n+.2);g.gain.setValueAtTime(.035,n);g.gain.exponentialRampToValueAtTime(.001,n+.24);o.connect(g);g.connect(audioState.effects);o.start(n);o.stop(n+.25)}catch{}}
function setSprint(value){sprinting=value;if(camera)camera.speed=value?BOOST_SPEED:WALK_SPEED;document.body.classList.toggle('boosting',value);document.querySelector('#boost')?.classList.toggle('active',value);updateView();if(value)thrusterSound()}
function setDeck(level){
  currentLevel=level;const config=LEVELS[level];
  for(const deck of [1,2,3,4,5])deckNodes[deck].forEach(node=>node.setEnabled(deck===level));
  scene.fogColor=C.FromHexString(config.fog);scene.fogDensity=config.fogDensity*.52;scene.clearColor=new BABYLON.Color4(...config.clear,1);
  ambientLight.diffuse=new C(...config.light);ambientLight.groundColor=new C(...config.ground);coreLight.diffuse=new C(...config.core);
  deckText.textContent=config.name;
}
function completeLevel(){
  stopCombatAudio();document.exitPointerLock?.();
  if(currentLevel<5){const cleared=LEVELS[currentLevel],next=LEVELS[currentLevel+1];pendingLevel=currentLevel+1;menu.querySelector('h1').innerHTML=`DECK ${cleared.deck} SECURED<br><span>CAMPAIGN ${pendingLevel}/5</span>`;menu.querySelectorAll('p')[0].textContent=next.brief;document.querySelector('#start').textContent=`ENTER DECK ${next.deck}`;menu.classList.remove('hidden')}else end(true)
}
function end(win){started=false;stopCombatAudio();document.exitPointerLock?.();menu.classList.remove('hidden');if(win){pendingLevel=1;menu.querySelector('h1').innerHTML='SHIP LIBERATED<br><span>OVERSEER DEFEATED</span>';menu.querySelectorAll('p')[0].textContent='All five decks are secure. You used the nexus cover, defeated the Dominion Overseer and saved the living ship.';document.querySelector('#start').textContent='REPLAY 5-LEVEL CAMPAIGN'}else{const config=LEVELS[currentLevel],victor=enemies.find(enemy=>enemy.metadata.alive);if(victor)enemyVoice(victor,'victory',true);pendingLevel=currentLevel;menu.querySelector('h1').innerHTML='BIO-CORE LOST<br><span>DEFEAT</span>';menu.querySelectorAll('p')[0].textContent=`The Dominion broke through on ${config.name}. Reinitialize this deck and fight again.`;document.querySelector('#start').textContent=`RETRY DECK ${config.deck}`}}
function reset(level=currentLevel){setDeck(level);const config=LEVELS[level];projectiles.forEach(projectile=>projectile.dispose());projectiles=[];health=100;ammo=Math.round(config.ammo*DIFFICULTIES[selectedDifficulty].ammo);kills=0;lastShot=0;levelStartedAt=performance.now();camera.position.copyFromFloats(...config.spawn);camera.rotation.copyFromFloats(0,config.rotation,0);camera.cameraDirection.copyFromFloats(0,0,0);camera.cameraRotation.copyFromFloats(0,0);resetEnemies();healthText.textContent=health;ammoText.textContent=ammo;updateHostileHUD();healthBar.style.width='100%';setAim(false);setSprint(false)}

buildScene();reset(1);engine.runRenderLoop(()=>scene.render());addEventListener('resize',()=>engine.resize());
const difficultyText=document.querySelector('#difficultyText');document.querySelectorAll('[data-difficulty]').forEach(button=>button.onclick=()=>{selectedDifficulty=button.dataset.difficulty;document.querySelectorAll('[data-difficulty]').forEach(option=>{const selected=option===button;option.classList.toggle('selected',selected);option.setAttribute('aria-pressed',selected)});difficultyText.textContent=DIFFICULTIES[selectedDifficulty].description});
document.querySelector('#start').onclick=()=>{reset(pendingLevel);started=true;startCombatAudio();menu.classList.add('hidden');show(`${DIFFICULTIES[selectedDifficulty].label} · SHIELD ${LEVELS[currentLevel].grace.toFixed(1)} SECONDS`);canvas.requestPointerLock?.();setTimeout(()=>{if(started)enemyVoice(enemies[0],'start',true)},1100)};
canvas.addEventListener('contextmenu',e=>e.preventDefault());addEventListener('mousedown',e=>{if(e.button===2)setAim(true);else if(e.button===0)shoot()});addEventListener('mouseup',e=>{if(e.button===2)setAim(false)});addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();shoot()}if(started&&(e.code==='ShiftLeft'||e.code==='ShiftRight')&&!sprinting){setSprint(true);show('THRUSTER BOOST +25%')}});addEventListener('keyup',e=>{if(e.code==='ShiftLeft'||e.code==='ShiftRight')setSprint(false)});addEventListener('blur',()=>setSprint(false));
document.querySelector('#fire').onpointerdown=e=>{e.preventDefault();shoot()};document.querySelector('#touchAim').onpointerdown=e=>{e.preventDefault();setAim(!aiming)};
document.querySelectorAll('[data-turn]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();turnDirection=Number(b.dataset.turn)};b.onpointerup=b.onpointercancel=()=>turnDirection=0});
const stick=document.querySelector('#stick'),knob=stick.querySelector('i');let stickId=null;function moveStick(e){const r=stick.getBoundingClientRect(),x=e.clientX-(r.left+r.width/2),y=e.clientY-(r.top+r.height/2),len=Math.max(1,Math.hypot(x,y)),max=42,k=Math.min(1,max/len),dx=x*k,dy=y*k;knob.style.transform=`translate(${dx}px,${dy}px)`;moveVector={x:dx/max,y:-dy/max}}
stick.onpointerdown=e=>{stickId=e.pointerId;stick.setPointerCapture(e.pointerId);moveStick(e)};stick.onpointermove=e=>{if(e.pointerId===stickId)moveStick(e)};stick.onpointerup=stick.onpointercancel=e=>{if(e.pointerId===stickId){stickId=null;moveVector={x:0,y:0};knob.style.transform=''}};
})();
