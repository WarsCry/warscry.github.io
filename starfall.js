(()=>{
const canvas=document.querySelector('#game'),menu=document.querySelector('#menu'),msg=document.querySelector('#msg');
const healthText=document.querySelector('#health'),healthBar=document.querySelector('#healthBar'),ammoText=document.querySelector('#ammo'),leftText=document.querySelector('#left');
const hitMarker=document.querySelector('#hitMarker'),damage=document.querySelector('#damage'),muzzle=document.querySelector('#muzzle'),weapon=document.querySelector('#weapon');
if(!window.BABYLON){menu.querySelector('p').textContent='The 3D engine could not load. Check your connection and reload the mission.';return}

const engine=new BABYLON.Engine(canvas,true,{preserveDrawingBuffer:false,stencil:true,adaptToDeviceRatio:true});
if(matchMedia('(pointer:coarse)').matches)engine.setHardwareScalingLevel(Math.max(1,devicePixelRatio*.85));
let scene,camera,core,shadowGenerator,enemies=[],projectiles=[],started=false,health=100,ammo=40,kills=0,lastShot=0,aiming=false,moveVector={x:0,y:0},turnDirection=0;
const V=BABYLON.Vector3,C=BABYLON.Color3;

function material(name,diffuse,emissive=null,alpha=1){const m=new BABYLON.StandardMaterial(name,scene);m.diffuseColor=C.FromHexString(diffuse);m.specularColor=new C(.65,.75,.82);m.specularPower=96;m.alpha=alpha;if(emissive)m.emissiveColor=C.FromHexString(emissive);return m}
function pbr(name,color,metallic=.65,roughness=.42,emissive=null){const m=new BABYLON.PBRMaterial(name,scene);m.albedoColor=C.FromHexString(color);m.metallic=metallic;m.roughness=roughness;m.environmentIntensity=.7;if(emissive)m.emissiveColor=C.FromHexString(emissive);return m}
function texturedMaterial(name,url,uScale,vScale){const m=material(name,'#b9c2c8');const texture=new BABYLON.Texture(url,scene);texture.uScale=uScale;texture.vScale=vScale;texture.anisotropicFilteringLevel=8;m.diffuseTexture=texture;const bump=new BABYLON.Texture(url,scene);bump.uScale=uScale;bump.vScale=vScale;bump.level=.18;m.bumpTexture=bump;m.specularColor=new C(.36,.43,.48);m.specularPower=128;return m}
function box(name,size,pos,mat,collision=false){const mesh=BABYLON.MeshBuilder.CreateBox(name,size,scene);mesh.position.copyFrom(pos);mesh.material=mat;mesh.checkCollisions=collision;return mesh}

function buildScene(){
  scene=new BABYLON.Scene(engine);scene.clearColor=new BABYLON.Color4(.006,.012,.025,1);scene.collisionsEnabled=true;
  scene.fogMode=BABYLON.Scene.FOGMODE_EXP2;scene.fogDensity=.012;scene.fogColor=new C(.018,.055,.07);
  camera=new BABYLON.UniversalCamera('sentinel',new V(0,2,18),scene);camera.minZ=.08;camera.maxZ=90;camera.fov=.92;camera.speed=.38;camera.angularSensibility=2900;camera.inertia=.55;camera.ellipsoid=new V(.55,1,.55);camera.checkCollisions=true;
  camera.keysUp=[87];camera.keysDown=[83];camera.keysLeft=[65];camera.keysRight=[68];camera.attachControl(canvas,true);
  const hemi=new BABYLON.HemisphericLight('ship ambience',new V(0,1,0),scene);hemi.intensity=.54;hemi.diffuse=new C(.42,.58,.66);hemi.groundColor=new C(.08,.12,.16);
  const coreLight=new BABYLON.PointLight('core light',new V(0,4,0),scene);coreLight.diffuse=new C(.3,1,.78);coreLight.intensity=1.35;coreLight.range=24;
  const combatLight=new BABYLON.DirectionalLight('combat shadows',new V(-.45,-1,.25),scene);combatLight.position=new V(12,18,-8);combatLight.intensity=.42;shadowGenerator=new BABYLON.ShadowGenerator(1024,combatLight);shadowGenerator.useBlurExponentialShadowMap=true;shadowGenerator.blurKernel=24;
  const glow=new BABYLON.GlowLayer('neon bloom',scene,{blurKernelSize:48});glow.intensity=.46;
  const pipeline=new BABYLON.DefaultRenderingPipeline('cinematic ship pipeline',true,scene,[camera]);pipeline.fxaaEnabled=true;pipeline.samples=matchMedia('(pointer:coarse)').matches?1:4;pipeline.bloomEnabled=!matchMedia('(pointer:coarse)').matches;pipeline.bloomThreshold=.82;pipeline.bloomWeight=.13;pipeline.imageProcessing.contrast=1.14;pipeline.imageProcessing.exposure=1.08;

  const hull=texturedMaterial('curved hull','assets/starfall/hull-panels-v1.png',10,2),innerHull=texturedMaterial('inner hull panels','assets/starfall/hull-panels-v1.png',.24,1.05),metal=texturedMaterial('floor metal','assets/starfall/deck-panels-v1.png',1.35,1.35),metal2=material('floor inset','#080d13');metal.emissiveColor=new C(.035,.045,.05);
  const trim=material('alien trim','#123f3a','#075044'),purple=material('veyran alloy','#2d1750','#16052f');
  const dangerMat=material('warning light','#481824','#b4193f'),glass=material('observation glass','#07182b','#073e58',.72);

  const wall=BABYLON.MeshBuilder.CreateCylinder('rounded outer hull',{height:10,diameter:52,tessellation:64,cap:BABYLON.Mesh.NO_CAP},scene);wall.position.y=5;wall.material=hull;wall.material.backFaceCulling=false;wall.checkCollisions=true;
  const ceiling=BABYLON.MeshBuilder.CreateCylinder('armoured ceiling',{height:.35,diameter:52,tessellation:64},scene);ceiling.position.y=10;ceiling.material=metal2;
  const base=BABYLON.MeshBuilder.CreateCylinder('lower hull',{height:.38,diameter:52,tessellation:64},scene);base.position.y=-.22;base.material=metal2;base.checkCollisions=true;

  for(let x=-21;x<=21;x+=6)for(let z=-21;z<=21;z+=6)if(Math.hypot(x,z)<22.5){
    const panel=box('fixed deck panel',{width:5.72,height:.16,depth:5.72},new V(x,.02,z),((x+z)/6)%2?metal:metal2,true);panel.receiveShadows=true;
    const slit=box('deck energy seam',{width:5.1,height:.025,depth:.055},new V(x,.115,z+2.55),trim);slit.isPickable=false;
  }
  for(let i=0;i<24;i++){
    const a=i*Math.PI*2/24,r=25.25,rib=box('curved bulkhead rib',{width:.48,height:8.9,depth:1.05},new V(Math.sin(a)*r,4.7,Math.cos(a)*r),i%6===0?purple:trim,true);rib.rotation.y=a;rib.isPickable=false;
    const lamp=box('rib lamp',{width:.13,height:3.4,depth:1.12},new V(Math.sin(a)*24.68,5.15,Math.cos(a)*24.68),i%3===0?dangerMat:trim);lamp.rotation.y=a;lamp.isPickable=false;
  }
  // A circular inner bulkhead turns the arena into an outer passage and a protected core chamber.
  // Four wide gates keep navigation readable while removing the empty-room feeling.
  for(let i=0;i<48;i++){
    const a=i*Math.PI*2/48,gateDistance=Math.min(...[0,Math.PI/2,Math.PI,Math.PI*1.5,Math.PI*2].map(g=>Math.abs(a-g)));
    if(gateDistance<.2)continue;
    const r=9.7,section=box('inner curved bulkhead',{width:1.32,height:5.15,depth:.72},new V(Math.sin(a)*r,2.575,Math.cos(a)*r),innerHull,true);section.rotation.y=a;section.isPickable=true;
    if(i%4===0){const inset=box('bulkhead inset',{width:.62,height:3.8,depth:.08},new V(Math.sin(a)*9.3,3.1,Math.cos(a)*9.3),i%8===0?purple:trim);inset.rotation.y=a;inset.isPickable=false}
  }
  for(const [x,z] of [[-2.75,9.65],[2.75,9.65],[-2.75,-9.65],[2.75,-9.65],[9.65,-2.75],[9.65,2.75],[-9.65,-2.75],[-9.65,2.75]]){
    const column=BABYLON.MeshBuilder.CreateCylinder('rounded gate column',{height:6.4,diameter:1.05,tessellation:20},scene);column.position=new V(x,3.2,z);column.material=purple;column.checkCollisions=true;
    const beacon=BABYLON.MeshBuilder.CreateSphere('gate beacon',{diameter:.3,segments:10},scene);beacon.position=new V(x,5.8,z);beacon.material=trim;beacon.isPickable=false;
  }
  for(const [x,z] of [[0,12],[12,0],[0,-12],[-12,0]]){const gateLight=new BABYLON.PointLight('gate deck light',new V(x,2.2,z),scene);gateLight.diffuse=new C(.28,.75,.68);gateLight.intensity=.62;gateLight.range=12}
  for(const y of [.18,8.85]){const ring=BABYLON.MeshBuilder.CreateTorus('hull light ring',{diameter:49.2,thickness:.1,tessellation:72},scene);ring.position.y=y;ring.material=trim;ring.isPickable=false}

  for(const z of [-13,13])for(const x of [-13,13]){
    const pod=BABYLON.MeshBuilder.CreateCylinder('curved machinery pod',{height:3.2,diameter:3.8,tessellation:20},scene);pod.position=new V(x,1.6,z);pod.material=purple;pod.checkCollisions=true;
    const cap=BABYLON.MeshBuilder.CreateSphere('pod glow',{diameter:1.15,segments:16},scene);cap.position=new V(x,3.05,z);cap.material=trim;cap.isPickable=false;
    for(let j=-1;j<=1;j++){const pipe=BABYLON.MeshBuilder.CreateTube('bio conduit',{path:[new V(x+j*.5,3.2,z),new V(x+j*.5,6.8,z),new V(x+j*.8,8.5,z*.86)],radius:.09,tessellation:8},scene);pipe.material=trim;pipe.isPickable=false}
  }
  for(const z of [-24.55,24.55]){
    const door=box('rounded blast door',{width:7.5,height:6.6,depth:.35},new V(0,3.3,z),metal2,true);door.material=metal2;
    const top=BABYLON.MeshBuilder.CreateTorus('door arch',{diameter:7.5,thickness:.38,tessellation:32,arc:.5},scene);top.position=new V(0,5.9,z+(z>0?-.22:.22));top.rotation.x=Math.PI/2;top.material=trim;top.isPickable=false;
    for(const x of [-3.5,3.5])box('door light',{width:.18,height:5.4,depth:.48},new V(x,3,z+(z>0?-.25:.25)),dangerMat);
  }
  for(const a of [Math.PI/2,-Math.PI/2]){
    const pane=box('space window',{width:9,height:4.8,depth:.18},new V(Math.sin(a)*25.35,5,Math.cos(a)*25.35),glass);pane.rotation.y=a;pane.isPickable=false;
    for(let i=0;i<18;i++){const star=BABYLON.MeshBuilder.CreateSphere('distant star',{diameter:.04+Math.random()*.08,segments:4},scene);star.position=new V(Math.sin(a)*26.1+(Math.random()-.5)*.4,3+Math.random()*4,(Math.random()-.5)*8);star.material=material(`star${a}${i}`,'#ffffff','#bcecff');star.isPickable=false}
  }

  const dais=BABYLON.MeshBuilder.CreateCylinder('core dais',{height:.7,diameter:7,tessellation:32},scene);dais.position.y=.35;dais.material=purple;dais.checkCollisions=true;
  const coreRing=BABYLON.MeshBuilder.CreateTorus('core containment',{diameter:4.8,thickness:.32,tessellation:32},scene);coreRing.position.y=2.25;coreRing.material=trim;
  core=BABYLON.MeshBuilder.CreateSphere('living bio core',{diameter:3,segments:32},scene);core.position.y=2.4;core.material=material('living core','#4fffd9','#21c6a6');core.isPickable=false;
  const coreHalo=BABYLON.MeshBuilder.CreateTorus('core halo',{diameter:5.8,thickness:.08,tessellation:48},scene);coreHalo.position.y=2.4;coreHalo.rotation.x=Math.PI/2;coreHalo.material=trim;coreHalo.isPickable=false;

  scene.onBeforeRenderObservable.add(()=>{const t=performance.now()*.001;if(core){core.scaling.setAll(1+Math.sin(t*2.4)*.045);core.rotation.y=t*.25;coreHalo.rotation.z=t*.3}if(started)update(scene.getEngine().getDeltaTime()/1000,t)});
  return scene;
}

function capsule(name,height,radius,parent,pos,mat){const mesh=BABYLON.MeshBuilder.CreateCapsule(name,{height,radius,tessellation:12,subdivisions:3},scene);mesh.parent=parent;mesh.position.copyFrom(pos);mesh.material=mat;return mesh}
function createEnemy(x,z,index){
  const root=new BABYLON.TransformNode(`Rigged Solar Dominion trooper ${index}`,scene);root.position=new V(x,0,z);
  const gateOptions=[new V(0,0,10.8),new V(10.8,0,0),new V(0,0,-10.8),new V(-10.8,0,0)],gate=gateOptions.sort((a,b)=>V.DistanceSquared(a,root.position)-V.DistanceSquared(b,root.position))[0];
  const maxHp=index>4?110:78;root.metadata={enemyRoot:true,hp:maxHp,maxHp,alive:true,cool:1.1+Math.random(),speed:.7+Math.random()*.18,path:[gate,new V(0,0,0)],pathIndex:0,hitReact:0,recoil:0};
  const navy=pbr(`dominion navy ${index}`,'#172955',.72,.34),navyDark=pbr(`dominion undersuit ${index}`,'#080d18',.25,.68),gold=pbr(`solar gold ${index}`,'#9d742c',.82,.28),steel=pbr(`rifle metal ${index}`,'#151c24',.9,.25),visor=pbr(`helmet visor ${index}`,'#226ac6',.35,.18,'#0b5ab7'),red=pbr(`rank light ${index}`,'#531021',.35,.3,'#e51b4d');

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
  return root;
}
function resetEnemies(){enemies.forEach(e=>e.dispose(false,true));enemies=[];const positions=[[-18,-16],[-9,-21],[9,-20],[18,-13],[-20,7],[20,10],[0,13.5]];positions.forEach((p,i)=>enemies.push(createEnemy(p[0],p[1],i)))}

function show(text){msg.textContent=text;msg.classList.add('show');clearTimeout(show.timer);show.timer=setTimeout(()=>msg.classList.remove('show'),900)}
function animateClass(el,name){el.classList.remove(name);void el.offsetWidth;el.classList.add(name)}
function plasmaSound(hit=false){try{const ac=plasmaSound.ac||=new(window.AudioContext||window.webkitAudioContext)(),o=ac.createOscillator(),g=ac.createGain(),n=ac.currentTime;o.type=hit?'square':'sawtooth';o.frequency.setValueAtTime(hit?250:720,n);o.frequency.exponentialRampToValueAtTime(hit?90:180,n+.13);g.gain.setValueAtTime(.08,n);g.gain.exponentialRampToValueAtTime(.001,n+.14);o.connect(g);g.connect(ac.destination);o.start(n);o.stop(n+.15)}catch{}}
function impact(point,color='#ff315f'){
  for(let i=0;i<12;i++){const p=BABYLON.MeshBuilder.CreateSphere('impact particle',{diameter:.08+Math.random()*.09,segments:4},scene);p.position.copyFrom(point);p.material=material(`impact${Math.random()}`,color,color);p.isPickable=false;const v=new V((Math.random()-.5)*4,Math.random()*3,(Math.random()-.5)*4);let life=0;scene.onBeforeRenderObservable.add(function move(){const dt=engine.getDeltaTime()/1000;life+=dt;p.position.addInPlace(v.scale(dt));v.y-=5*dt;p.scaling.setAll(Math.max(0,1-life*2.2));if(life>.48){scene.onBeforeRenderObservable.removeCallback(move);p.dispose()}})}
}
function shoot(){
  if(!started||!ammo||performance.now()-lastShot<180)return;lastShot=performance.now();ammo--;ammoText.textContent=ammo;animateClass(muzzle,'show');weapon.animate([{transform:`translateX(-50%) translateY(${aiming?'5':'0'}vh) scale(${aiming?'.82':'1'})`},{transform:`translateX(-50%) translateY(${aiming?'7':'2'}vh) scale(${aiming?'.82':'1'})`},{transform:`translateX(-50%) translateY(${aiming?'5':'0'}vh) scale(${aiming?'.82':'1'})`}],{duration:150});plasmaSound();
  const pick=scene.pickWithRay(camera.getForwardRay(100));
  if(pick?.hit&&pick.pickedMesh.metadata?.enemy?.metadata?.alive){const enemy=pick.pickedMesh.metadata.enemy;enemy.metadata.hp-=aiming?58:42;enemy.metadata.hitReact=1;const ratio=Math.max(0,enemy.metadata.hp/enemy.metadata.maxHp);enemy.metadata.parts.healthFill.scaling.x=ratio;enemy.metadata.parts.healthFill.position.x=-(1-ratio)*.55;impact(pick.pickedPoint);animateClass(hitMarker,'show');plasmaSound(true);show(enemy.metadata.hp>0?'✕ ARMOUR HIT':'✕ CRITICAL PLASMA IMPACT');if(enemy.metadata.hp<=0)killEnemy(enemy)}else{if(pick?.hit)impact(pick.pickedPoint,'#65ffe0');show('SHOT MISSED')}
}
function killEnemy(enemy){enemy.metadata.alive=false;kills++;leftText.textContent=`HOSTILES: ${enemies.length-kills}`;show('DOMINION TROOPER NEUTRALIZED');enemy.getChildMeshes().forEach(m=>m.isPickable=false);BABYLON.Animation.CreateAndStartAnimation('trooper fall',enemy,'rotation.z',60,34,0,Math.PI*.48,BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);BABYLON.Animation.CreateAndStartAnimation('trooper drop',enemy,'position.y',60,34,enemy.position.y,enemy.position.y-.5,BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,null,()=>setTimeout(()=>enemy.setEnabled(false),450));if(kills===enemies.length)setTimeout(()=>end(true),1000)}
function enemyBolt(enemy){
  const muzzlePoint=enemy.metadata.parts.muzzle;muzzlePoint.computeWorldMatrix(true);const origin=muzzlePoint.getAbsolutePosition().clone(),target=camera.position.clone(),bolt=BABYLON.MeshBuilder.CreateSphere('solar bolt',{diameter:.22,segments:8},scene);enemy.metadata.recoil=1;bolt.position.copyFrom(origin);bolt.material=material(`bolt${Math.random()}`,'#ffb02e','#ff6a00');bolt.isPickable=false;const start=performance.now(),duration=520;
  projectiles.push(bolt);scene.onBeforeRenderObservable.add(function fly(){const k=Math.min(1,(performance.now()-start)/duration);bolt.position=BABYLON.Vector3.Lerp(origin,target,k);bolt.scaling.setAll(1+k*1.4);if(k>=1){scene.onBeforeRenderObservable.removeCallback(fly);bolt.dispose();projectiles=projectiles.filter(x=>x!==bolt);takeDamage(5+Math.floor(Math.random()*4))}});
}
function takeDamage(amount){if(!started)return;health=Math.max(0,health-amount);healthText.textContent=health;healthBar.style.width=`${health}%`;animateClass(damage,'show');show('SOLAR BOLT IMPACT');if(!health)end(false)}
function update(dt,t){
  if(turnDirection)camera.rotation.y+=turnDirection*dt*1.7;
  if(moveVector.x||moveVector.y){const forward=new V(Math.sin(camera.rotation.y),0,Math.cos(camera.rotation.y)),right=new V(forward.z,0,-forward.x),movement=forward.scale(moveVector.y*dt*5).add(right.scale(moveVector.x*dt*5));camera.cameraDirection.addInPlace(movement)}
  for(const enemy of enemies){if(!enemy.metadata.alive||!enemy.isEnabled())continue;const toCore=core.position.subtract(enemy.position),distance=Math.hypot(toCore.x,toCore.z),toPlayer=camera.position.subtract(enemy.position),playerDistance=Math.hypot(toPlayer.x,toPlayer.z);enemy.rotation.y=Math.atan2(toPlayer.x,toPlayer.z)+Math.PI;enemy.metadata.cool-=dt;
    const pathTarget=enemy.metadata.path[Math.min(enemy.metadata.pathIndex,enemy.metadata.path.length-1)],toTarget=pathTarget.subtract(enemy.position),pathDistance=Math.hypot(toTarget.x,toTarget.z),walking=enemy.metadata.pathIndex<enemy.metadata.path.length-1||distance>4.1;
    if(pathDistance<1.25&&enemy.metadata.pathIndex<enemy.metadata.path.length-1)enemy.metadata.pathIndex++;
    const rig=enemy.metadata.parts,phase=t*7.2+enemy.uniqueId,stride=walking?Math.sin(phase):0;rig.hips.position.y=1.45+(walking?Math.abs(Math.sin(phase*2))*.035:0);rig.hipsRig[0].rotation.x=stride*.58;rig.hipsRig[1].rotation.x=-stride*.58;rig.knees[0].rotation.x=Math.max(0,-stride)*.72;rig.knees[1].rotation.x=Math.max(0,stride)*.72;rig.shoulders[0].rotation.x=-stride*.32-.28;rig.shoulders[1].rotation.x=stride*.2-.72;rig.elbows[0].rotation.x=-.18;rig.elbows[1].rotation.x=-.72-enemy.metadata.recoil*.28;rig.spine.rotation.y=walking?Math.sin(phase)*.055:0;if(enemy.metadata.hitReact>0){rig.spine.rotation.z=Math.sin(enemy.metadata.hitReact*Math.PI)*.22;enemy.metadata.hitReact=Math.max(0,enemy.metadata.hitReact-dt*4.5)}else rig.spine.rotation.z=0;enemy.metadata.recoil=Math.max(0,enemy.metadata.recoil-dt*5);
    if(distance>4.1){const activeTarget=enemy.metadata.path[Math.min(enemy.metadata.pathIndex,enemy.metadata.path.length-1)],stepTarget=activeTarget.subtract(enemy.position);stepTarget.y=0;if(stepTarget.lengthSquared()>.01){const step=stepTarget.normalize().scale(enemy.metadata.speed*dt);enemy.position.addInPlace(step);enemy.rotation.y=Math.atan2(step.x,step.z)+Math.PI}}else{enemy.metadata.cool-=dt*1.4;if(enemy.metadata.cool<0){enemy.metadata.cool=1.25;takeDamage(8);show('BIO-CORE UNDER ATTACK')}}
    if(playerDistance<17&&enemy.metadata.cool<0){enemy.metadata.cool=.85+Math.random()*.75;enemyBolt(enemy)}
  }
}
function setAim(value){aiming=value;document.body.classList.toggle('aiming',value);if(camera)camera.fov=value?.58:.92}
function end(win){started=false;document.exitPointerLock?.();menu.classList.remove('hidden');menu.querySelector('h1').innerHTML=win?'DECK SECURED<br><span>VICTORY</span>':'BIO-CORE LOST<br><span>DEFEAT</span>';menu.querySelectorAll('p')[0].textContent=win?'The living ship is free. The Solar Dominion boarding force has fallen.':'The Dominion destroyed the living core. Reinitialize the defence protocol and fight again.';document.querySelector('#start').textContent='RESTART MISSION'}
function reset(){health=100;ammo=40;kills=0;camera.position.copyFromFloats(0,2,18);camera.rotation.copyFromFloats(0,Math.PI,0);resetEnemies();healthText.textContent=health;ammoText.textContent=ammo;leftText.textContent=`HOSTILES: ${enemies.length}`;healthBar.style.width='100%';setAim(false)}

buildScene();reset();engine.runRenderLoop(()=>scene.render());addEventListener('resize',()=>engine.resize());
document.querySelector('#start').onclick=()=>{reset();started=true;menu.classList.add('hidden');canvas.requestPointerLock?.()};
canvas.addEventListener('contextmenu',e=>e.preventDefault());addEventListener('mousedown',e=>{if(e.button===2)setAim(true);else if(e.button===0)shoot()});addEventListener('mouseup',e=>{if(e.button===2)setAim(false)});addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();shoot()}});
document.querySelector('#fire').onpointerdown=e=>{e.preventDefault();shoot()};document.querySelector('#touchAim').onpointerdown=e=>{e.preventDefault();setAim(!aiming)};
document.querySelectorAll('[data-turn]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();turnDirection=Number(b.dataset.turn)};b.onpointerup=b.onpointercancel=()=>turnDirection=0});
const stick=document.querySelector('#stick'),knob=stick.querySelector('i');let stickId=null;function moveStick(e){const r=stick.getBoundingClientRect(),x=e.clientX-(r.left+r.width/2),y=e.clientY-(r.top+r.height/2),len=Math.max(1,Math.hypot(x,y)),max=42,k=Math.min(1,max/len),dx=x*k,dy=y*k;knob.style.transform=`translate(${dx}px,${dy}px)`;moveVector={x:dx/max,y:-dy/max}}
stick.onpointerdown=e=>{stickId=e.pointerId;stick.setPointerCapture(e.pointerId);moveStick(e)};stick.onpointermove=e=>{if(e.pointerId===stickId)moveStick(e)};stick.onpointerup=stick.onpointercancel=e=>{if(e.pointerId===stickId){stickId=null;moveVector={x:0,y:0};knob.style.transform=''}};
})();
