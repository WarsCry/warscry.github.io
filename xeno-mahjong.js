(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const canvas = $('renderCanvas');
  const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
  engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, 1.75));
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(.008, .018, .025, 1);
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = .0075;
  scene.fogColor = new BABYLON.Color3(.015, .04, .045);

  const camera = new BABYLON.ArcRotateCamera('orbit', -Math.PI / 2, Math.PI * .33, 31, new BABYLON.Vector3(0, 1.5, 0), scene);
  Object.assign(camera, { lowerBetaLimit: .22, upperBetaLimit: 1.2, lowerRadiusLimit: 18, upperRadiusLimit: 39, wheelPrecision: 38, pinchPrecision: 80, panningSensibility: 0 });
  camera.attachControl(canvas, true);
  const hemi = new BABYLON.HemisphericLight('jadeSky', new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity = .48;
  hemi.diffuse = new BABYLON.Color3(.35, .78, .67);
  hemi.groundColor = new BABYLON.Color3(.08, .04, .12);
  const key = new BABYLON.PointLight('altarLight', new BABYLON.Vector3(0, 13, -1), scene);
  key.diffuse = new BABYLON.Color3(.45, 1, .78);
  key.intensity = 38;
  key.range = 34;
  const moon = new BABYLON.DirectionalLight('moon', new BABYLON.Vector3(-.35, -1, .25), scene);
  moon.position = new BABYLON.Vector3(9, 18, -10);
  moon.intensity = 1.2;
  const shadows = new BABYLON.ShadowGenerator(2048, moon);
  shadows.usePercentageCloserFiltering = true;
  shadows.filteringQuality = BABYLON.ShadowGenerator.QUALITY_MEDIUM;
  const hex = BABYLON.Color3.FromHexString;
  const pbr = (name, color, metal, rough, glow) => {
    const material = new BABYLON.PBRMaterial(name, scene);
    material.albedoColor = hex(color);
    material.metallic = metal;
    material.roughness = rough;
    if (glow) material.emissiveColor = hex(glow);
    return material;
  };
  const mat = {
    stone: pbr('obsidian stone', '#142523', .08, .82),
    carved: pbr('carved stone', '#20352d', .04, .75),
    jade: pbr('alien jade', '#2a9a78', .34, .25, '#124f3e'),
    acid: pbr('acid glow', '#aaff5c', .12, .2, '#6dcf36'),
    gold: pbr('sun gold', '#d7a94b', .62, .24, '#493513'),
    moss: pbr('living temple moss', '#2c7a35', .02, .9, '#12391a'),
    leaf: pbr('jungle leaf', '#43b653', .02, .7, '#174e25'),
    water: pbr('sacred green water', '#155b4c', .18, .18, '#0c4236'),
    dark: pbr('void metal', '#050a10', .7, .3),
    tile: pbr('tile ceramic', '#aebba0', .05, .5),
  };
  function textureMaterial(material, url, scale, tint) { const texture = new BABYLON.Texture(url, scene, false, false, BABYLON.Texture.TRILINEAR_SAMPLINGMODE); texture.uScale = scale; texture.vScale = scale; texture.anisotropicFilteringLevel = 16; material.albedoTexture = texture; material.albedoColor = hex(tint); }
  textureMaterial(mat.stone, 'assets/textures/alien-temple-v1.webp', 2.4, '#9a9d92');
  textureMaterial(mat.carved, 'assets/textures/alien-temple-v1.webp', 1.45, '#839389');
  textureMaterial(mat.dark, 'assets/textures/alien-hull-v1.webp', 3.5, '#56656a');
  const highlight = new BABYLON.HighlightLayer('tile glow', scene);
  highlight.blurHorizontalSize = .55;
  highlight.blurVerticalSize = .55;
  const baseGlyphs = ['◉', '✦', '⌁', '☽', '△', '⊕', '◇', '☄', '♆', '♁', '☼', '∞', '⌬', '⟁', '☯', '♢', '☊', '⌖', '✧', '⟡', '◈', '⏣', '⍟', '⌾', '☿', '⚶', '⧫', '⦿', '✺', '⟟', '⸙', '☍'];
  const glyphs = baseGlyphs.flatMap((symbol) => [`${symbol}¹`, `${symbol}²`]);
  const glyphMaterials = new Map();
  const ui = { remaining: $('tilesRemaining'), moves: $('movesAvailable'), timer: $('timer'), matches: $('matches'), message: $('selectionText'), start: $('startScreen'), victory: $('victoryScreen'), victoryStats: $('victoryStats'), hint: $('hintButton'), shuffle: $('shuffleButton'), undo: $('undoButton'), sound: $('soundButton'), event: $('templeEvent') };
  let tiles = [], selected = null, locked = false, history = [], matchCount = 0;
  let selectedTileCount = Number(new URLSearchParams(location.search).get('tiles')) === 64 ? 64 : 128;
  let hintedIds = new Set(), hintTargetTimer = 0;
  let gameActive = false, victoryMode = false, startedAt = 0, timerHandle = 0;
  let soundOn = true, audioCtx = null, masterGain = null, effectsGain = null, ambienceGain = null, ambienceTimer = 0;
  let guardianRoot = null, guardianEyes = [], templeEventPlayed = false, nextTempleEvent = 8;

  function box(name, size, position, material, edges = false) {
    const mesh = BABYLON.MeshBuilder.CreateBox(name, { width: size[0], height: size[1], depth: size[2] }, scene);
    mesh.position.copyFromFloats(position[0], position[1], position[2]);
    mesh.material = material;
    mesh.receiveShadows = true;
    if (edges) {
      mesh.enableEdgesRendering();
      mesh.edgesWidth = 1.2;
      mesh.edgesColor = new BABYLON.Color4(.12, .7, .5, .3);
    }
    return mesh;
  }

  function buildTemple() {
    box('floor', [44, .7, 38], [0, -1.05, 0], mat.dark);
    for (let i = 0; i < 4; i++) box(`altar ${i}`, [23 - i * 1.1, .46, 15 - i * .8], [0, -.55 + i * .3, 0], i % 2 ? mat.carved : mat.stone, true);
    for (let x = -10; x <= 10; x += 2) { const seam = box('jade seam', [.035, .025, 13.4], [x, .63, 0], mat.jade); seam.isPickable = false; }
    for (let step = 0; step < 5; step++) {
      const backStep = box(`jungle pyramid ${step}`, [19-step*2.3,1.05,4.8-step*.42], [0,-.2+step*.72,15.3+step*.35], step%2?mat.carved:mat.stone, true);
      backStep.isPickable=false;
      [-1,1].forEach(side=>{const moss=box('pyramid moss',[2.1,.16,4-step*.3],[side*(6.8-step*.72),.37+step*.72,15.05+step*.35],mat.moss);moss.rotation.y=side*.04;moss.isPickable=false});
    }
    [-1, 1].forEach((side) => {
      for (let z = -11; z <= 11; z += 7.3) {
        const pillar = BABYLON.MeshBuilder.CreateCylinder('temple pillar', { height: 8.6, diameter: 2.25, tessellation: 6 }, scene);
        pillar.position.set(side * 14.2, 3.2, z);
        pillar.material = mat.carved;
        pillar.receiveShadows = true;
        shadows.addShadowCaster(pillar);
        [.2, 2.9, 5.7].forEach((y) => {
          const ring = BABYLON.MeshBuilder.CreateTorus('jade ring', { diameter: 2.42, thickness: .12, tessellation: 6 }, scene);
          ring.position.set(side * 14.2, y, z);
          ring.rotation.x = Math.PI / 2;
          ring.material = mat.jade;
        });
        for(let vine=0;vine<3;vine++){
          const path=[];for(let p=0;p<9;p++){const y=.25+p*.78,x=side*14.2+Math.sin(p*.85+vine)*(.6+vine*.08),zz=z+Math.cos(p*.72+vine)*.56;path.push(new BABYLON.Vector3(x,y,zz))}
          const creeper=BABYLON.MeshBuilder.CreateTube('hanging jungle vine',{path,radius:.055+vine*.012,tessellation:7},scene);creeper.material=vine===1?mat.leaf:mat.moss;creeper.isPickable=false;
        }
      }
    });
    for(let i=0;i<18;i++){
      const angle=i/18*Math.PI*2,radius=15.8+(i%3)*1.5,x=Math.cos(angle)*radius,z=Math.sin(angle)*13.8;
      const leaf=BABYLON.MeshBuilder.CreateSphere('temple jungle leaf',{diameter:.85+(i%4)*.14,segments:8},scene);leaf.position.set(x,.2+(i%5)*.42,z);leaf.scaling.set(.42,1.2,.2);leaf.rotation.set(angle*.3,angle,-angle*.25);leaf.material=i%4?mat.leaf:mat.moss;leaf.isPickable=false;
    }
    for (let i = 0; i < 12; i++) {
      const angle = i / 12 * Math.PI * 2;
      const marker = BABYLON.MeshBuilder.CreatePolyhedron('wall glyph', { type: 1, size: .65 }, scene);
      marker.position.set(Math.cos(angle) * 18, 5.2 + i % 3, Math.sin(angle) * 15);
      marker.rotation.set(angle, angle * .5, -angle);
      marker.material = i % 3 ? mat.jade : mat.gold;
    }
    const gate = BABYLON.MeshBuilder.CreateTorus('star gate', { diameter: 8, thickness: .7, tessellation: 36 }, scene);
    gate.position.set(0, 5.4, 15.5); gate.rotation.x = Math.PI / 2; gate.material = mat.carved;
    const ring = BABYLON.MeshBuilder.CreateTorus('gate glow', { diameter: 6.7, thickness: .13, tessellation: 48 }, scene);
    ring.position.copyFrom(gate.position); ring.rotation.x = Math.PI / 2; ring.material = mat.acid;
    const eye = BABYLON.MeshBuilder.CreateSphere('gate eye', { diameter: 1.5, segments: 20 }, scene);
    eye.position.set(0, 5.4, 15.25); eye.scaling.y = .45; eye.material = mat.jade;
    const pool=BABYLON.MeshBuilder.CreateDisc('sacred jungle pool',{radius:3.1,tessellation:48},scene);pool.position.set(0,.64,-10.8);pool.rotation.x=Math.PI/2;pool.material=mat.water;pool.isPickable=false;
    for(let i=0;i<3;i++){const poolRing=BABYLON.MeshBuilder.CreateTorus('pool glyph ring',{diameter:2.6+i*1.45,thickness:.045,tessellation:56},scene);poolRing.position.set(0,.67+i*.008,-10.8);poolRing.rotation.x=Math.PI/2;poolRing.material=i%2?mat.acid:mat.jade;poolRing.isPickable=false}

    guardianRoot=new BABYLON.TransformNode('hidden temple guardian',scene);guardianRoot.position.set(0,5.5,14.3);guardianRoot.scaling.setAll(.01);guardianRoot.setEnabled(false);
    const mask=BABYLON.MeshBuilder.CreateSphere('guardian stone mask',{diameter:3.4,segments:20},scene);mask.parent=guardianRoot;mask.scaling.set(1.2,.82,.34);mask.material=mat.carved;
    const jaw=box('guardian jaw',[2.2,.65,.65],[0,-1.05,-.18],mat.moss);jaw.parent=guardianRoot;
    [-1,0,1].forEach((slot)=>{const guardianEye=BABYLON.MeshBuilder.CreateSphere('guardian acid eye',{diameter:slot? .48:.58,segments:14},scene);guardianEye.parent=guardianRoot;guardianEye.position.set(slot*.72,.24+Math.abs(slot)*.1,-.58);guardianEye.scaling.y=.55;guardianEye.material=mat.acid;guardianEyes.push(guardianEye)});
    [-1,1].forEach(side=>{const horn=BABYLON.MeshBuilder.CreateCylinder('guardian jade horn',{height:2.2,diameterTop:0,diameterBottom:.55,tessellation:7},scene);horn.parent=guardianRoot;horn.position.set(side*1.65,.8,0);horn.rotation.z=side*-.7;horn.material=mat.jade});
    scene.registerBeforeRender(() => { eye.rotation.y += .002; ring.rotation.z -= .0012; guardianEyes.forEach((item,index)=>item.scaling.x=.9+Math.sin(performance.now()*.008+index)*.12); });
  }

  function glyphMaterial(symbol) {
    if (glyphMaterials.has(symbol)) return glyphMaterials.get(symbol);
    const texture = new BABYLON.DynamicTexture(`glyph ${symbol}`, { width: 512, height: 640 }, scene, true);
    const ctx = texture.getContext();
    const gradient = ctx.createLinearGradient(0, 0, 512, 640);
    gradient.addColorStop(0, '#f5f0cf'); gradient.addColorStop(1, '#b8c3a8');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 512, 640);
    ctx.strokeStyle = '#c99b3a'; ctx.lineWidth = 24; ctx.strokeRect(25, 25, 462, 590);
    ctx.strokeStyle = '#356c58'; ctx.lineWidth = 7; ctx.strokeRect(53, 53, 406, 534);
    ctx.fillStyle = '#153c35'; ctx.font = 'bold 250px Georgia'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(symbol, 256, 305);
    ctx.font = 'bold 34px Arial'; ctx.fillText('X E N O', 256, 535); texture.update();
    const material = new BABYLON.PBRMaterial(`glyph material ${symbol}`, scene);
    material.albedoTexture = texture; material.roughness = .47; material.metallic = .03;
    glyphMaterials.set(symbol, material);
    return material;
  }

  function layout() {
    const slots = []; let id = 0;
    const layer = (cols, rows, level) => {
      for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) slots.push({ id: id++, x: (col - (cols - 1) / 2) * 1.58, z: (row - (rows - 1) / 2) * 2.02, layer: level, alive: true });
    };
    if (selectedTileCount === 64) {
      layer(8, 4, 0); layer(6, 4, 1); layer(4, 2, 2);
    } else {
      layer(12, 6, 0); layer(10, 4, 1); layer(6, 2, 2); layer(4, 1, 3);
    }
    return slots;
  }

  function isFreeIn(tile, alive, all = tiles) {
    if (!alive.has(tile.id)) return false;
    let left = false, right = false, covered = false;
    for (const other of all) {
      if (other.id === tile.id || !alive.has(other.id)) continue;
      const dx = other.x - tile.x, dz = Math.abs(other.z - tile.z);
      if (other.layer > tile.layer && Math.abs(dx) < 1.3 && dz < 1.48) covered = true;
      if (other.layer === tile.layer && dz < .74) {
        if (dx < -.2 && dx > -1.82) left = true;
        if (dx > .2 && dx < 1.82) right = true;
      }
    }
    return !covered && !(left && right);
  }

  function removalPairs(all, ids = all.map((tile) => tile.id)) {
    for (let attempt = 0; attempt < 100; attempt++) {
      const alive = new Set(ids), pairs = [];
      while (alive.size) {
        const free = all.filter((tile) => alive.has(tile.id) && isFreeIn(tile, alive, all));
        if (free.length < 2) break;
        const first = free[Math.floor(Math.random() * free.length)];
        const choices = free.filter((tile) => tile.id !== first.id);
        const second = choices[Math.floor(Math.random() * choices.length)];
        pairs.push([first.id, second.id]); alive.delete(first.id); alive.delete(second.id);
      }
      if (!alive.size) return pairs;
    }
    return null;
  }

  function shuffle(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
    return result;
  }

  function assignSolvable(all, ids = all.map((tile) => tile.id)) {
    const pairs = removalPairs(all, ids);
    if (!pairs) return false;
    const symbols = shuffle(pairs.map((_, i) => glyphs[i % glyphs.length]));
    pairs.forEach((pair, index) => pair.forEach((id) => { all.find((tile) => tile.id === id).symbol = symbols[index]; }));
    return true;
  }

  function createTile(tile) {
    const root = new BABYLON.TransformNode(`tile root ${tile.id}`, scene);
    root.position.set(tile.x, 1.43 + tile.layer * .4, tile.z); tile.homeY = root.position.y;
    const base = BABYLON.MeshBuilder.CreateBox(`tile ${tile.id}`, { width: 1.43, height: .34, depth: 1.84 }, scene);
    base.parent = root; base.material = mat.tile; base.receiveShadows = true; base.metadata = { tileId: tile.id };
    base.enableEdgesRendering(); base.edgesWidth = 2.5; base.edgesColor = new BABYLON.Color4(.05, .22, .16, .72); shadows.addShadowCaster(base);
    const face = BABYLON.MeshBuilder.CreatePlane(`face ${tile.id}`, { width: 1.27, height: 1.67 }, scene);
    face.parent = root; face.position.y = .176; face.rotation.x = Math.PI / 2; face.material = glyphMaterial(tile.symbol); face.metadata = { tileId: tile.id };
    Object.assign(tile, { root, base, face });
  }

  function buildBoard() {
    tiles.forEach((tile) => tile.root?.dispose());
    tiles = layout(); assignSolvable(tiles); tiles.forEach(createTile);
  }
  const aliveSet = () => new Set(tiles.filter((tile) => tile.alive).map((tile) => tile.id));
  const isFree = (tile) => tile.alive && isFreeIn(tile, aliveSet(), tiles);
  function availablePairs() {
    const groups = new Map(), pairs = [];
    tiles.filter(isFree).forEach((tile) => { if (!groups.has(tile.symbol)) groups.set(tile.symbol, []); groups.get(tile.symbol).push(tile); });
    groups.forEach((group) => { for (let i = 0; i + 1 < group.length; i += 2) pairs.push([group[i], group[i + 1]]); });
    return pairs;
  }
  function message(text, type = '') { ui.message.textContent = text; ui.message.className = `selection ${type}`.trim(); }
  function formatTime(seconds) { return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`; }
  function updateHud() {
    const remaining = tiles.filter((tile) => tile.alive).length, moves = availablePairs().length;
    ui.remaining.textContent = remaining; ui.moves.textContent = `${moves} FREE PAIRS`; ui.matches.textContent = `${matchCount} MATCHES`;
    ui.undo.disabled = !history.length || locked; ui.hint.disabled = !moves || locked; ui.shuffle.disabled = !remaining || locked;
    if (gameActive && remaining && !moves) message('HIVE STALEMATE — USE SHUFFLE', 'error');
  }
  function clearSelection() {
    if (selected) { highlight.removeMesh(selected.base); highlight.removeMesh(selected.face); selected.root.position.y = selected.homeY; }
    selected = null;
  }
  function clearHintTargets() {
    clearTimeout(hintTargetTimer); hintedIds.clear();
  }
  function flash(tile, color, duration = 500) {
    highlight.addMesh(tile.base, color); highlight.addMesh(tile.face, color);
    setTimeout(() => { if (tile !== selected) { highlight.removeMesh(tile.base); highlight.removeMesh(tile.face); } }, duration);
  }
  function animateMatch(first, second) {
    [first, second].forEach((tile, index) => {
      const lift = new BABYLON.Animation(`lift ${tile.id}`, 'position.y', 60, BABYLON.Animation.ANIMATIONTYPE_FLOAT);
      lift.setKeys([{ frame: 0, value: tile.homeY }, { frame: 20, value: tile.homeY + 1.1 }, { frame: 36, value: tile.homeY + 1.5 }]);
      const shrink = new BABYLON.Animation(`shrink ${tile.id}`, 'scaling', 60, BABYLON.Animation.ANIMATIONTYPE_VECTOR3);
      shrink.setKeys([{ frame: 0, value: BABYLON.Vector3.One() }, { frame: 30, value: new BABYLON.Vector3(.15, .15, .15) }]);
      tile.root.animations = [lift, shrink];
      scene.beginAnimation(tile.root, 0, 36, false, 1, () => {
        tile.root.setEnabled(false); tile.root.scaling.copyFromFloats(1, 1, 1); tile.root.position.y = tile.homeY;
        if (index) { locked = false; updateHud(); if (!tiles.some((item) => item.alive)) win(); }
      });
    });
  }

  function choose(tile) {
    if (!gameActive || locked || !tile?.alive) return;
    if (!isFree(tile)) { flash(tile, new BABYLON.Color3(1, .18, .12), 420); message('SEALED BY THE TEMPLE', 'error'); sound('blocked',tile); return; }
    if (!selected) {
      selected = tile; tile.root.position.y = tile.homeY + .18;
      highlight.addMesh(tile.base, new BABYLON.Color3(.4, 1, .72)); highlight.addMesh(tile.face, new BABYLON.Color3(.4, 1, .72));
      message(`${tile.symbol} SELECTED — FIND ITS TWIN`, 'good'); sound('select',tile); return;
    }
    if (selected.id === tile.id) { clearSelection(); message('SELECT A FREE TILE'); sound('select',tile); return; }
    if (selected.symbol !== tile.symbol) {
      const first = selected; flash(tile, new BABYLON.Color3(1, .2, .15), 450); flash(first, new BABYLON.Color3(1, .2, .15), 450);
      message('THE GLYPHS DO NOT MATCH', 'error'); sound('blocked',tile); clearSelection(); return;
    }
    const first = selected; clearSelection(); clearHintTargets(); locked = true; first.alive = false; tile.alive = false; history.push([first.id, tile.id]); matchCount++;
    message('GLYPH PAIR RELEASED', 'good'); sound('match',{x:(first.x+tile.x)/2}); animateMatch(first, tile);
    if(!templeEventPlayed&&matchCount>=nextTempleEvent)setTimeout(triggerTempleEvent,620);
  }

  function hint() {
    if (locked) return;
    clearSelection(); const pair = availablePairs()[0]; if (!pair) return;
    clearHintTargets(); hintedIds = new Set(pair.map((tile) => tile.id));
    pair.forEach((tile, index) => { flash(tile, new BABYLON.Color3(1, .72, .18), 3600 + index * 100); });
    hintTargetTimer = setTimeout(() => hintedIds.clear(), 4300);
    message('THE TEMPLE REVEALS A PAIR', 'good'); sound('hint',{x:(pair[0].x+pair[1].x)/2});
  }
  function hiveShuffle() {
    if (locked) return;
    clearSelection(); clearHintTargets(); const alive = tiles.filter((tile) => tile.alive);
    if (!alive.length || !assignSolvable(tiles, alive.map((tile) => tile.id))) return;
    alive.forEach((tile, index) => {
      tile.face.material = glyphMaterial(tile.symbol);
      const spin = new BABYLON.Animation('hive spin', 'rotation.y', 60, BABYLON.Animation.ANIMATIONTYPE_FLOAT);
      spin.setKeys([{ frame: 0, value: 0 }, { frame: 20 + index % 8, value: Math.PI * 2 }]); tile.root.animations = [spin]; scene.beginAnimation(tile.root, 0, 28, false);
    });
    message('THE HIVE HAS REARRANGED ITSELF', 'good'); sound('shuffle'); setTimeout(updateHud, 500);
  }
  function undo() {
    if (locked || !history.length) return;
    clearSelection(); clearHintTargets(); const ids = history.pop();
    ids.forEach((id) => {
      const tile = tiles.find((item) => item.id === id); tile.alive = true; tile.root.setEnabled(true); tile.root.scaling.copyFromFloats(.15, .15, .15);
      const grow = new BABYLON.Animation('restore', 'scaling', 60, BABYLON.Animation.ANIMATIONTYPE_VECTOR3);
      grow.setKeys([{ frame: 0, value: new BABYLON.Vector3(.15, .15, .15) }, { frame: 24, value: BABYLON.Vector3.One() }]); tile.root.animations = [grow]; scene.beginAnimation(tile.root, 0, 24, false);
    });
    matchCount = Math.max(0, matchCount - 1); message('THE TEMPLE RESTORES ONE PAIR'); sound('undo'); updateHud();
  }

  function prepareAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)(); masterGain = audioCtx.createGain(); masterGain.gain.value = soundOn ? 1.05 : 0;
    const compressor = audioCtx.createDynamicsCompressor(); compressor.threshold.value = -19; compressor.ratio.value = 6; compressor.attack.value = .004; compressor.release.value = .18;
    effectsGain=audioCtx.createGain();effectsGain.gain.value=1.55;ambienceGain=audioCtx.createGain();ambienceGain.gain.value=.42;effectsGain.connect(masterGain);ambienceGain.connect(masterGain);
    masterGain.connect(compressor).connect(audioCtx.destination);
  }
  function stereoNode(pan){if(!audioCtx.createStereoPanner)return null;const node=audioCtx.createStereoPanner();node.pan.value=Math.max(-.82,Math.min(.82,pan||0));return node}
  function tone(freq, duration, type = 'sine', volume = .12, delay = 0, endFreq, pan = 0, bus = effectsGain) {
    if (!soundOn || !audioCtx) return;
    const now = audioCtx.currentTime + delay, osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, now); if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
    gain.gain.setValueAtTime(.001, now); gain.gain.exponentialRampToValueAtTime(volume, now + .012); gain.gain.exponentialRampToValueAtTime(.001, now + duration);
    const panner=stereoNode(pan);osc.connect(gain);if(panner)gain.connect(panner).connect(bus);else gain.connect(bus);osc.start(now); osc.stop(now + duration + .03);
  }
  function noise(duration = .12, volume = .08, delay = 0, frequency = 1650, pan = 0, bus = effectsGain) {
    if (!soundOn || !audioCtx) return;
    const rate = audioCtx.sampleRate, buffer = audioCtx.createBuffer(1, rate * duration, rate), data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
    const src = audioCtx.createBufferSource(), filter = audioCtx.createBiquadFilter(), gain = audioCtx.createGain();
    filter.type = 'bandpass'; filter.frequency.value = frequency;filter.Q.value=1.6; gain.gain.value = volume; src.buffer = buffer;const panner=stereoNode(pan);src.connect(filter).connect(gain);if(panner)gain.connect(panner).connect(bus);else gain.connect(bus);src.start(audioCtx.currentTime + delay);
  }
  function sound(kind,source) {
    if (!soundOn || !audioCtx) return;
    const pan=Math.max(-.78,Math.min(.78,(source?.x||0)/10));
    const fx=window.DanArcadeFX;
    if(kind==='select')fx?.play('metal',{enabled:soundOn,volume:.12,rate:1.72,pan,cooldown:55});
    if(kind==='match'){fx?.play('metal',{enabled:soundOn,volume:.24,rate:1.35,pan,cooldown:55});fx?.burst(document.querySelector('.game-stage'),'#9cff68',10)}
    if(kind==='shuffle')fx?.play('card',{enabled:soundOn,volume:.18,rate:.78,duration:.5});
    if(kind==='guardian'){fx?.play('door',{enabled:soundOn,volume:.36,rate:.62,duration:1.2});fx?.play('metal',{enabled:soundOn,volume:.3,rate:.58,offset:.08});fx?.shake(document.querySelector('.game-stage'),.85)}
    if(kind==='victory'){fx?.play('cheer',{enabled:soundOn,volume:.3,duration:2.8});fx?.hit(document.querySelector('.game-stage'),'#caff68',1)}
    if (kind === 'select') { noise(.052,.16,0,2350,pan);tone(1180,.07,'triangle',.12,0,760,pan);tone(190,.045,'sine',.08,.012,140,pan); }
    if (kind === 'blocked') {noise(.08,.11,0,520,pan);tone(145,.22,'sawtooth',.1,0,72,pan)}
    if (kind === 'match') { noise(.085,.22,0,2700,pan);noise(.12,.11,.055,940,pan);tone(610,.24,'triangle',.15,.015,1240,pan);tone(920,.38,'sine',.12,.08,1680,pan);tone(120,.18,'sine',.07,0,72,pan); }
    if (kind === 'hint') [440,660,990].forEach((freq,i)=>tone(freq,.28,'sine',.09,i*.07,freq*1.22,pan));
    if (kind === 'shuffle') for(let i=0;i<12;i++){noise(.04,.055,i*.032,1100+i*95,(i%2?-.5:.5));tone(180+i*32,.075,'square',.035,i*.032,260+i*36,(i%2?-.4:.4))}
    if (kind === 'undo') {tone(720,.28,'triangle',.12,0,240,pan);noise(.07,.08,.02,1300,pan)}
    if (kind === 'guardian') {noise(.72,.21,0,280,0);tone(72,1.2,'sawtooth',.16,0,34,0);tone(680,.45,'square',.07,.08,110,0);noise(.18,.16,.48,2100,0)}
    if (kind === 'victory') { [392,523,659,784,1047].forEach((freq,i)=>tone(freq,.9,'sine',.12,i*.16,undefined,(i-2)*.24));for(let i=0;i<18;i++)noise(.07,.035,.15+i*.08,1800,(i%2?-.55:.55)); }
  }
  function startAmbience() {
    prepareAudio(); if (ambienceTimer) return;
    [44,66].forEach((freq,i)=>{const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.type=i?'triangle':'sine';osc.frequency.value=freq;gain.gain.value=.025;osc.connect(gain).connect(ambienceGain);osc.start()});
    ambienceTimer=setInterval(()=>{if(soundOn&&gameActive){const base=[174,220,261,329][Math.floor(Math.random()*4)];tone(base,1.8,'sine',.025,0,base*1.5,(Math.random()-.5)*.7,ambienceGain)}},3400);
  }
  function toggleSound() {
    prepareAudio(); soundOn = !soundOn; masterGain.gain.setTargetAtTime(soundOn ? 1.05 : 0, audioCtx.currentTime, .03);
    ui.sound.setAttribute('aria-pressed', String(soundOn)); ui.sound.textContent = soundOn ? '◖)) SOUND' : '◖)) MUTED'; if (soundOn) sound('select');
  }
  function startTimer() {
    clearInterval(timerHandle); startedAt = performance.now(); ui.timer.textContent = '00:00';
    timerHandle = setInterval(() => { if (gameActive) ui.timer.textContent = formatTime((performance.now() - startedAt) / 1000); }, 250);
  }
  function victoryBurst() {
    const pieces = [];
    for (let i = 0; i < 50; i++) {
      const mesh = i % 2 ? BABYLON.MeshBuilder.CreateSphere('victory orb', { diameter: .18 + Math.random() * .25, segments: 6 }, scene) : BABYLON.MeshBuilder.CreatePolyhedron('victory glyph', { type: 1, size: .2 + Math.random() * .2 }, scene);
      mesh.position.set((Math.random() - .5) * 15, 1 + Math.random() * 2, (Math.random() - .5) * 9); mesh.material = i % 3 ? mat.jade : mat.gold;
      pieces.push({ mesh, speed: .035 + Math.random() * .07, spin: (Math.random() - .5) * .12 });
    }
    const observer = scene.onBeforeRenderObservable.add(() => pieces.forEach((piece) => { piece.mesh.position.y += piece.speed; piece.mesh.rotation.y += piece.spin; piece.mesh.rotation.x += piece.spin * .7; }));
    setTimeout(() => { scene.onBeforeRenderObservable.remove(observer); pieces.forEach((piece) => piece.mesh.dispose()); }, 5200);
  }
  function triggerTempleEvent(){
    if(templeEventPlayed||!gameActive||!guardianRoot)return;templeEventPlayed=true;guardianRoot.setEnabled(true);guardianRoot.position.set(0,5.5,14.3);guardianRoot.scaling.setAll(.01);
    const approach=new BABYLON.Animation('guardian approach','position.z',60,BABYLON.Animation.ANIMATIONTYPE_FLOAT),scale=new BABYLON.Animation('guardian reveal','scaling',60,BABYLON.Animation.ANIMATIONTYPE_VECTOR3);
    approach.setKeys([{frame:0,value:14.3},{frame:13,value:8.2},{frame:48,value:8.8},{frame:76,value:14.3}]);scale.setKeys([{frame:0,value:new BABYLON.Vector3(.01,.01,.01)},{frame:12,value:new BABYLON.Vector3(1.28,1.28,1.28)},{frame:48,value:new BABYLON.Vector3(1,1,1)},{frame:76,value:new BABYLON.Vector3(.01,.01,.01)}]);guardianRoot.animations=[approach,scale];
    ui.event.classList.add('show');document.querySelector('.game-stage').classList.add('quake');key.intensity=72;sound('guardian');message('AN ANCIENT PRESENCE HAS AWAKENED','good');
    scene.beginAnimation(guardianRoot,0,76,false,1,()=>{guardianRoot.setEnabled(false);key.intensity=victoryMode?64:38});setTimeout(()=>document.querySelector('.game-stage').classList.remove('quake'),520);setTimeout(()=>ui.event.classList.remove('show'),1850);
  }
  function win() {
    gameActive = false; victoryMode = true; clearInterval(timerHandle); const elapsed = formatTime((performance.now() - startedAt) / 1000);
    const elapsedSeconds = (performance.now() - startedAt) / 1000;
    window.DanArcadeScores?.record('xeno-mahjong.html', Math.max(1, selectedTileCount * 100000 - Math.round(elapsedSeconds * 100)), `${selectedTileCount} tiles · ${elapsed}`, `${matchCount} pairs`);
    ui.victoryStats.textContent = `${selectedTileCount} tiles · ${matchCount} pairs released · ${elapsed}`; message('THE STAR GATE IS OPEN', 'good'); sound('victory'); victoryBurst(); key.intensity = 64;
    setTimeout(() => ui.victory.classList.remove('hidden'), 1250);
  }
  function startGame() {
    prepareAudio(); if (audioCtx.state === 'suspended') audioCtx.resume();
    ui.start.classList.add('hidden'); ui.victory.classList.add('hidden'); ui.event.classList.remove('show'); gameActive = true; victoryMode = false; locked = false; history = []; matchCount = 0; key.intensity = 38;templeEventPlayed=false;nextTempleEvent=6+Math.floor(Math.random()*7);guardianRoot?.setEnabled(false);
    startTimer(); startAmbience(); updateHud(); message('SELECT A FREE TILE'); sound('hint');
  }
  function replay() { clearSelection(); clearHintTargets(); buildBoard(); startGame(); }

  function pickTileAt(x, y, allowedIds) {
    if (!allowedIds.size) return null;
    const pick = scene.pick(x, y, (mesh) => Number.isInteger(mesh.metadata?.tileId) && allowedIds.has(mesh.metadata.tileId));
    return pick?.hit ? tiles.find((tile) => tile.id === pick.pickedMesh.metadata.tileId) : null;
  }

  let pointerStart = null;
  canvas.addEventListener('pointerdown', (event) => { pointerStart = { x: event.clientX, y: event.clientY, at: performance.now(), type: event.pointerType }; });
  canvas.addEventListener('pointerup', (event) => {
    if (!pointerStart) return;
    const distance = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y), elapsed = performance.now() - pointerStart.at; pointerStart = null;
    const touch = event.pointerType === 'touch', movementLimit = touch ? 24 : 12, timeLimit = touch ? 1400 : 900;
    if (distance > movementLimit || elapsed > timeLimit) return;
    const rect = canvas.getBoundingClientRect(), x = event.clientX - rect.left, y = event.clientY - rect.top;
    const freeIds = new Set(tiles.filter(isFree).map((tile) => tile.id));
    const hintedFreeIds = new Set([...hintedIds].filter((id) => freeIds.has(id)));
    const aliveIds = new Set(tiles.filter((tile) => tile.alive).map((tile) => tile.id));
    const tile = pickTileAt(x, y, hintedFreeIds) || pickTileAt(x, y, aliveIds);
    if (tile) choose(tile);
  });
  canvas.addEventListener('pointercancel', () => { pointerStart = null; });
  document.querySelectorAll('[data-tile-count]').forEach((button) => {
    const count = Number(button.dataset.tileCount);
    const selectMode = () => {
      selectedTileCount = count;
      document.querySelectorAll('[data-tile-count]').forEach((option) => {
        const active = Number(option.dataset.tileCount) === count;
        option.classList.toggle('selected', active); option.setAttribute('aria-pressed', String(active));
      });
      buildBoard(); updateHud();
    };
    if (count === selectedTileCount) selectMode();
    button.addEventListener('click', selectMode);
  });
  $('startButton').addEventListener('click', startGame); $('replayButton').addEventListener('click', replay);
  ui.hint.addEventListener('click', hint); ui.shuffle.addEventListener('click', hiveShuffle); ui.undo.addEventListener('click', undo); ui.sound.addEventListener('click', toggleSound);
  window.addEventListener('resize', () => engine.resize());
  window.addEventListener('keydown', (event) => { if (event.key.toLowerCase() === 'h') hint(); if (event.key.toLowerCase() === 'u') undo(); });
  buildTemple(); buildBoard(); updateHud();
  engine.runRenderLoop(() => { if (victoryMode) camera.alpha += .00075; scene.render(); });
})();
