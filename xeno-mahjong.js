(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const canvas = $('renderCanvas');
  const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(.008, .018, .025, 1);
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = .012;
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
  shadows.useBlurExponentialShadowMap = true;
  shadows.blurKernel = 24;
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
    dark: pbr('void metal', '#050a10', .7, .3),
    tile: pbr('tile ceramic', '#aebba0', .05, .5),
  };
  const highlight = new BABYLON.HighlightLayer('tile glow', scene);
  highlight.blurHorizontalSize = 1.25;
  highlight.blurVerticalSize = 1.25;
  const glyphs = ['◉', '✦', '⌁', '☽', '△', '⊕', '◇', '☄', '♆', '♁', '☼', '∞', '⌬', '⟁', '☯', '♢', '☊', '⌖', '✧', '⟡', '◈', '⏣', '⍟', '⌾', '☿', '⚶', '⧫', '⦿', '✺', '⟟', '⸙', '☍'];
  const glyphMaterials = new Map();
  const ui = { remaining: $('tilesRemaining'), moves: $('movesAvailable'), timer: $('timer'), matches: $('matches'), message: $('selectionText'), start: $('startScreen'), victory: $('victoryScreen'), victoryStats: $('victoryStats'), hint: $('hintButton'), shuffle: $('shuffleButton'), undo: $('undoButton'), sound: $('soundButton') };
  let tiles = [], selected = null, locked = false, history = [], matchCount = 0;
  let gameActive = false, victoryMode = false, startedAt = 0, timerHandle = 0;
  let soundOn = true, audioCtx = null, masterGain = null, ambienceTimer = 0;

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
    for (let x = -10; x <= 10; x += 2) { const seam = box('jade seam', [.045, .025, 13.4], [x, .63, 0], mat.jade); seam.isPickable = false; }
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
      }
    });
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
    scene.registerBeforeRender(() => { eye.rotation.y += .002; ring.rotation.z -= .0012; });
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
    layer(12, 6, 0); layer(10, 4, 1); layer(6, 2, 2); layer(4, 1, 3);
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
    const symbols = shuffle(pairs.map((_, i) => glyphs[Math.floor(i / 2) % glyphs.length]));
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
    if (!isFree(tile)) { flash(tile, new BABYLON.Color3(1, .18, .12), 420); message('SEALED BY THE TEMPLE', 'error'); sound('blocked'); return; }
    if (!selected) {
      selected = tile; tile.root.position.y = tile.homeY + .18;
      highlight.addMesh(tile.base, new BABYLON.Color3(.4, 1, .72)); highlight.addMesh(tile.face, new BABYLON.Color3(.4, 1, .72));
      message(`${tile.symbol} SELECTED — FIND ITS TWIN`, 'good'); sound('select'); return;
    }
    if (selected.id === tile.id) { clearSelection(); message('SELECT A FREE TILE'); sound('select'); return; }
    if (selected.symbol !== tile.symbol) {
      const first = selected; flash(tile, new BABYLON.Color3(1, .2, .15), 450); flash(first, new BABYLON.Color3(1, .2, .15), 450);
      message('THE GLYPHS DO NOT MATCH', 'error'); sound('blocked'); clearSelection(); return;
    }
    const first = selected; clearSelection(); locked = true; first.alive = false; tile.alive = false; history.push([first.id, tile.id]); matchCount++;
    message('GLYPH PAIR RELEASED', 'good'); sound('match'); animateMatch(first, tile);
  }

  function hint() {
    if (locked) return;
    clearSelection(); const pair = availablePairs()[0]; if (!pair) return;
    pair.forEach((tile, index) => { flash(tile, new BABYLON.Color3(1, .72, .18), 1250 + index * 100); });
    message('THE TEMPLE REVEALS A PAIR', 'good'); sound('hint');
  }
  function hiveShuffle() {
    if (locked) return;
    clearSelection(); const alive = tiles.filter((tile) => tile.alive);
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
    clearSelection(); const ids = history.pop();
    ids.forEach((id) => {
      const tile = tiles.find((item) => item.id === id); tile.alive = true; tile.root.setEnabled(true); tile.root.scaling.copyFromFloats(.15, .15, .15);
      const grow = new BABYLON.Animation('restore', 'scaling', 60, BABYLON.Animation.ANIMATIONTYPE_VECTOR3);
      grow.setKeys([{ frame: 0, value: new BABYLON.Vector3(.15, .15, .15) }, { frame: 24, value: BABYLON.Vector3.One() }]); tile.root.animations = [grow]; scene.beginAnimation(tile.root, 0, 24, false);
    });
    matchCount = Math.max(0, matchCount - 1); message('THE TEMPLE RESTORES ONE PAIR'); sound('undo'); updateHud();
  }

  function prepareAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)(); masterGain = audioCtx.createGain(); masterGain.gain.value = soundOn ? 1.25 : 0;
    const compressor = audioCtx.createDynamicsCompressor(); compressor.threshold.value = -19; compressor.ratio.value = 6; compressor.attack.value = .004; compressor.release.value = .18;
    masterGain.connect(compressor).connect(audioCtx.destination);
  }
  function tone(freq, duration, type = 'sine', volume = .12, delay = 0, endFreq) {
    if (!soundOn || !audioCtx) return;
    const now = audioCtx.currentTime + delay, osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, now); if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
    gain.gain.setValueAtTime(.001, now); gain.gain.exponentialRampToValueAtTime(volume, now + .012); gain.gain.exponentialRampToValueAtTime(.001, now + duration);
    osc.connect(gain).connect(masterGain); osc.start(now); osc.stop(now + duration + .03);
  }
  function noise(duration = .12, volume = .08, delay = 0) {
    if (!soundOn || !audioCtx) return;
    const rate = audioCtx.sampleRate, buffer = audioCtx.createBuffer(1, rate * duration, rate), data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
    const src = audioCtx.createBufferSource(), filter = audioCtx.createBiquadFilter(), gain = audioCtx.createGain();
    filter.type = 'bandpass'; filter.frequency.value = 1650; gain.gain.value = volume; src.buffer = buffer; src.connect(filter).connect(gain).connect(masterGain); src.start(audioCtx.currentTime + delay);
  }
  function sound(kind) {
    if (!soundOn || !audioCtx) return;
    if (kind === 'select') { tone(520, .09, 'triangle', .11, 0, 680); noise(.045, .05); }
    if (kind === 'blocked') tone(165, .18, 'sawtooth', .08, 0, 95);
    if (kind === 'match') { noise(.1, .15); tone(480, .25, 'triangle', .13, .01, 920); tone(720, .35, 'sine', .1, .08, 1250); }
    if (kind === 'hint') [440, 660, 880].forEach((freq, i) => tone(freq, .24, 'sine', .08, i * .08));
    if (kind === 'shuffle') for (let i = 0; i < 10; i++) tone(210 + i * 45, .08, 'square', .035, i * .035);
    if (kind === 'undo') tone(660, .25, 'triangle', .1, 0, 280);
    if (kind === 'victory') { [392, 523, 659, 784, 1047].forEach((freq, i) => tone(freq, .9, 'sine', .12, i * .16)); for (let i = 0; i < 18; i++) noise(.07, .035, .15 + i * .08); }
  }
  function startAmbience() {
    prepareAudio(); if (ambienceTimer) return;
    [44, 66].forEach((freq, i) => { const osc = audioCtx.createOscillator(), gain = audioCtx.createGain(); osc.type = i ? 'triangle' : 'sine'; osc.frequency.value = freq; gain.gain.value = .025; osc.connect(gain).connect(masterGain); osc.start(); });
    ambienceTimer = setInterval(() => { if (soundOn && gameActive) { const base = [174, 220, 261, 329][Math.floor(Math.random() * 4)]; tone(base, 1.8, 'sine', .025, 0, base * 1.5); } }, 3400);
  }
  function toggleSound() {
    prepareAudio(); soundOn = !soundOn; masterGain.gain.setTargetAtTime(soundOn ? 1.25 : 0, audioCtx.currentTime, .03);
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
  function win() {
    gameActive = false; victoryMode = true; clearInterval(timerHandle); const elapsed = formatTime((performance.now() - startedAt) / 1000);
    ui.victoryStats.textContent = `${matchCount} pairs released · ${elapsed}`; message('THE STAR GATE IS OPEN', 'good'); sound('victory'); victoryBurst(); key.intensity = 64;
    setTimeout(() => ui.victory.classList.remove('hidden'), 1250);
  }
  function startGame() {
    prepareAudio(); if (audioCtx.state === 'suspended') audioCtx.resume();
    ui.start.classList.add('hidden'); ui.victory.classList.add('hidden'); gameActive = true; victoryMode = false; locked = false; history = []; matchCount = 0; key.intensity = 38;
    startTimer(); startAmbience(); updateHud(); message('SELECT A FREE TILE'); sound('hint');
  }
  function replay() { clearSelection(); buildBoard(); startGame(); }

  let pointerStart = null;
  canvas.addEventListener('pointerdown', (event) => { pointerStart = { x: event.clientX, y: event.clientY, at: performance.now() }; });
  canvas.addEventListener('pointerup', (event) => {
    if (!pointerStart) return;
    const distance = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y), elapsed = performance.now() - pointerStart.at; pointerStart = null;
    if (distance > 9 || elapsed > 650) return;
    const rect = canvas.getBoundingClientRect(), pick = scene.pick(event.clientX - rect.left, event.clientY - rect.top, (mesh) => Number.isInteger(mesh.metadata?.tileId));
    if (pick?.hit) choose(tiles.find((tile) => tile.id === pick.pickedMesh.metadata.tileId));
  });
  $('startButton').addEventListener('click', startGame); $('replayButton').addEventListener('click', replay);
  ui.hint.addEventListener('click', hint); ui.shuffle.addEventListener('click', hiveShuffle); ui.undo.addEventListener('click', undo); ui.sound.addEventListener('click', toggleSound);
  window.addEventListener('resize', () => engine.resize());
  window.addEventListener('keydown', (event) => { if (event.key.toLowerCase() === 'h') hint(); if (event.key.toLowerCase() === 'u') undo(); });
  buildTemple(); buildBoard(); updateHud();
  engine.runRenderLoop(() => { if (victoryMode) camera.alpha += .00075; scene.render(); });
})();
