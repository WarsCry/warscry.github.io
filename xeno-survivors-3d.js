(() => {
  'use strict';
  const canvas=document.querySelector('#world3d');
  if(!canvas||!window.BABYLON||!window.XenoSurvivorsView)return;
  const B=window.BABYLON,V=B.Vector3,C=B.Color3;
  try{
    const engine=new B.Engine(canvas,true,{preserveDrawingBuffer:false,stencil:false,premultipliedAlpha:true,alpha:true},true);
    engine.setHardwareScalingLevel(Math.max(1,(devicePixelRatio||1)/1.45));
    const scene=new B.Scene(engine);scene.clearColor=new B.Color4(0,0,0,0);scene.autoClear=true;scene.skipPointerMovePicking=true;
    const camera=new B.FreeCamera('xeno top camera',new V(0,800,0),scene);camera.upVector=new V(0,0,1);camera.setTarget(V.Zero());camera.mode=B.Camera.ORTHOGRAPHIC_CAMERA;camera.minZ=.1;camera.maxZ=1200;
    const hemi=new B.HemisphericLight('hive ambient',new V(-.4,1,-.35),scene);hemi.intensity=1.05;hemi.diffuse=C.FromHexString('#b8eaff');hemi.groundColor=C.FromHexString('#092520');
    const key=new B.DirectionalLight('hive key',new V(-.6,-1,.45),scene);key.position=new V(180,350,-220);key.intensity=1.18;key.diffuse=C.FromHexString('#d8fff2');
    const rim=new B.DirectionalLight('violet rim',new V(.8,-.65,-.4),scene);rim.position=new V(-220,240,200);rim.intensity=.48;rim.diffuse=C.FromHexString('#b27aff');
    const glow=new B.GlowLayer('unit glow',scene,{blurKernelSize:20});glow.intensity=.48;

    function pbr(name,color,metal=.55,rough=.38,emissive=null){const m=new B.PBRMaterial(name,scene);m.albedoColor=C.FromHexString(color);m.metallic=metal;m.roughness=rough;m.environmentIntensity=.48;if(emissive)m.emissiveColor=C.FromHexString(emissive);return m}
    const mats={
      dark:pbr('carbon armour','#111a20',.78,.48),metal:pbr('brushed alloy','#4b575c',.86,.4),silver:pbr('aircraft alloy','#3c4852',.88,.34),olive:pbr('military olive','#3f4d3b',.58,.58),
      green:pbr('veyran skin','#4fbd5f',.05,.55,'#123f22'),lime:pbr('veyran life glow','#baff68',.08,.3,'#75df3e'),black:pbr('deep black','#02080c',.2,.25),
      cyan:pbr('cyan systems','#36bfd0',.25,.28,'#146c78'),violet:pbr('violet systems','#8161b9',.3,.34,'#34205e'),gold:pbr('gold systems','#a88238',.5,.4,'#4e310b'),
      red:pbr('hostile systems','#a83246',.4,.36,'#5d1322'),glass:pbr('cockpit glass','#153c50',.42,.12,'#0a2432'),orange:pbr('engine heat','#d86922',.15,.3,'#c03d0c')
    };
    const shadowMat=new B.StandardMaterial('soft unit shadow',scene);shadowMat.diffuseColor=C.Black();shadowMat.emissiveColor=C.Black();shadowMat.alpha=.24;shadowMat.disableLighting=true;

    function attach(mesh,parent,mat,pos){mesh.parent=parent;if(mat)mesh.material=mat;if(pos)mesh.position.copyFrom(pos);mesh.isPickable=false;return mesh}
    function shadow(parent,diameter,flatten=.72){const mesh=attach(B.MeshBuilder.CreateCylinder('soft shadow',{height:.18,diameter,tessellation:24},scene),parent,shadowMat,new V(0,.08,0));mesh.scaling.z=flatten;return mesh}
    function box(parent,name,size,pos,mat){return attach(B.MeshBuilder.CreateBox(name,size,scene),parent,mat,pos)}
    function panel(parent,name,size,pos,mat,rotation){const mesh=box(parent,name,size,pos,mat);if(rotation)mesh.rotation.copyFrom(rotation);return mesh}
    function sphere(parent,name,diameter,pos,mat,scale){const mesh=attach(B.MeshBuilder.CreateSphere(name,{diameter,segments:14},scene),parent,mat,pos);if(scale)mesh.scaling.copyFrom(scale);return mesh}
    function cylinder(parent,name,options,pos,mat,rotation){const mesh=attach(B.MeshBuilder.CreateCylinder(name,options,scene),parent,mat,pos);if(rotation)mesh.rotation.copyFrom(rotation);return mesh}
    function capsule(parent,name,options,pos,mat,rotation){const mesh=attach(B.MeshBuilder.CreateCapsule(name,options,scene),parent,mat,pos);if(rotation)mesh.rotation.copyFrom(rotation);return mesh}

    function alienModel(){
      const root=new B.TransformNode('3d veyran hero',scene);root.metadata={baseY:1,kind:'alien'};root.scaling.setAll(1.22);shadow(root,45,.7);
      capsule(root,'organic alien torso',{height:31,radius:9,tessellation:16},new V(0,18,0),mats.green);
      panel(root,'alien shoulder armour',{width:29,height:5,depth:12},new V(0,26,0),mats.olive);
      const head=sphere(root,'organic alien head',31,new V(0,43,0),mats.green,new V(1.16,.78,.94));
      for(const x of [-7,7])sphere(root,'black alien eye',9,new V(x,51,-5),mats.black,new V(.7,.3,1));
      cylinder(root,'alien antenna',{height:14,diameter:2,tessellation:10},new V(0,60,2),mats.green);sphere(root,'alien antenna glow',6,new V(0,68,2),mats.lime);
      for(const side of [-1,1]){
        capsule(root,'alien arm',{height:25,radius:3,tessellation:10},new V(side*13,19,0),mats.green,new V(0,0,side*.5));
        capsule(root,'alien leg',{height:21,radius:3.3,tessellation:10},new V(side*6,2,0),mats.green,new V(0,0,side*.18));
      }
      sphere(root,'alien chest core',10,new V(0,29,-7),mats.lime,new V(1,.35,1));
      panel(root,'alien field rifle',{width:31,height:5,depth:6},new V(10,24,-12),mats.dark,new V(0,-.12,-.28));head.receiveShadows=true;return root;
    }

    function tankModel(){
      const root=new B.TransformNode('3d dominion tank',scene);root.metadata={baseY:1,kind:'tank'};shadow(root,70,.78);
      for(const z of [-21,21]){
        box(root,'armoured tank track',{width:68,height:10,depth:12},new V(-2,7,z),mats.dark);
        for(const x of [-25,-12,1,14,27])cylinder(root,'recessed road wheel',{height:13,diameter:10,tessellation:16},new V(x,7,z),mats.black,new V(Math.PI/2,0,0));
        panel(root,'track side armour',{width:54,height:8,depth:2},new V(-1,13,z+(z>0?6:-6)),mats.olive);
      }
      box(root,'tank lower hull',{width:61,height:13,depth:37},new V(-2,14,0),mats.olive);
      panel(root,'tank glacis plate',{width:17,height:12,depth:35},new V(30,18,0),mats.metal,new V(0,0,-.28));
      for(const z of [-13,13])for(const x of [-15,2,19])panel(root,'reactive armour block',{width:12,height:5,depth:7},new V(x,23,z),mats.metal);
      cylinder(root,'octagonal tank turret',{height:12,diameter:31,tessellation:8},new V(1,29,0),mats.olive);
      panel(root,'turret rear bustle',{width:19,height:10,depth:27},new V(-14,29,0),mats.dark);
      box(root,'long tank cannon',{width:48,height:5,depth:5},new V(31,33,0),mats.metal);
      cylinder(root,'cannon muzzle brake',{height:8,diameter:8,tessellation:8},new V(55,33,0),mats.dark,new V(0,0,Math.PI/2));
      cylinder(root,'commander hatch',{height:3,diameter:12,tessellation:16},new V(-1,37,-7),mats.dark);
      sphere(root,'tank optic',5,new V(8,37,-9),mats.red);
      cylinder(root,'radio antenna',{height:22,diameter:1.2,tessellation:6},new V(-10,46,9),mats.dark);return root;
    }

    function jetModel(){
      const root=new B.TransformNode('3d dominion jet',scene);root.metadata={baseY:18,kind:'jet'};shadow(root,72,.55);
      cylinder(root,'jet fuselage',{height:63,diameterTop:6,diameterBottom:13,tessellation:18},new V(0,12,0),mats.silver,new V(0,0,-Math.PI/2));
      cylinder(root,'pointed jet nose',{height:22,diameterTop:0,diameterBottom:8,tessellation:18},new V(41,12,0),mats.metal,new V(0,0,-Math.PI/2));
      for(const side of [-1,1]){
        panel(root,'swept delta wing',{width:43,height:3,depth:13},new V(-5,10,side*19),mats.silver,new V(0,side*.58,0));
        panel(root,'tail stabilizer',{width:20,height:2.5,depth:7},new V(-27,12,side*10),mats.metal,new V(0,side*.48,0));
        cylinder(root,'underwing missile',{height:22,diameterTop:2,diameterBottom:4,tessellation:10},new V(4,6,side*22),mats.red,new V(0,0,-Math.PI/2));
      }
      panel(root,'vertical tail fin',{width:17,height:19,depth:3},new V(-25,20,0),mats.olive,new V(0,0,-.2));
      sphere(root,'dark jet canopy',17,new V(13,18,0),mats.glass,new V(1.35,.52,.55));
      for(const z of [-5,5]){cylinder(root,'engine nacelle',{height:20,diameter:8,tessellation:14},new V(-25,11,z),mats.dark,new V(0,0,Math.PI/2));sphere(root,'jet engine flare',6,new V(-36,11,z),mats.orange,new V(.4,.72,.72))}return root;
    }

    function helicopterModel(){
      const root=new B.TransformNode('3d dominion helicopter',scene);root.metadata={baseY:15,kind:'helicopter'};shadow(root,74,.55);
      sphere(root,'helicopter armoured cabin',36,new V(11,18,0),mats.olive,new V(1.3,.72,.86));sphere(root,'faceted helicopter cockpit',24,new V(25,20,0),mats.glass,new V(.82,.58,.78));
      const tail=panel(root,'tapered helicopter tail',{width:58,height:7,depth:8},new V(-28,20,0),mats.dark,new V(0,0,.08));
      panel(root,'helicopter tail fin',{width:13,height:24,depth:4},new V(-56,28,0),mats.olive,new V(0,0,-.16));
      for(const z of [-17,17]){
        panel(root,'weapon pylon',{width:30,height:4,depth:6},new V(7,13,z),mats.metal,new V(0,0,0));
        for(const x of [-2,9,20])cylinder(root,'rocket pod',{height:15,diameter:5,tessellation:12},new V(x,10,z),mats.dark,new V(0,0,Math.PI/2));
        const skid=panel(root,'landing skid',{width:45,height:2.5,depth:3},new V(5,2,z*.78),mats.metal);cylinder(root,'skid strut',{height:13,diameter:2,tessellation:8},new V(-7,8,z*.78),mats.metal,new V(.35,0,0));cylinder(root,'skid strut',{height:13,diameter:2,tessellation:8},new V(17,8,z*.78),mats.metal,new V(.35,0,0));
      }
      const mast=cylinder(root,'rotor mast',{height:14,diameter:3,tessellation:10},new V(4,31,0),mats.dark);
      const rotor=new B.TransformNode('animated helicopter rotor',scene);rotor.parent=root;rotor.position=new V(4,39,0);for(let i=0;i<5;i++){const blade=panel(rotor,'five blade rotor',{width:94,height:1.4,depth:4},V.Zero(),mats.silver,new V(0,i*Math.PI/5,0));blade.position.x=Math.cos(i*Math.PI*2/5)*3;blade.position.z=Math.sin(i*Math.PI*2/5)*3}
      const tailRotor=new B.TransformNode('animated tail rotor',scene);tailRotor.parent=root;tailRotor.position=new V(-57,30,-4);tailRotor.rotation.x=Math.PI/2;for(const angle of [0,Math.PI/3,Math.PI*2/3])panel(tailRotor,'tail rotor blade',{width:21,height:1.5,depth:3},V.Zero(),mats.red,new V(0,angle,0));
      root.metadata.rotor=rotor;root.metadata.tailRotor=tailRotor;return root;
    }

    function apcModel(){
      const root=new B.TransformNode('3d dominion armoured carrier',scene);root.metadata={baseY:1,kind:'apc'};shadow(root,59,.75);
      box(root,'apc lower hull',{width:61,height:15,depth:35},new V(-2,13,0),mats.olive);
      panel(root,'sloped apc glacis',{width:17,height:15,depth:33},new V(29,18,0),mats.metal,new V(0,0,-.3));
      box(root,'apc troop compartment',{width:37,height:12,depth:29},new V(-9,25,0),mats.olive);
      for(const x of [-22,-8,8,22])for(const z of [-20,20]){cylinder(root,'eight apc wheels',{height:8,diameter:13,tessellation:16},new V(x,8,z),mats.black,new V(Math.PI/2,0,0));cylinder(root,'wheel hub',{height:9,diameter:5,tessellation:12},new V(x,8,z),mats.metal,new V(Math.PI/2,0,0))}
      for(const z of [-13,13])for(const x of [-15,0,15])panel(root,'apc side armour',{width:11,height:7,depth:3},new V(x,20,z),mats.metal);
      cylinder(root,'remote weapon turret',{height:8,diameter:19,tessellation:10},new V(3,35,0),mats.dark);box(root,'apc autocannon',{width:32,height:4,depth:4},new V(20,37,0),mats.metal);
      sphere(root,'apc sensor cupola',7,new V(-8,36,-7),mats.cyan);return root;
    }

    function saucerModel(name,scale=1,hostile=false){
      const root=new B.TransformNode(name,scene);root.metadata={baseY:hostile?24:18,kind:hostile?'boss':'saucer'};shadow(root,55*scale,.72);
      const hull=sphere(root,'saucer metal hull',34*scale,new V(0,15*scale,0),hostile?mats.metal:mats.silver,new V(1.55,.24,1.15));
      const rimMesh=attach(B.MeshBuilder.CreateTorus('saucer luminous rim',{diameter:43*scale,thickness:3.3*scale,tessellation:28},scene),root,hostile?mats.red:mats.lime,new V(0,15*scale,0));
      sphere(root,'saucer glass dome',21*scale,new V(0,20*scale,0),hostile?mats.glass:mats.cyan,new V(1,.48,1));
      attach(B.MeshBuilder.CreateTorus('saucer armour ring',{diameter:31*scale,thickness:2*scale,tessellation:32},scene),root,mats.dark,new V(0,18*scale,0));
      for(const z of [-1,1])box(root,'saucer plasma cannon',{width:15*scale,height:3*scale,depth:3*scale},new V(18*scale,15*scale,z*8*scale),hostile?mats.red:mats.cyan);
      for(let i=0;i<6;i++){const a=i*Math.PI/3;sphere(root,'saucer running light',3.4*scale,new V(Math.cos(a)*19*scale,15*scale,Math.sin(a)*14*scale),hostile?mats.red:mats.lime)}
      root.metadata.rim=rimMesh;hull.receiveShadows=true;return root;
    }

    const hero=alienModel(),companion=saucerModel('friendly 3d flying saucer',.76,false);let lastPlayer={x:0,y:0};
    const enemyModels=new Map();
    function enemyModel(enemy){if(enemy.boss)return saucerModel(`3d boss saucer ${enemy.stage}`,1.25+enemy.stage*.17,true);if(enemy.type==='jet')return jetModel();if(enemy.type==='tank')return tankModel();if(enemy.type==='helicopter')return helicopterModel();return apcModel()}
    function updateCamera(){const w=innerWidth,h=innerHeight;camera.orthoLeft=-w/2;camera.orthoRight=w/2;camera.orthoTop=h/2;camera.orthoBottom=-h/2}
    updateCamera();addEventListener('resize',()=>{engine.resize();updateCamera()});

    function sync(){
      const state=window.XenoSurvivorsView.getState();if(!state)return;
      const dx=state.player.x-lastPlayer.x,dy=state.player.y-lastPlayer.y;if(Math.hypot(dx,dy)>.08)hero.rotation.y=Math.atan2(dy,dx);lastPlayer={x:state.player.x,y:state.player.y};
      hero.setEnabled(state.playing);hero.position.set(0,1,0);hero.position.y=1+Math.sin(state.elapsed*5)*1.1;
      companion.setEnabled(state.playing);const orbit=state.elapsed*1.25;companion.position.set(Math.cos(orbit)*76,25+Math.sin(state.elapsed*3)*3,-Math.sin(orbit)*62);companion.rotation.y=-orbit*2.2;companion.metadata.rim.rotation.y=state.elapsed*2.8;
      const active=new Set();
      state.enemies.forEach(enemy=>{
        if(enemy.dead)return;const x=enemy.x-state.player.x,z=-(enemy.y-state.player.y),visible=Math.abs(x)<state.width*.65+130&&Math.abs(z)<state.height*.65+130;let root=enemyModels.get(enemy);
        if(!visible){if(root)root.setEnabled(false);return}
        active.add(enemy);if(!root){root=enemyModel(enemy);root.scaling.setAll(enemy.boss?1.12:1.18);enemyModels.set(enemy,root)}root.setEnabled(true);root.position.x=x;root.position.z=z;root.position.y=root.metadata.baseY+(enemy.aircraft||enemy.boss?Math.sin(state.elapsed*3+enemy.phase)*3:0);root.rotation.y=Math.atan2(state.player.y-enemy.y,state.player.x-enemy.x);
        if(root.metadata.kind==='jet')root.rotation.z=Math.sin(enemy.phase*1.7)*.14;
        if(root.metadata.rotor)root.metadata.rotor.rotation.y=state.elapsed*10;
        if(root.metadata.tailRotor)root.metadata.tailRotor.rotation.y=state.elapsed*14;
        if(root.metadata.rim)root.metadata.rim.rotation.y=state.elapsed*2.5;
      });
      for(const [enemy,root] of enemyModels){if(!state.enemies.includes(enemy)||enemy.dead){root.dispose();enemyModels.delete(enemy)}else if(!active.has(enemy))root.setEnabled(false)}
    }
    window.Xeno3DReady=true;
    engine.runRenderLoop(()=>{sync();scene.render()});
  }catch(error){console.warn('Xeno 3D layer unavailable; using the 2D fallback.',error);window.Xeno3DReady=false}
})();
