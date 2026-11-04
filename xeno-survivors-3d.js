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
    const hemi=new B.HemisphericLight('hive ambient',new V(-.4,1,-.35),scene);hemi.intensity=1.5;hemi.diffuse=C.FromHexString('#b8eaff');hemi.groundColor=C.FromHexString('#092520');
    const key=new B.DirectionalLight('hive key',new V(-.6,-1,.45),scene);key.position=new V(180,350,-220);key.intensity=1.8;key.diffuse=C.FromHexString('#d8fff2');
    const rim=new B.DirectionalLight('violet rim',new V(.8,-.65,-.4),scene);rim.position=new V(-220,240,200);rim.intensity=.72;rim.diffuse=C.FromHexString('#b27aff');
    const glow=new B.GlowLayer('unit glow',scene,{blurKernelSize:20});glow.intensity=.48;

    function pbr(name,color,metal=.55,rough=.38,emissive=null){const m=new B.PBRMaterial(name,scene);m.albedoColor=C.FromHexString(color);m.metallic=metal;m.roughness=rough;m.environmentIntensity=.72;if(emissive)m.emissiveColor=C.FromHexString(emissive);return m}
    const mats={
      dark:pbr('carbon armour','#18242c',.78,.35),metal:pbr('brushed alloy','#65737c',.9,.25),silver:pbr('aircraft alloy','#91a0a7',.94,.2),
      green:pbr('veyran skin','#4fbd5f',.05,.55,'#123f22'),lime:pbr('veyran life glow','#baff68',.08,.3,'#75df3e'),black:pbr('deep black','#02080c',.2,.25),
      cyan:pbr('cyan systems','#4fe8ff',.25,.22,'#22a9bd'),violet:pbr('violet systems','#a879ff',.3,.25,'#643bd1'),gold:pbr('gold systems','#ffbd55',.45,.26,'#c66e18'),
      red:pbr('hostile systems','#ff5875',.35,.24,'#b92d49'),glass:pbr('cockpit glass','#317795',.22,.08,'#133b55'),orange:pbr('engine heat','#ff922f',.15,.25,'#ff5d18')
    };
    const shadowMat=new B.StandardMaterial('soft unit shadow',scene);shadowMat.diffuseColor=C.Black();shadowMat.emissiveColor=C.Black();shadowMat.alpha=.24;shadowMat.disableLighting=true;

    function attach(mesh,parent,mat,pos){mesh.parent=parent;if(mat)mesh.material=mat;if(pos)mesh.position.copyFrom(pos);mesh.isPickable=false;return mesh}
    function shadow(parent,diameter,flatten=.72){const mesh=attach(B.MeshBuilder.CreateCylinder('soft shadow',{height:.18,diameter,tessellation:24},scene),parent,shadowMat,new V(0,.08,0));mesh.scaling.z=flatten;return mesh}
    function box(parent,name,size,pos,mat){return attach(B.MeshBuilder.CreateBox(name,size,scene),parent,mat,pos)}
    function sphere(parent,name,diameter,pos,mat,scale){const mesh=attach(B.MeshBuilder.CreateSphere(name,{diameter,segments:14},scene),parent,mat,pos);if(scale)mesh.scaling.copyFrom(scale);return mesh}
    function cylinder(parent,name,options,pos,mat,rotation){const mesh=attach(B.MeshBuilder.CreateCylinder(name,options,scene),parent,mat,pos);if(rotation)mesh.rotation.copyFrom(rotation);return mesh}
    function capsule(parent,name,options,pos,mat,rotation){const mesh=attach(B.MeshBuilder.CreateCapsule(name,options,scene),parent,mat,pos);if(rotation)mesh.rotation.copyFrom(rotation);return mesh}

    function alienModel(){
      const root=new B.TransformNode('3d veyran hero',scene);root.metadata={baseY:1,kind:'alien'};shadow(root,43,.7);
      capsule(root,'organic alien torso',{height:31,radius:9,tessellation:12},new V(0,18,0),mats.green);
      const head=sphere(root,'organic alien head',29,new V(0,42,0),mats.green,new V(1.12,.82,.92));
      for(const x of [-6,6])sphere(root,'black alien eye',8,new V(x,51,-1),mats.black,new V(.72,.22,1));
      cylinder(root,'alien antenna',{height:13,diameter:2,tessellation:8},new V(0,59,0),mats.green);sphere(root,'alien antenna glow',6,new V(0,66,0),mats.lime);
      for(const side of [-1,1]){
        capsule(root,'alien arm',{height:23,radius:2.6,tessellation:8},new V(side*12,20,0),mats.green,new V(0,0,side*.5));
        capsule(root,'alien leg',{height:20,radius:3,tessellation:8},new V(side*6,2,0),mats.green,new V(0,0,side*.18));
      }
      sphere(root,'alien chest core',9,new V(0,26,-7),mats.lime,new V(1,.28,1));head.receiveShadows=true;return root;
    }

    function tankModel(){
      const root=new B.TransformNode('3d dominion tank',scene);root.metadata={baseY:1,kind:'tank'};shadow(root,70,.78);
      for(const z of [-19,19]){const track=box(root,'tank track',{width:61,height:9,depth:10},new V(-2,7,z),mats.dark);for(const x of [-21,-7,7,21])cylinder(root,'track wheel',{height:11,diameter:9,tessellation:12},new V(x,7,z),mats.black,new V(Math.PI/2,0,0))}
      box(root,'tank hull',{width:53,height:15,depth:35},new V(-2,13,0),mats.metal);box(root,'tank sloped nose',{width:15,height:11,depth:31},new V(28,17,0),mats.violet);
      cylinder(root,'tank turret',{height:11,diameter:27,tessellation:18},new V(2,25,0),mats.metal);box(root,'tank cannon',{width:38,height:6,depth:6},new V(24,27,0),mats.violet);
      sphere(root,'tank sight',6,new V(6,32,-6),mats.red);return root;
    }

    function jetModel(){
      const root=new B.TransformNode('3d dominion jet',scene);root.metadata={baseY:18,kind:'jet'};shadow(root,72,.55);
      cylinder(root,'jet fuselage',{height:50,diameterTop:8,diameterBottom:12,tessellation:14},new V(1,10,0),mats.silver,new V(0,0,-Math.PI/2));
      cylinder(root,'jet nose',{height:18,diameterTop:0,diameterBottom:11,tessellation:14},new V(31,10,0),mats.red,new V(0,0,-Math.PI/2));
      const wing=box(root,'jet swept wing',{width:29,height:3,depth:65},new V(-4,9,0),mats.metal);wing.rotation.y=-.1;
      box(root,'jet tail wing',{width:14,height:3,depth:30},new V(-23,10,0),mats.metal);box(root,'jet tail fin',{width:13,height:15,depth:3},new V(-22,17,0),mats.red);
      sphere(root,'jet canopy',15,new V(10,17,0),mats.glass,new V(1.1,.52,.58));
      for(const z of [-5,5])sphere(root,'jet engine flare',6,new V(-28,11,z),mats.orange,new V(.45,.7,.7));return root;
    }

    function helicopterModel(){
      const root=new B.TransformNode('3d dominion helicopter',scene);root.metadata={baseY:15,kind:'helicopter'};shadow(root,74,.55);
      sphere(root,'helicopter cabin',32,new V(10,16,0),mats.metal,new V(1.25,.68,.82));sphere(root,'helicopter cockpit',21,new V(21,19,0),mats.glass,new V(.8,.54,.75));
      const tail=box(root,'helicopter tail',{width:48,height:6,depth:7},new V(-23,18,0),mats.dark);tail.rotation.z=.07;
      box(root,'helicopter tail fin',{width:10,height:20,depth:4},new V(-47,25,0),mats.cyan);
      const mast=cylinder(root,'rotor mast',{height:14,diameter:3,tessellation:10},new V(4,31,0),mats.dark);
      const rotor=new B.TransformNode('animated helicopter rotor',scene);rotor.parent=root;rotor.position=new V(4,39,0);for(const angle of [0,Math.PI/2]){const blade=box(rotor,'rotor blade',{width:84,height:2,depth:5},V.Zero(),mats.silver);blade.rotation.y=angle}
      const tailRotor=new B.TransformNode('animated tail rotor',scene);tailRotor.parent=root;tailRotor.position=new V(-48,28,-4);tailRotor.rotation.x=Math.PI/2;for(const angle of [0,Math.PI/2]){const blade=box(tailRotor,'tail rotor blade',{width:18,height:1.5,depth:3},V.Zero(),mats.cyan);blade.rotation.y=angle}
      root.metadata.rotor=rotor;root.metadata.tailRotor=tailRotor;return root;
    }

    function apcModel(){
      const root=new B.TransformNode('3d dominion armoured carrier',scene);root.metadata={baseY:1,kind:'apc'};shadow(root,59,.75);
      box(root,'apc hull',{width:51,height:16,depth:31},new V(0,13,0),mats.dark);box(root,'apc upper armour',{width:32,height:10,depth:25},new V(-2,25,0),mats.metal);box(root,'apc nose',{width:12,height:10,depth:27},new V(29,15,0),mats.gold);
      for(const x of [-18,0,18])for(const z of [-18,18])cylinder(root,'apc wheel',{height:7,diameter:12,tessellation:12},new V(x,8,z),mats.black,new V(Math.PI/2,0,0));
      cylinder(root,'apc turret',{height:7,diameter:17,tessellation:14},new V(1,33,0),mats.metal);box(root,'apc gun',{width:27,height:4,depth:4},new V(17,34,0),mats.gold);return root;
    }

    function saucerModel(name,scale=1,hostile=false){
      const root=new B.TransformNode(name,scene);root.metadata={baseY:hostile?24:18,kind:hostile?'boss':'saucer'};shadow(root,55*scale,.72);
      const hull=sphere(root,'saucer metal hull',34*scale,new V(0,15*scale,0),hostile?mats.metal:mats.silver,new V(1.55,.24,1.15));
      const rimMesh=attach(B.MeshBuilder.CreateTorus('saucer luminous rim',{diameter:43*scale,thickness:3.3*scale,tessellation:28},scene),root,hostile?mats.red:mats.lime,new V(0,15*scale,0));
      sphere(root,'saucer glass dome',21*scale,new V(0,20*scale,0),hostile?mats.glass:mats.cyan,new V(1,.48,1));
      for(let i=0;i<6;i++){const a=i*Math.PI/3;sphere(root,'saucer running light',3.4*scale,new V(Math.cos(a)*19*scale,15*scale,Math.sin(a)*14*scale),hostile?mats.red:mats.lime)}
      root.metadata.rim=rimMesh;hull.receiveShadows=true;return root;
    }

    const hero=alienModel(),companion=saucerModel('friendly 3d flying saucer',.68,false);let lastPlayer={x:0,y:0};
    const enemyModels=new Map();
    function enemyModel(enemy){if(enemy.boss)return saucerModel(`3d boss saucer ${enemy.stage}`,1.25+enemy.stage*.17,true);if(enemy.type==='jet')return jetModel();if(enemy.type==='tank')return tankModel();if(enemy.type==='helicopter')return helicopterModel();return apcModel()}
    function updateCamera(){const w=innerWidth,h=innerHeight;camera.orthoLeft=-w/2;camera.orthoRight=w/2;camera.orthoTop=h/2;camera.orthoBottom=-h/2}
    updateCamera();addEventListener('resize',()=>{engine.resize();updateCamera()});

    function sync(){
      const state=window.XenoSurvivorsView.getState();if(!state)return;
      const dx=state.player.x-lastPlayer.x,dy=state.player.y-lastPlayer.y;if(Math.hypot(dx,dy)>.08)hero.rotation.y=Math.atan2(dy,dx);lastPlayer={x:state.player.x,y:state.player.y};
      hero.setEnabled(state.playing);hero.position.set(0,1,0);hero.position.y=1+Math.sin(state.elapsed*5)*1.1;
      companion.setEnabled(state.playing);const orbit=state.elapsed*1.45;companion.position.set(Math.cos(orbit)*48,22+Math.sin(state.elapsed*3)*3,-Math.sin(orbit)*38);companion.rotation.y=-orbit*2.2;companion.metadata.rim.rotation.y=state.elapsed*2.8;
      const active=new Set();
      state.enemies.forEach(enemy=>{
        if(enemy.dead)return;const x=enemy.x-state.player.x,z=-(enemy.y-state.player.y),visible=Math.abs(x)<state.width*.65+130&&Math.abs(z)<state.height*.65+130;let root=enemyModels.get(enemy);
        if(!visible){if(root)root.setEnabled(false);return}
        active.add(enemy);if(!root){root=enemyModel(enemy);enemyModels.set(enemy,root)}root.setEnabled(true);root.position.x=x;root.position.z=z;root.position.y=root.metadata.baseY+(enemy.aircraft||enemy.boss?Math.sin(state.elapsed*3+enemy.phase)*3:0);root.rotation.y=Math.atan2(state.player.y-enemy.y,state.player.x-enemy.x);
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
