(() => {
  'use strict';
  const canvas = document.getElementById('renderCanvas');
  const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(.004, .006, .018, 1);
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = .011;
  scene.fogColor = new BABYLON.Color3(.012, .018, .04);
  const camera = new BABYLON.ArcRotateCamera('arcade camera', -Math.PI / 2, 1.12, 26, new BABYLON.Vector3(0, 3, -5), scene);
  camera.lowerBetaLimit = .8; camera.upperBetaLimit = 1.35; camera.lowerRadiusLimit = 18; camera.upperRadiusLimit = 34; camera.panningSensibility = 0; camera.attachControl(canvas, true);
  const hemi = new BABYLON.HemisphericLight('room glow', new BABYLON.Vector3(0, 1, 0), scene); hemi.intensity = .42; hemi.diffuse = new BABYLON.Color3(.3, .75, .8); hemi.groundColor = new BABYLON.Color3(.12, .03, .23);
  const key = new BABYLON.PointLight('central reactor', new BABYLON.Vector3(0, 9, -3), scene); key.diffuse = new BABYLON.Color3(.45, 1, .8); key.intensity = 48; key.range = 45;
  const glow = new BABYLON.GlowLayer('neon bloom', scene, { blurKernelSize: 48 }); glow.intensity = .75;
  const pipeline = new BABYLON.DefaultRenderingPipeline('cinematic', true, scene, [camera]); pipeline.fxaaEnabled = true; pipeline.bloomEnabled = true; pipeline.bloomWeight = .25; pipeline.bloomThreshold = .72; pipeline.imageProcessingEnabled = true; pipeline.imageProcessing.contrast = 1.25; pipeline.imageProcessing.exposure = 1.05;
  const color = BABYLON.Color3.FromHexString;
  const makeMat = (name, hex, emissive = null, metal = .25, rough = .38) => { const m = new BABYLON.PBRMaterial(name, scene); m.albedoColor = color(hex); m.metallic = metal; m.roughness = rough; if (emissive) m.emissiveColor = color(emissive); return m; };
  const mat = { floor: makeMat('black glass', '#07151d', null, .75, .18), wall: makeMat('ribbed hull', '#10182b', null, .7, .28), mint: makeMat('mint neon', '#70ffe1', '#36bfa6', .2, .18), acid: makeMat('acid neon', '#caff62', '#7eab35', .2, .18), violet: makeMat('violet neon', '#a26fff', '#5e35b8', .2, .18), pink: makeMat('pink neon', '#ff4f9a', '#a01f58', .2, .18), gold: makeMat('gold trim', '#ffd66c', '#654914', .72, .22), chrome: makeMat('dark chrome', '#566675', null, .9, .14), glass: makeMat('canopy glass', '#15384b', '#071d2b', .1, .08) };
  mat.glass.alpha = .64;
  const box = (name, w, h, d, x, y, z, material) => { const mesh = BABYLON.MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene); mesh.position.set(x, y, z); mesh.material = material; return mesh; };

  function buildRoom() {
    const floor = BABYLON.MeshBuilder.CreateCylinder('circular arcade floor', { diameter: 58, height: .7, tessellation: 64 }, scene); floor.position.y = -.5; floor.material = mat.floor;
    for (let ring = 0; ring < 4; ring++) { const neon = BABYLON.MeshBuilder.CreateTorus('floor orbit', { diameter: 15 + ring * 12, thickness: .08, tessellation: 96 }, scene); neon.position.y = -.1; neon.rotation.x = Math.PI / 2; neon.material = ring % 2 ? mat.violet : mat.mint; }
    for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; const rib = BABYLON.MeshBuilder.CreateCylinder('wall rib', { height: 11, diameter: 1.05, tessellation: 6 }, scene); rib.position.set(Math.cos(a) * 27, 4.8, Math.sin(a) * 27); rib.material = mat.wall; const strip = box('rib light', .12, 7, .12, Math.cos(a) * 26.7, 4.9, Math.sin(a) * 26.7, i % 3 ? mat.mint : mat.violet); strip.rotation.y = -a; }
    const ceiling = BABYLON.MeshBuilder.CreateTorus('ceiling ring', { diameter: 43, thickness: 1.2, tessellation: 80 }, scene); ceiling.position.y = 10.2; ceiling.rotation.x = Math.PI / 2; ceiling.material = mat.chrome;
    const reactor = BABYLON.MeshBuilder.CreateSphere('central hologram', { diameter: 3.1, segments: 32 }, scene); reactor.position.set(0, 4.1, 3.8); reactor.material = mat.mint;
    const reactorRing = BABYLON.MeshBuilder.CreateTorus('hologram orbit', { diameter: 5.4, thickness: .13, tessellation: 64 }, scene); reactorRing.position.copyFrom(reactor.position); reactorRing.material = mat.gold;
    scene.registerBeforeRender(() => { reactor.rotation.y += .004; reactorRing.rotation.x += .004; reactorRing.rotation.z -= .002; });
  }

  const machines = [
    { name: 'HIVE CORE', description: 'Wake the living reactor, charge its three organs, and survive the queen’s multiball.', difficulty: 'BALANCED', accent: mat.mint, secondary: mat.acid, x: -11, z: -8, angle: -.34 },
    { name: 'NEBULA RUN', description: 'Race a stolen scout craft through collapsing gates and chain hyperspace jackpots.', difficulty: 'FAST', accent: mat.violet, secondary: mat.pink, x: 0, z: -11, angle: 0 },
    { name: 'TEMPLE ZERO', description: 'Break ancient seals, climb the golden pyramid, and awaken the star guardian.', difficulty: 'TACTICAL', accent: mat.gold, secondary: mat.mint, x: 11, z: -8, angle: .34 },
  ];
  function machineLabel(machine) {
    const texture = new BABYLON.DynamicTexture(`screen ${machine.name}`, { width: 1024, height: 512 }, scene, true), ctx = texture.getContext();
    ctx.fillStyle = '#02050d'; ctx.fillRect(0, 0, 1024, 512); ctx.strokeStyle = '#70ffe1'; ctx.lineWidth = 18; ctx.strokeRect(20, 20, 984, 472); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 105px Arial'; ctx.fillStyle = '#effff9'; ctx.fillText(machine.name, 512, 200); ctx.font = 'bold 44px Arial'; ctx.fillStyle = '#caff62'; ctx.fillText('XENO PINBALL SYSTEM', 512, 326); texture.update();
    const material = new BABYLON.StandardMaterial(`screen material ${machine.name}`, scene); material.diffuseTexture = texture; material.emissiveTexture = texture; return material;
  }
  function buildMachine(machine, index) {
    const root = new BABYLON.TransformNode(`machine ${index}`, scene); root.position.set(machine.x, 0, machine.z); root.rotation.y = machine.angle;
    const cabinet = box('cabinet', 6.7, 1.25, 11.4, 0, 1.25, 0, mat.chrome); cabinet.parent = root; cabinet.rotation.x = -.085;
    const playfield = box('playfield preview', 5.9, .16, 9.8, 0, 1.95, -.1, machine.accent); playfield.parent = root; playfield.rotation.x = -.085;
    machine.previewMeshes = [playfield];
    [-2.7, 2.7].forEach((x) => [-4.5, 4].forEach((z) => { const leg = box('machine leg', .35, 2.3, .35, x, 0, z, mat.chrome); leg.parent = root; }));
    const back = box('backbox', 6.8, 5.2, .7, 0, 4.6, -5.3, mat.chrome); back.parent = root;
    const screen = BABYLON.MeshBuilder.CreatePlane('machine screen', { width: 6.1, height: 4.4 }, scene); screen.parent = root; screen.position.set(0, 4.7, -4.92); screen.rotation.y = Math.PI; screen.material = machineLabel(machine);
    for (let i = 0; i < 9; i++) { const lamp = BABYLON.MeshBuilder.CreateSphere('playfield lamp', { diameter: .34 + i % 3 * .1, segments: 12 }, scene); lamp.parent = root; lamp.position.set((i % 3 - 1) * 1.65, 2.18, (Math.floor(i / 3) - 1) * 2.45); lamp.material = i % 2 ? machine.secondary : machine.accent; machine.previewMeshes.push(lamp); }
    root.getChildMeshes().forEach((mesh) => { mesh.metadata = { machineIndex: index }; });
    machine.root = root;
  }
  buildRoom(); machines.forEach(buildMachine);

  const profiles = [
    { gravity: 1.42, launch: 12.2, mission: 'AWAKEN THE HIVE', jackpot: 'QUEEN MULTIBALL', bumpers: [[0,-1.7,.49],[-1.15,-.65,.43],[1.15,-.65,.43]], targets: [[-1.7,.75],[0,.55],[1.7,.75]], ramps: [-1.82,1.82] },
    { gravity: 1.64, launch: 13.2, mission: 'CHARGE THE STAR DRIVE', jackpot: 'HYPERSPACE JACKPOT', bumpers: [[-1.25,-1.75,.42],[1.25,-1.75,.42],[0,-.55,.5]], targets: [[-1.8,.55],[-.6,.9],[.6,.9],[1.8,.55]], ramps: [-1.55,1.55] },
    { gravity: 1.3, launch: 11.8, mission: 'BREAK THE THREE SEALS', jackpot: 'GUARDIAN AWAKENED', bumpers: [[0,-2.05,.54],[-1.35,-.9,.4],[1.35,-.9,.4],[0,.15,.36]], targets: [[-1.5,.9],[0,.65],[1.5,.9]], ramps: [-1.95,1.95] },
  ];
  const $ = (id) => document.getElementById(id);
  const ui = { lobby: $('lobbyPanel'), hud: $('gameHud'), controls: $('mobileControls'), message: $('message'), leave: $('leaveMachine'), result: $('resultScreen'), score: $('score'), multiplier: $('multiplier'), balls: $('balls'), mission: $('mission'), high: $('highScore'), final: $('finalScore'), resultTitle: $('resultTitle'), resultMessage: $('resultMessage') };
  let selected = 0, mode = 'lobby', gameRoot = null, activeProfile = null, gameActive = false;
  let score = 0, multiplier = 1, ballsLeft = 3, targetBank = 0, coreCharge = 0, multiballStarted = false, extraBallAwarded = false;
  let balls = [], bumpers = [], targets = [], walls = [], flippers = [], rampSensors = [], decor = [], messageTimer = 0, physicsAccumulator = 0;
  let leftPressed = false, rightPressed = false;
  let audioCtx = null, audioMaster = null, effectsBus = null, musicBus = null, musicTimer = 0, musicStep = 0;
  let highScore = Number(localStorage.getItem('xenoPinballHigh') || 0);
  ui.high.textContent = highScore.toLocaleString();

  function showMachine(index) {
    selected = (index + machines.length) % machines.length;
    const machine = machines[selected];
    $('machineName').textContent = machine.name; $('machineDescription').textContent = machine.description; $('machineDifficulty').textContent = machine.difficulty; $('machineNumber').textContent = `MACHINE 0${selected + 1} / 03`;
    camera.setTarget(new BABYLON.Vector3(machine.x, 2.2, machine.z)); camera.alpha = -Math.PI / 2 + machine.angle; camera.beta = 1.12; camera.radius = 26;
    machines.forEach((item, i) => item.root.scaling.setAll(i === selected ? 1.04 : .96));
    sound('select');
  }

  function prepareAudio() {
    if (audioCtx) { if (audioCtx.state === 'suspended') audioCtx.resume(); return; }
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    audioMaster = audioCtx.createGain(); audioMaster.gain.value = 1.18;
    const compressor = audioCtx.createDynamicsCompressor(); compressor.threshold.value = -20; compressor.knee.value = 18; compressor.ratio.value = 7; compressor.attack.value = .003; compressor.release.value = .22;
    effectsBus = audioCtx.createGain(); effectsBus.gain.value = 2.25; musicBus = audioCtx.createGain(); musicBus.gain.value = .34;
    effectsBus.connect(compressor); musicBus.connect(compressor); compressor.connect(audioMaster); audioMaster.connect(audioCtx.destination);
  }
  function tone(frequency, duration, volume = .05, wave = 'sine', delay = 0, glide = 1, bus = effectsBus) {
    if (!audioCtx) return;
    const start = audioCtx.currentTime + delay, oscillator = audioCtx.createOscillator(), gain = audioCtx.createGain();
    oscillator.type = wave; oscillator.frequency.setValueAtTime(frequency, start); oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, frequency * glide), start + duration);
    gain.gain.setValueAtTime(.001, start); gain.gain.exponentialRampToValueAtTime(volume, start + .008); gain.gain.exponentialRampToValueAtTime(.001, start + duration);
    oscillator.connect(gain).connect(bus); oscillator.start(start); oscillator.stop(start + duration + .03);
  }
  function noise(duration = .1, volume = .04, filterFrequency = 1200, delay = 0) {
    if (!audioCtx) return;
    const length = Math.floor(audioCtx.sampleRate * duration), buffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate), data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 1.7);
    const source = audioCtx.createBufferSource(), filter = audioCtx.createBiquadFilter(), gain = audioCtx.createGain();
    filter.type = 'bandpass'; filter.frequency.value = filterFrequency; filter.Q.value = 1.2; gain.gain.value = volume; source.buffer = buffer; source.connect(filter).connect(gain).connect(effectsBus); source.start(audioCtx.currentTime + delay);
  }
  function sound(kind) {
    if (!audioCtx) return;
    if (kind === 'select') tone(530,.08,.035,'sine',0,1.25);
    else if (kind === 'flipper') { noise(.075,.085,720); tone(115,.07,.045,'square',0,.7); }
    else if (kind === 'launch') { noise(.38,.07,420); tone(90,.5,.06,'sawtooth',0,3.8); tone(760,.18,.04,'triangle',.35,1.4); }
    else if (kind === 'rail') { noise(.055,.035,2100); tone(1250,.07,.025,'triangle'); }
    else if (kind === 'bumper') { noise(.08,.08,1550); tone(390,.22,.075,'triangle',0,2.35); tone(890,.26,.045,'sine',.025,1.45); }
    else if (kind === 'target') { tone(720,.15,.055,'square',0,1.5); tone(1080,.2,.035,'sine',.06,1.2); }
    else if (kind === 'ramp') [440,660,880,1320].forEach((n,i)=>tone(n,.3,.045,'triangle',i*.055,1.16));
    else if (kind === 'drain') { tone(260,.65,.06,'sawtooth',0,.24); noise(.35,.05,280); }
    else if (kind === 'multiball') { [220,330,440,660,880,1320].forEach((n,i)=>tone(n,.65,.07,'sawtooth',i*.08,1.3)); noise(.8,.08,1700,.2); }
    else if (kind === 'extra') [523,659,784,1047].forEach((n,i)=>tone(n,.7,.065,'sine',i*.1,1.05));
    else if (kind === 'gameover') [392,330,261,196].forEach((n,i)=>tone(n,.65,.06,'triangle',i*.18,.72));
  }
  function startMusic() {
    clearInterval(musicTimer); musicStep = 0;
    const themes = [[55,82.4,110,164.8],[65.4,98,130.8,196],[49,73.4,98,146.8]][selected];
    musicTimer = setInterval(() => {
      if (mode !== 'play') return;
      const root = themes[musicStep % themes.length];
      tone(root,1.8,.023,'sine',0,1,musicBus); tone(root*2, .55,.018,'triangle',.04,1.5,musicBus);
      if (musicStep % 2) tone(root*4, .26,.012,'square',.18,1.25,musicBus);
      musicStep++;
    }, 620);
  }
  function stopMusic() { clearInterval(musicTimer); musicTimer = 0; }

  function announce(text, duration = 1350) {
    clearTimeout(messageTimer); ui.message.textContent = text; ui.message.classList.remove('hidden');
    messageTimer = setTimeout(() => ui.message.classList.add('hidden'), duration);
  }
  function updateHud() {
    ui.score.textContent = Math.floor(score).toString().padStart(7,'0'); ui.multiplier.textContent = `×${multiplier}`; ui.balls.textContent = ballsLeft; ui.mission.textContent = activeProfile?.mission || 'SELECT A MACHINE';
    if (score > highScore) { highScore = Math.floor(score); ui.high.textContent = highScore.toLocaleString(); localStorage.setItem('xenoPinballHigh', highScore); }
  }
  function addScore(points, label) {
    score += points * multiplier; updateHud(); if (label) announce(`${label}  +${(points * multiplier).toLocaleString()}`, 850);
    if (score >= 100000 && !extraBallAwarded) { extraBallAwarded = true; ballsLeft++; sound('extra'); announce('EXTRA BALL AWARDED', 1800); updateHud(); }
  }

  function localBox(name, width, height, depth, x, y, z, material, parent = gameRoot) {
    const mesh = box(name,width,height,depth,x,y,z,material); mesh.parent = parent; return mesh;
  }
  function wallSegment(ax,az,bx,bz,material = mat.chrome, width = .17) {
    const length = Math.hypot(bx-ax,bz-az), mesh = localBox('rail wall',length,.34,width,(ax+bx)/2,2.35,(az+bz)/2,material); mesh.rotation.y = -Math.atan2(bz-az,bx-ax); walls.push({ax,az,bx,bz}); return mesh;
  }
  function boardMaterial(machine) {
    const texture = new BABYLON.DynamicTexture(`playfield ${machine.name}`, {width:1024,height:1700}, scene, true), ctx = texture.getContext();
    const gradient = ctx.createLinearGradient(0,0,0,1700); gradient.addColorStop(0,'#071922'); gradient.addColorStop(.55,'#091126'); gradient.addColorStop(1,'#160a27'); ctx.fillStyle=gradient; ctx.fillRect(0,0,1024,1700);
    ctx.strokeStyle='#70ffe133'; ctx.lineWidth=6; for(let x=80;x<1024;x+=145){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x-100,1700);ctx.stroke()}
    ctx.strokeStyle='#a26fff44'; for(let y=100;y<1700;y+=170){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(1024,y+80);ctx.stroke()}
    ctx.textAlign='center'; ctx.font='bold 90px Arial'; ctx.fillStyle='#70ffe1'; ctx.fillText(machine.name,512,300); ctx.font='bold 35px Arial'; ctx.fillStyle='#caff62'; ctx.fillText('DANPC ORBITAL PINBALL',512,380); texture.update();
    const material = new BABYLON.PBRMaterial(`playfield material ${machine.name}`,scene); material.albedoTexture=texture; material.emissiveTexture=texture; material.emissiveColor=new BABYLON.Color3(.3,.3,.3); material.metallic=.12; material.roughness=.28; return material;
  }
  function addRamp(x, side, material) {
    const outer=[], inner=[];
    for(let i=0;i<=18;i++) { const t=i/18, z=1.45-t*4.9, curve=x+side*Math.sin(t*Math.PI)*.65; outer.push(new BABYLON.Vector3(curve+side*.28,2.58+t*.55,z)); inner.push(new BABYLON.Vector3(curve-side*.28,2.58+t*.55,z)); }
    [outer,inner].forEach(path=>{const rail=BABYLON.MeshBuilder.CreateTube('orbit ramp',{path,radius:.055,tessellation:10},scene);rail.parent=gameRoot;rail.material=material});
    rampSensors.push({x,z:.4,side,armed:true});
  }
  function addBumper(spec,index,machine) {
    const [x,z,r]=spec, base=BABYLON.MeshBuilder.CreateCylinder('power bumper',{diameter:r*2.35,height:.36,tessellation:32},scene); base.parent=gameRoot;base.position.set(x,2.38,z);base.material=mat.chrome;
    const cap=BABYLON.MeshBuilder.CreateSphere('bumper dome',{diameter:r*1.62,segments:24},scene);cap.parent=gameRoot;cap.position.set(x,2.67,z);cap.scaling.y=.42;cap.material=index%2?machine.secondary:machine.accent;
    const ring=BABYLON.MeshBuilder.CreateTorus('bumper halo',{diameter:r*2.05,thickness:.1,tessellation:32},scene);ring.parent=gameRoot;ring.position.set(x,2.6,z);ring.rotation.x=Math.PI/2;ring.material=index%2?machine.accent:machine.secondary;
    bumpers.push({x,z,r:r+.16,mesh:cap,ring,last:0,index}); decor.push({mesh:ring,speed:index%2?.013:-.011,baseY:2.6,phase:index});
  }
  function addTarget(spec,index,machine) {
    const [x,z]=spec, mesh=localBox('drop target',.62,.72,.16,x,2.52,z,mat.chrome); mesh.rotation.x=-.1; const lamp=BABYLON.MeshBuilder.CreateSphere('target lamp',{diameter:.2,segments:10},scene);lamp.parent=gameRoot;lamp.position.set(x,2.94,z);lamp.material=machine.accent;
    targets.push({x,z,r:.4,mesh,lamp,lit:false,last:0,index});
  }
  function buildAlienIdol(machine) {
    const head=BABYLON.MeshBuilder.CreateSphere('alien queen idol',{diameter:1.1,segments:24},scene);head.parent=gameRoot;head.position.set(0,2.72,-3.42);head.scaling.set(1,.64,.72);head.material=machine.secondary;
    const eye=BABYLON.MeshBuilder.CreateSphere('queen eye',{diameter:.25,segments:12},scene);eye.parent=gameRoot;eye.position.set(0,2.89,-3.92);eye.scaling.y=.42;eye.material=mat.pink;
    [-.38,.38].forEach(x=>{const horn=BABYLON.MeshBuilder.CreateCylinder('queen horn',{height:.85,diameterTop:0,diameterBottom:.18,tessellation:10},scene);horn.parent=gameRoot;horn.position.set(x,3.18,-3.42);horn.rotation.z=x>0?-.35:.35;horn.material=mat.gold});
    decor.push({mesh:eye,speed:.03,baseY:2.89,phase:2});
  }
  function buildPlayfield() {
    if(gameRoot) gameRoot.dispose();
    const machine=machines[selected]; activeProfile=profiles[selected]; gameRoot=new BABYLON.TransformNode('active pinball table',scene); gameRoot.parent=machine.root;
    const board=BABYLON.MeshBuilder.CreateGround('living playfield',{width:5.86,height:9.86,subdivisions:1},scene);board.parent=gameRoot;board.position.set(0,2.1,-.1);board.material=boardMaterial(machine);
    const under=localBox('underlight',5.96,.09,9.96,0,2.04,-.1,machine.accent);under.visibility=.32;
    walls=[];bumpers=[];targets=[];rampSensors=[];flippers=[];decor=[];
    wallSegment(-2.82,-4.72,2.82,-4.72,machine.accent,.2); wallSegment(-2.82,-4.72,-2.82,1.55); wallSegment(2.82,-4.72,2.82,4.72);
    wallSegment(-2.82,1.55,-1.64,4.55,machine.secondary,.2); wallSegment(2.82,1.55,1.64,4.55,machine.secondary,.2); wallSegment(2.17,-3.12,2.17,4.55,mat.gold,.13); wallSegment(2.17,-3.12,1.55,-4.62,mat.gold,.13);
    activeProfile.bumpers.forEach((item,i)=>addBumper(item,i,machine)); activeProfile.targets.forEach((item,i)=>addTarget(item,i,machine));
    addRamp(activeProfile.ramps[0],-1,machine.accent); addRamp(activeProfile.ramps[1],1,machine.secondary); buildAlienIdol(machine);
    [-2.33,-1.16,0,1.16,2.33].forEach((x,i)=>{const lane=BABYLON.MeshBuilder.CreateCylinder('star lane',{diameter:.23,height:.035,tessellation:16},scene);lane.parent=gameRoot;lane.position.set(x,2.22,-4.17);lane.material=i%2?machine.secondary:machine.accent;decor.push({mesh:lane,speed:.02,baseY:2.22,phase:i*.7})});
    [[-1.9,2.15],[1.9,2.15]].forEach(([x,z],i)=>{const sling=BABYLON.MeshBuilder.CreatePolyhedron('plasma sling',{type:1,size:.45},scene);sling.parent=gameRoot;sling.position.set(x,2.5,z);sling.scaling.set(.7,.35,1.25);sling.material=i?machine.secondary:machine.accent;bumpers.push({x,z,r:.52,mesh:sling,ring:sling,last:0,index:10+i,sling:true})});
    createFlipper('left',-1.32,3.47,.18,-.58,machine.accent); createFlipper('right',1.32,3.47,Math.PI-.18,Math.PI+.58,machine.secondary);
    const launchLight=BABYLON.MeshBuilder.CreateTorus('launch ring',{diameter:.72,thickness:.08,tessellation:28},scene);launchLight.parent=gameRoot;launchLight.position.set(2.48,2.22,4.05);launchLight.rotation.x=Math.PI/2;launchLight.material=mat.gold;decor.push({mesh:launchLight,speed:.025,baseY:2.22,phase:0});
  }
  function createFlipper(side,x,z,rest,active,material) {
    const length=1.55, mesh=localBox(`${side} flipper`,length,.25,.34,0,2.48,0,material); mesh.enableEdgesRendering();mesh.edgesWidth=3;mesh.edgesColor=new BABYLON.Color4(1,1,1,.45);
    const flipper={side,x,z,length,width:.24,rest,active,angle:rest,previous:rest,angular:0,mesh,pressed:false};flippers.push(flipper);updateFlipperMesh(flipper);
  }
  function updateFlipperMesh(flipper){const dx=Math.cos(flipper.angle),dz=Math.sin(flipper.angle);flipper.mesh.position.x=flipper.x+dx*flipper.length/2;flipper.mesh.position.z=flipper.z+dz*flipper.length/2;flipper.mesh.rotation.y=-flipper.angle}

  function spawnBall(lane=true,x=2.48,z=4.02,vx=0,vz=0) {
    const mesh=BABYLON.MeshBuilder.CreateSphere('chrome pinball',{diameter:.36,segments:24},scene);mesh.parent=gameRoot;mesh.position.set(x,2.55,z);
    const material=new BABYLON.PBRMaterial('mirror ball',scene);material.albedoColor=new BABYLON.Color3(.78,.9,.94);material.metallic=1;material.roughness=.07;mesh.material=material;
    const ball={x,z,vx,vz,r:.18,mesh,launched:!lane,alive:true,lastRail:0,lastHits:new Map(),rampPass:new Set(),rollover:false};balls.push(ball);return ball;
  }
  function launchBall(){if(!gameActive)return;const ball=balls.find(item=>item.alive&&!item.launched);if(!ball){announce('BALL ALREADY IN PLAY');return}ball.launched=true;ball.vz=-activeProfile.launch;ball.vx=-.15;sound('launch');announce('PLASMA LAUNCH');burst(ball.x,ball.z,machines[selected].accent)}
  function setFlipper(side,pressed){const flipper=flippers.find(item=>item.side===side);if(!flipper||flipper.pressed===pressed)return;flipper.pressed=pressed;if(pressed)sound('flipper')}

  function closestPoint(px,pz,ax,az,bx,bz){const dx=bx-ax,dz=bz-az,l2=dx*dx+dz*dz,t=l2?Math.max(0,Math.min(1,((px-ax)*dx+(pz-az)*dz)/l2)):0;return{x:ax+t*dx,z:az+t*dz,t}}
  function collideSegment(ball,segment,restitution=.78,boost=0) {
    const point=closestPoint(ball.x,ball.z,segment.ax,segment.az,segment.bx,segment.bz),dx=ball.x-point.x,dz=ball.z-point.z,dist=Math.hypot(dx,dz),limit=ball.r+.1;
    if(dist>=limit)return false;const nx=dist>.0001?dx/dist:0,nz=dist>.0001?dz/dist:1,push=limit-dist;ball.x+=nx*push;ball.z+=nz*push;const dot=ball.vx*nx+ball.vz*nz;if(dot<0){ball.vx-=(1+restitution)*dot*nx;ball.vz-=(1+restitution)*dot*nz;ball.vx+=nx*boost;ball.vz+=nz*boost}return true;
  }
  function collideCircle(ball,object,now) {
    const dx=ball.x-object.x,dz=ball.z-object.z,dist=Math.hypot(dx,dz),limit=ball.r+object.r;if(dist>=limit)return;
    const nx=dist>.001?dx/dist:(Math.random()-.5),nz=dist>.001?dz/dist:-1,push=limit-dist;ball.x+=nx*push;ball.z+=nz*push;const dot=ball.vx*nx+ball.vz*nz;if(dot<0){ball.vx-=1.88*dot*nx;ball.vz-=1.88*dot*nz}
    const kick=object.sling?4.1:3.25;ball.vx+=nx*kick;ball.vz+=nz*kick;
    if(now-object.last>150){object.last=now;addScore(object.sling?650:1000,object.sling?'PLASMA SLING':'BIO BUMPER');sound('bumper');burst(object.x,object.z,object.index%2?machines[selected].secondary:machines[selected].accent);object.mesh.scaling.setAll(1.28);setTimeout(()=>object.mesh?.scaling?.setAll(1),90);coreCharge++;if(coreCharge===8&&!multiballStarted)startMultiball()}
  }
  function collideFlipper(ball,flipper) {
    const dx=Math.cos(flipper.angle),dz=Math.sin(flipper.angle),point=closestPoint(ball.x,ball.z,flipper.x,flipper.z,flipper.x+dx*flipper.length,flipper.z+dz*flipper.length),rx=point.x-flipper.x,rz=point.z-flipper.z,ox=ball.x-point.x,oz=ball.z-point.z,dist=Math.hypot(ox,oz),limit=ball.r+flipper.width;
    if(dist>=limit)return;const nx=dist>.001?ox/dist:0,nz=dist>.001?oz/dist:-1,push=limit-dist;ball.x+=nx*push;ball.z+=nz*push;
    const svx=-flipper.angular*rz,svz=flipper.angular*rx,rvx=ball.vx-svx,rvz=ball.vz-svz,dot=rvx*nx+rvz*nz;if(dot<0){ball.vx=rvx-1.88*dot*nx+svx;ball.vz=rvz-1.88*dot*nz+svz}
    if(flipper.pressed){ball.vz-=2.6;ball.vx+=flipper.side==='left'?1.15:-1.15}
  }
  function hitTargets(ball,now){targets.forEach(target=>{const distance=Math.hypot(ball.x-target.x,ball.z-target.z);if(distance<ball.r+target.r){const nx=(ball.x-target.x)/(distance||1),nz=(ball.z-target.z)/(distance||1);ball.vx+=nx*1.8;ball.vz+=nz*1.8;if(now-target.last>400){target.last=now;if(!target.lit){target.lit=true;target.lamp.material=mat.gold;targetBank++;addScore(750,'ALIEN SEAL');sound('target');burst(target.x,target.z,mat.gold)}if(targetBank>=targets.length){targetBank=0;multiplier=Math.min(8,multiplier+1);announce(`TARGET BANK COMPLETE  ×${multiplier}`,1700);sound('ramp');setTimeout(()=>targets.forEach(item=>{item.lit=false;item.lamp.material=machines[selected].accent}),800);updateHud()}}}})}
  function checkRamps(ball){rampSensors.forEach((sensor,index)=>{const keyName=`${index}`;if(ball.z>.85)ball.rampPass.delete(keyName);if(ball.prevZ>.45&&ball.z<=.45&&Math.abs(ball.x-sensor.x)<.72&&!ball.rampPass.has(keyName)){ball.rampPass.add(keyName);addScore(2500,index?'RIGHT ORBIT':'LEFT ORBIT');sound('ramp');burst(sensor.x,sensor.z,index?machines[selected].secondary:machines[selected].accent)}})}
  function startMultiball(){multiballStarted=true;multiplier=Math.min(8,multiplier+1);sound('multiball');announce(activeProfile.jackpot,2600);addScore(10000,'CORE CHARGED');spawnBall(false,-.5,-3.2,3.4,3.6);spawnBall(false,.5,-3.2,-3.4,3.6);updateHud()}
  function burst(x,z,material) {
    const pieces=[];for(let i=0;i<10;i++){const mesh=BABYLON.MeshBuilder.CreatePolyhedron('score spark',{type:1,size:.055+Math.random()*.075},scene);mesh.parent=gameRoot;mesh.position.set(x,2.63,z);mesh.material=material;pieces.push({mesh,vx:(Math.random()-.5)*.08,vy:.035+Math.random()*.07,vz:(Math.random()-.5)*.08})}
    let frames=0;const observer=scene.onBeforeRenderObservable.add(()=>{frames++;pieces.forEach(p=>{p.mesh.position.x+=p.vx;p.mesh.position.y+=p.vy;p.mesh.position.z+=p.vz;p.vy-=.002;p.mesh.rotation.y+=.15});if(frames>35){scene.onBeforeRenderObservable.remove(observer);pieces.forEach(p=>p.mesh.dispose())}})
  }
  function drain(ball){if(!ball.alive)return;ball.alive=false;ball.mesh.dispose();sound('drain');balls=balls.filter(item=>item.alive);if(balls.length){announce('MULTIBALL LOST — KEEP FIGHTING');return}ballsLeft--;updateHud();if(ballsLeft>0){announce(`BALL ${4-ballsLeft} READY`,1600);setTimeout(()=>{if(gameActive)spawnBall(true)},900)}else endGame()}
  function physicsStep(dt,now) {
    flippers.forEach(flipper=>{flipper.previous=flipper.angle;const target=flipper.pressed?flipper.active:flipper.rest,max=18*dt,difference=target-flipper.angle;flipper.angle+=Math.max(-max,Math.min(max,difference));flipper.angular=(flipper.angle-flipper.previous)/dt;updateFlipperMesh(flipper)});
    for(const ball of [...balls]){
      if(!ball.alive||!ball.launched)continue;ball.prevZ=ball.z;ball.vz+=activeProfile.gravity*dt;const drag=Math.pow(.995,dt*60);ball.vx*=drag;ball.vz*=drag;const speed=Math.hypot(ball.vx,ball.vz);if(speed>15){ball.vx*=15/speed;ball.vz*=15/speed}ball.x+=ball.vx*dt;ball.z+=ball.vz*dt;
      let railHit=false;walls.forEach(segment=>{if(collideSegment(ball,segment,.77))railHit=true});
      if(ball.x>2.22&&ball.z<-4.22){ball.vx=-4.7;ball.vz=Math.max(2.4,Math.abs(ball.vz)*.42)}
      if(railHit&&now-ball.lastRail>120){ball.lastRail=now;sound('rail')}
      bumpers.forEach(object=>collideCircle(ball,object,now));flippers.forEach(flipper=>collideFlipper(ball,flipper));hitTargets(ball,now);checkRamps(ball);
      if(ball.z<-3.78&&!ball.rollover){ball.rollover=true;addScore(300,'STAR LANE')}if(ball.z>-3.1)ball.rollover=false;
      if(ball.x<-3.15){ball.x=-3.15;ball.vx=Math.abs(ball.vx)*.75}if(ball.x>3.15){ball.x=3.15;ball.vx=-Math.abs(ball.vx)*.75}
      if(ball.z>4.92)drain(ball);else ball.mesh.position.set(ball.x,2.55,ball.z);
    }
  }

  function startGame(){
    prepareAudio();buildPlayfield();mode='play';gameActive=true;score=0;multiplier=1;ballsLeft=3;targetBank=0;coreCharge=0;multiballStarted=false;extraBallAwarded=false;balls=[];leftPressed=false;rightPressed=false;
    ui.lobby.classList.add('hidden');ui.result.classList.add('hidden');ui.hud.classList.remove('hidden');ui.controls.classList.remove('hidden');ui.leave.classList.remove('hidden');camera.detachControl();
    const machine=machines[selected];machines.forEach(item=>{item.root.scaling.setAll(1);item.previewMeshes.forEach(mesh=>mesh.setEnabled(item!==machine))});camera.setTarget(new BABYLON.Vector3(machine.x,2.15,machine.z));camera.alpha=Math.PI/2+machine.angle;camera.beta=.34;camera.radius=16.8;
    spawnBall(true);updateHud();announce('BALL READY — HOLD THE LINE',1700);startMusic();
  }
  function endGame(){gameActive=false;stopMusic();sound('gameover');updateHud();ui.final.textContent=Math.floor(score).toLocaleString();ui.resultTitle.textContent=machines[selected].name;ui.resultMessage.textContent=score===highScore&&score>0?'NEW ORBITAL HIGH SCORE!':'The arcade has recorded your signal.';setTimeout(()=>ui.result.classList.remove('hidden'),900)}
  function returnLobby(){gameActive=false;mode='lobby';stopMusic();balls.forEach(ball=>ball.mesh?.dispose());balls=[];if(gameRoot){gameRoot.dispose();gameRoot=null}machines.forEach(item=>item.previewMeshes.forEach(mesh=>mesh.setEnabled(true)));ui.result.classList.add('hidden');ui.hud.classList.add('hidden');ui.controls.classList.add('hidden');ui.leave.classList.add('hidden');ui.message.classList.add('hidden');ui.lobby.classList.remove('hidden');camera.attachControl(canvas,true);showMachine(selected)}

  function pressControl(element,side){element.addEventListener('pointerdown',event=>{event.preventDefault();element.setPointerCapture?.(event.pointerId);setFlipper(side,true)});['pointerup','pointercancel','pointerleave'].forEach(type=>element.addEventListener(type,event=>{event.preventDefault();setFlipper(side,false)}))}
  $('previousMachine').onclick=()=>showMachine(selected-1);$('nextMachine').onclick=()=>showMachine(selected+1);$('enterMachine').onclick=startGame;
  $('startButton').onclick=()=>{prepareAudio();$('startScreen').classList.add('hidden');tone(110,.8,.05,'sine',0,4);showMachine(0)};
  $('launchBall').onclick=launchBall;$('leaveMachine').onclick=returnLobby;$('replayButton').onclick=startGame;$('returnButton').onclick=returnLobby;pressControl($('leftFlipper'),'left');pressControl($('rightFlipper'),'right');
  window.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Space','KeyZ','Slash'].includes(event.code))event.preventDefault();if(event.code==='ArrowLeft'||event.code==='KeyZ')setFlipper('left',true);if(event.code==='ArrowRight'||event.code==='Slash')setFlipper('right',true);if(event.code==='Space'&&!event.repeat)launchBall()});
  window.addEventListener('keyup',event=>{if(event.code==='ArrowLeft'||event.code==='KeyZ')setFlipper('left',false);if(event.code==='ArrowRight'||event.code==='Slash')setFlipper('right',false)});
  window.addEventListener('blur',()=>{setFlipper('left',false);setFlipper('right',false)});
  scene.onPointerObservable.add(pointer=>{if(mode==='lobby'&&pointer.type===BABYLON.PointerEventTypes.POINTERPICK&&Number.isInteger(pointer.pickInfo?.pickedMesh?.metadata?.machineIndex))showMachine(pointer.pickInfo.pickedMesh.metadata.machineIndex)});
  showMachine(0);window.addEventListener('resize',()=>engine.resize());
  let lastFrame=performance.now();
  engine.runRenderLoop(()=>{const now=performance.now(),frame=Math.min(.05,(now-lastFrame)/1000);lastFrame=now;if(gameActive){physicsAccumulator+=frame;while(physicsAccumulator>=1/120){physicsStep(1/120,now);physicsAccumulator-=1/120}decor.forEach((item,index)=>{item.mesh.rotation.y+=item.speed;item.mesh.position.y=item.baseY+Math.sin(now*.002+item.phase)*.025*(index%2)})}scene.render()});
})();
