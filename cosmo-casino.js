(() => {
  'use strict';

  const canvas = document.querySelector('#spaceScene');
  if (!window.BABYLON || !canvas) return;

  const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.012, 0.008, 0.035, 1);
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.009;
  scene.fogColor = new BABYLON.Color3(0.025, 0.018, 0.075);

  const camera = new BABYLON.ArcRotateCamera('camera', Math.PI / 2, 1.19, 17.5, new BABYLON.Vector3(0, 1.45, 1), scene);
  camera.lowerRadiusLimit = 15;
  camera.upperRadiusLimit = 19;
  camera.lowerBetaLimit = 1.02;
  camera.upperBetaLimit = 1.35;
  camera.inputs.clear();

  const glow = new BABYLON.GlowLayer('casinoGlow', scene, { blurKernelSize: 46 });
  glow.intensity = 0.7;

  function material(name, color, emissive = null, metallic = 0.25, roughness = 0.55) {
    const mat = new BABYLON.PBRMaterial(name, scene);
    mat.albedoColor = BABYLON.Color3.FromHexString(color);
    mat.metallic = metallic;
    mat.roughness = roughness;
    if (emissive) mat.emissiveColor = BABYLON.Color3.FromHexString(emissive);
    return mat;
  }

  function textureMaterial(mat, url, uScale, vScale, tint) {
    const texture = new BABYLON.Texture(url, scene, false, false, BABYLON.Texture.TRILINEAR_SAMPLINGMODE);
    texture.uScale = uScale; texture.vScale = vScale; texture.anisotropicFilteringLevel = 16;
    mat.albedoTexture = texture; mat.albedoColor = BABYLON.Color3.FromHexString(tint);
    return mat;
  }

  const darkMetal = textureMaterial(material('obsidian hull', '#101020', null, 0.82, 0.3), 'assets/textures/alien-hull-v1.webp', 4.5, 4.5, '#53616b');
  const purpleMetal = material('violet alloy', '#251343', null, 0.62, 0.35);
  const cyanGlow = material('cyan conduits', '#063b47', '#22dcca', 0.25, 0.25);
  const goldGlow = material('credit gold', '#8f5b12', '#ffc34a', 0.6, 0.22);
  const magentaGlow = material('magenta neon', '#45124a', '#ec44c6', 0.35, 0.28);

  const hemi = new BABYLON.HemisphericLight('ambient', new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.36;
  hemi.diffuse = new BABYLON.Color3(0.36, 0.47, 0.72);
  const key = new BABYLON.PointLight('table light', new BABYLON.Vector3(0, 6, 1), scene);
  key.diffuse = BABYLON.Color3.FromHexString('#8ffff0');
  key.intensity = 1.25;
  key.range = 22;
  const rimLight = new BABYLON.PointLight('violet rim', new BABYLON.Vector3(-7, 3, 5), scene);
  rimLight.diffuse = BABYLON.Color3.FromHexString('#a14fff');
  rimLight.intensity = 1.6;
  rimLight.range = 15;

  const floor = BABYLON.MeshBuilder.CreateCylinder('lounge floor', { diameter: 25, height: 0.35, tessellation: 64 }, scene);
  floor.position.y = -1.5;
  floor.material = darkMetal;

  for (let ring = 3; ring <= 11; ring += 2) {
    const rim = BABYLON.MeshBuilder.CreateTorus(`floor ring ${ring}`, { diameter: ring * 2, thickness: 0.025, tessellation: 96 }, scene);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -1.31;
    rim.material = ring % 4 ? cyanGlow : magentaGlow;
  }

  const tableBase = BABYLON.MeshBuilder.CreateCylinder('casino table base', { diameter: 10.8, height: 1.05, tessellation: 64 }, scene);
  tableBase.scaling.z = 0.66;
  tableBase.position = new BABYLON.Vector3(0, -0.8, 1.6);
  tableBase.material = purpleMetal;
  const tableTop = BABYLON.MeshBuilder.CreateCylinder('holographic felt', { diameter: 10.4, height: 0.16, tessellation: 64 }, scene);
  tableTop.scaling.z = 0.65;
  tableTop.position = new BABYLON.Vector3(0, -0.2, 1.6);
  tableTop.material = textureMaterial(material('midnight felt', '#071c25', '#03151a', 0.12, 0.72), 'assets/textures/orbital-felt-v1.webp', 2.2, 1.5, '#82738f');
  const tableRim = BABYLON.MeshBuilder.CreateTorus('table neon rim', { diameter: 10.65, thickness: 0.16, tessellation: 96 }, scene);
  tableRim.scaling.z = 0.65;
  tableRim.rotation.x = Math.PI / 2;
  tableRim.position = new BABYLON.Vector3(0, -0.08, 1.6);
  tableRim.material = goldGlow;

  function createArch(z, scale, mat) {
    const path = [];
    for (let i = 0; i <= 32; i += 1) {
      const a = Math.PI * i / 32;
      path.push(new BABYLON.Vector3(Math.cos(a) * 9 * scale, Math.sin(a) * 6.5 * scale - 1.3, z));
    }
    const arch = BABYLON.MeshBuilder.CreateTube(`arch ${z}`, { path, radius: 0.15 * scale, tessellation: 12 }, scene);
    arch.material = mat;
  }
  createArch(5, 1, cyanGlow);
  createArch(7.3, 1.12, magentaGlow);
  createArch(9.6, 1.23, purpleMetal);

  const panelMetal = textureMaterial(material('brushed hull panels', '#182332', null, 0.88, 0.27), 'assets/textures/alien-circuit-v1.webp', 2.4, 3.2, '#5e6978');
  const panelGlass = material('console glass', '#092638', '#063748', 0.16, 0.18);
  panelGlass.alpha = 0.82;
  const loungePulseNodes = [];
  for (const side of [-1, 1]) {
    for (let index = 0; index < 3; index += 1) {
      const wall = BABYLON.MeshBuilder.CreateBox(`wall module ${side} ${index}`, { width: 0.26, height: 3.75, depth: 2.65 }, scene);
      wall.position = new BABYLON.Vector3(side * 8.65, 1.15, 1.6 + index * 3.05);
      wall.material = panelMetal;
      const inset = BABYLON.MeshBuilder.CreateBox(`wall display ${side} ${index}`, { width: 0.08, height: 2.35, depth: 1.78 }, scene);
      inset.position = new BABYLON.Vector3(side * 8.49, 1.25, 1.6 + index * 3.05);
      inset.material = index === 1 ? panelGlass : purpleMetal;
      const statusBar = BABYLON.MeshBuilder.CreateBox(`wall status ${side} ${index}`, { width: 0.09, height: 0.09, depth: 1.65 }, scene);
      statusBar.position = new BABYLON.Vector3(side * 8.42, 2.55, 1.6 + index * 3.05);
      statusBar.material = index % 2 ? magentaGlow : cyanGlow;
      loungePulseNodes.push(statusBar);
    }
  }

  for (let index = -3; index <= 3; index += 1) {
    const ceilingStrip = BABYLON.MeshBuilder.CreateBox(`ceiling conduit ${index}`, { width: 0.12, height: 0.08, depth: 6.4 }, scene);
    ceilingStrip.position = new BABYLON.Vector3(index * 2.25, 6.15 - Math.abs(index) * 0.12, 4.9);
    ceilingStrip.material = index % 2 ? magentaGlow : cyanGlow;
    loungePulseNodes.push(ceilingStrip);
  }

  for (const x of [-6.1, 6.1]) {
    const pod = BABYLON.MeshBuilder.CreateCylinder(`lounge reactor ${x}`, { diameter: 1.25, height: 2.4, tessellation: 24 }, scene);
    pod.position = new BABYLON.Vector3(x, 0.05, 4.1);
    pod.material = darkMetal;
    const core = BABYLON.MeshBuilder.CreateCylinder(`lounge reactor core ${x}`, { diameter: 0.56, height: 2.05, tessellation: 20 }, scene);
    core.position = new BABYLON.Vector3(x, 0.08, 4.1);
    core.material = x < 0 ? cyanGlow : magentaGlow;
    loungePulseNodes.push(core);
  }

  for (let i = 0; i < 14; i += 1) {
    const angle = (i / 14) * Math.PI * 2;
    const column = BABYLON.MeshBuilder.CreateCylinder(`hull rib ${i}`, { diameter: 0.34, height: 7.5, tessellation: 10 }, scene);
    column.position = new BABYLON.Vector3(Math.cos(angle) * 10.5, 2, Math.sin(angle) * 10.5 + 2);
    column.rotation.z = Math.cos(angle) * 0.08;
    column.material = i % 3 === 0 ? cyanGlow : darkMetal;
  }

  const windowGlass = material('observation glass', '#071324', '#020613', 0.1, 0.08);
  windowGlass.alpha = 0.62;
  const observationWindow = BABYLON.MeshBuilder.CreateDisc('observation window', { radius: 7.6, tessellation: 64 }, scene);
  observationWindow.position = new BABYLON.Vector3(0, 3.4, 9.9);
  observationWindow.rotation.x = Math.PI;
  observationWindow.material = windowGlass;

  for (let i = 0; i < 180; i += 1) {
    const star = BABYLON.MeshBuilder.CreateSphere(`star ${i}`, { diameter: 0.018 + Math.random() * 0.05, segments: 3 }, scene);
    star.position = new BABYLON.Vector3((Math.random() - 0.5) * 25, Math.random() * 12 - 1, 10.2 + Math.random() * 2.5);
    star.material = i % 11 === 0 ? goldGlow : cyanGlow;
  }

  const alienRoot = new BABYLON.TransformNode('ZYL-7 alien dealer', scene);
  alienRoot.position = new BABYLON.Vector3(0, 0.3, 5.2);
  const dealerSkin = material('dealer skin', '#48795e', '#092d22', 0.05, 0.48);
  const dealerSuit = material('dealer suit', '#361b55', null, 0.38, 0.3);
  const torso = BABYLON.MeshBuilder.CreateCapsule('dealer torso', { radius: 0.78, height: 2.3, tessellation: 24 }, scene);
  torso.scaling.z = 0.72;
  torso.parent = alienRoot;
  torso.position.y = 0.45;
  torso.material = dealerSuit;
  const head = BABYLON.MeshBuilder.CreateSphere('dealer head', { diameter: 1.72, segments: 24 }, scene);
  head.scaling = new BABYLON.Vector3(1.15, 1.3, 0.88);
  head.position.y = 2.05;
  head.parent = alienRoot;
  head.material = dealerSkin;
  for (const x of [-0.42, 0, 0.42]) {
    const eye = BABYLON.MeshBuilder.CreateSphere(`dealer eye ${x}`, { diameter: 0.3, segments: 16 }, scene);
    eye.scaling.y = 1.35;
    eye.position = new BABYLON.Vector3(x, 2.17 + (x === 0 ? 0.12 : 0), -0.74);
    eye.parent = alienRoot;
    eye.material = goldGlow;
  }
  for (const side of [-1, 1]) {
    const path = [new BABYLON.Vector3(side * 0.63, 1.2, 0), new BABYLON.Vector3(side * 1.3, 0.5, -0.4), new BABYLON.Vector3(side * 1.8, -0.05, -1.05)];
    const arm = BABYLON.MeshBuilder.CreateTube(`dealer arm ${side}`, { path, radius: 0.19, tessellation: 12 }, scene);
    arm.parent = alienRoot;
    arm.material = dealerSkin;
  }

  const sign = BABYLON.MeshBuilder.CreatePlane('casino hologram', { width: 5, height: 0.95 }, scene);
  sign.position = new BABYLON.Vector3(0, 5.4, 7.7);
  sign.material = material('hologram panel', '#10234d', '#4f23a6', 0, 0.2);
  sign.material.alpha = 0.34;

  let time = 0;
  scene.onBeforeRenderObservable.add(() => {
    time += engine.getDeltaTime() * 0.001;
    alienRoot.position.y = 0.3 + Math.sin(time * 1.25) * 0.045;
    tableRim.material.emissiveColor = BABYLON.Color3.FromHexString(Math.sin(time * 1.8) > 0 ? '#ffc34a' : '#ff9f32');
    camera.alpha = Math.PI / 2 + Math.sin(time * 0.12) * 0.022;
    loungePulseNodes.forEach((node, index) => {
      node.scaling.y = 1 + Math.sin(time * 1.5 + index * 0.7) * 0.025;
    });
  });

  window.cosmoSceneEffects = {
    mood(type) {
      const colors = {
        win: ['#c7ff68', '#69ffe6'],
        loss: ['#ff315f', '#9b38ff'],
        deal: ['#ffd34f', '#37dcca'],
        neutral: ['#8ffff0', '#a14fff']
      };
      const palette = colors[type] || colors.neutral;
      key.diffuse = BABYLON.Color3.FromHexString(palette[0]);
      rimLight.diffuse = BABYLON.Color3.FromHexString(palette[1]);
      key.intensity = type === 'win' ? 2.4 : type === 'loss' ? 1.9 : 1.35;
      setTimeout(() => {
        key.diffuse = BABYLON.Color3.FromHexString('#8ffff0');
        rimLight.diffuse = BABYLON.Color3.FromHexString('#a14fff');
        key.intensity = 1.25;
      }, type === 'neutral' ? 0 : 900);
    }
  };

  engine.runRenderLoop(() => scene.render());
  window.addEventListener('resize', () => engine.resize());
})();

(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const dom = {
    balance: $('#creditBalance'), wallet: $('.wallet'), pot: $('#potDisplay strong'), status: $('#statusMessage'), info: $('#handInfo'),
    label: $('#roundLabel'), dealer: $('#dealerHand'), player: $('#playerHand'), betConsole: $('#betConsole'), deal: $('#dealButton'),
    hit: $('#hitButton'), stand: $('#standButton'), double: $('#doubleButton'), draw: $('#drawButton'), actions: $('#actions'),
    blackjackTab: $('#blackjackTab'), pokerTab: $('#pokerTab'), table: $('.table-console'), toast: $('#toast'), effects: $('#effects'),
    music: $('#musicToggle'), sound: $('#soundToggle'), recharge: $('#rechargeButton'), rulesToggle: $('#rulesToggle'),
    rulesPanel: $('.rules-panel'), rulesTitle: $('#rulesTitle'), rulesText: $('#rulesText'), dealerName: $('#dealerName')
  };

  const walletKey = 'danpcCosmoCredits';
  const audioKey = 'danpcCosmoCasinoAudio';
  const suits = [
    { id: 'spades', symbol: '♠', red: false },
    { id: 'hearts', symbol: '♥', red: true },
    { id: 'diamonds', symbol: '♦', red: true },
    { id: 'clubs', symbol: '♣', red: false }
  ];
  const rankNames = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
  const handNames = ['HIGH CARD', 'ONE PAIR', 'TWO PAIR', 'THREE OF A KIND', 'STRAIGHT', 'FLUSH', 'FULL HOUSE', 'FOUR OF A KIND', 'STRAIGHT FLUSH'];

  let balance = Number.parseInt(localStorage.getItem(walletKey) || '1000', 10);
  if (!Number.isFinite(balance) || balance < 0) balance = 1000;
  let selectedBet = 25;
  let stake = 0;
  let game = 'blackjack';
  let phase = 'betting';
  let deck = [];
  let playerCards = [];
  let dealerCards = [];
  let heldCards = new Set();
  let toastTimer;

  const savedAudio = JSON.parse(localStorage.getItem(audioKey) || '{}');
  let musicOn = savedAudio.music !== false;
  let soundOn = savedAudio.sound !== false;
  let audioContext = null;
  let audioMaster = null;
  let audioCompressor = null;
  let soundBus = null;
  let musicBus = null;
  let musicTimer = null;
  let musicStep = 0;

  function saveAudio() {
    localStorage.setItem(audioKey, JSON.stringify({ music: musicOn, sound: soundOn }));
  }

  function ensureAudio() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioMaster = audioContext.createGain();
      audioMaster.gain.value = 1.2;
      audioCompressor = audioContext.createDynamicsCompressor();
      audioCompressor.threshold.value = -18;
      audioCompressor.knee.value = 22;
      audioCompressor.ratio.value = 6;
      audioCompressor.attack.value = .004;
      audioCompressor.release.value = .24;
      soundBus = audioContext.createGain();
      soundBus.gain.value = 2.55;
      musicBus = audioContext.createGain();
      musicBus.gain.value = 2.15;
      soundBus.connect(audioCompressor);
      musicBus.connect(audioCompressor);
      audioCompressor.connect(audioMaster);
      audioMaster.connect(audioContext.destination);
    }
    if (audioContext.state === 'suspended') audioContext.resume();
    if (musicOn && !musicTimer) startMusic();
  }

  function tone(frequency, duration = 0.12, type = 'sine', volume = 0.06, delay = 0) {
    if (!soundOn || !audioContext) return;
    const at = audioContext.currentTime + delay;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, at);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(volume, at + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    oscillator.connect(gain).connect(soundBus);
    oscillator.start(at);
    oscillator.stop(at + duration + 0.03);
  }

  function noiseBurst(duration = 0.08, volume = 0.025, frequency = 1200, filterType = 'bandpass', delay = 0) {
    if (!soundOn || !audioContext) return;
    const length = Math.max(1, Math.floor(audioContext.sampleRate * duration));
    const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / length);
    const source = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();
    const at = audioContext.currentTime + delay;
    source.buffer = buffer;
    filter.type = filterType;
    filter.frequency.value = frequency;
    filter.Q.value = 1.4;
    gain.gain.setValueAtTime(volume, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    source.connect(filter).connect(gain).connect(soundBus);
    source.start(at);
  }

  function gameSound(name) {
    if (!audioContext || !soundOn) return;
    if (name === 'chip') {
      noiseBurst(.045, .035, 2400, 'highpass');
      tone(740, .055, 'square', .028); tone(1110, .08, 'sine', .022, .045); tone(1480, .06, 'sine', .013, .085);
    }
    if (name === 'deal') {
      [0, .075, .15].forEach((delay, index) => {
        noiseBurst(.065, .022, 1300 + index * 230, 'bandpass', delay);
        tone(185 + index * 48, .065, 'triangle', .017, delay + .02);
      });
    }
    if (name === 'flip') {
      noiseBurst(.12, .03, 1850, 'bandpass');
      tone(330, .08, 'triangle', .025); tone(660, .1, 'sine', .02, .045); tone(990, .12, 'sine', .012, .09);
    }
    if (name === 'hold') { tone(520, .06, 'square', .022); tone(780, .1, 'sine', .018, .035); }
    if (name === 'win') {
      noiseBurst(.45, .018, 4200, 'highpass', .08);
      [523, 659, 784, 1047, 1319].forEach((note, index) => tone(note, .42, index % 2 ? 'triangle' : 'sine', .05, index * .095));
      [1568, 2093, 2637].forEach((note, index) => tone(note, .18, 'sine', .018, .48 + index * .09));
    }
    if (name === 'loss') {
      noiseBurst(.32, .035, 230, 'lowpass');
      [330, 277, 220, 165].forEach((note, index) => tone(note, .34, 'sawtooth', .025, index * .11));
    }
    if (name === 'push') { tone(440, .22, 'sine', .035); tone(554, .28, 'sine', .03, .08); tone(659, .24, 'triangle', .018, .16); }
    if (name === 'error') { noiseBurst(.12, .028, 180, 'lowpass'); tone(125, .22, 'square', .03); }
  }

  function scheduleMusic() {
    if (!audioContext || !musicOn) return;
    const roots = [110, 130.81, 98, 146.83];
    const root = roots[musicStep % roots.length];
    const at = audioContext.currentTime;
    [0.5, 1, 1.5, 2].forEach((ratio, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const filter = audioContext.createBiquadFilter();
      oscillator.type = index === 0 ? 'sine' : 'triangle';
      oscillator.frequency.value = root * ratio;
      filter.type = 'lowpass';
      filter.frequency.value = 720;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(index === 0 ? .015 : index === 1 ? .022 : .011, at + .35);
      gain.gain.exponentialRampToValueAtTime(.0001, at + 2.3);
      oscillator.connect(filter).connect(gain).connect(musicBus);
      oscillator.start(at);
      oscillator.stop(at + 2.4);
    });
    const sparkle = root * [4, 4.5, 5, 6][musicStep % 4];
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = sparkle;
    gain.gain.setValueAtTime(.0001, at + .65);
    gain.gain.exponentialRampToValueAtTime(.012, at + .68);
    gain.gain.exponentialRampToValueAtTime(.0001, at + 1.25);
    oscillator.connect(gain).connect(musicBus);
    oscillator.start(at + .65);
    oscillator.stop(at + 1.3);
    const reply = audioContext.createOscillator();
    const replyGain = audioContext.createGain();
    reply.type = 'triangle';
    reply.frequency.value = sparkle * .75;
    replyGain.gain.setValueAtTime(.0001, at + 1.28);
    replyGain.gain.exponentialRampToValueAtTime(.008, at + 1.31);
    replyGain.gain.exponentialRampToValueAtTime(.0001, at + 1.82);
    reply.connect(replyGain).connect(musicBus);
    reply.start(at + 1.28);
    reply.stop(at + 1.85);
    musicStep += 1;
  }

  function startMusic() {
    if (!musicOn || !audioContext || musicTimer) return;
    scheduleMusic();
    musicTimer = setInterval(scheduleMusic, 2300);
  }

  function stopMusic() {
    clearInterval(musicTimer);
    musicTimer = null;
  }

  function updateAudioButtons() {
    dom.music.classList.toggle('muted', !musicOn);
    dom.sound.classList.toggle('muted', !soundOn);
    dom.music.setAttribute('aria-pressed', String(musicOn));
    dom.sound.setAttribute('aria-pressed', String(soundOn));
  }

  function makeDeck() {
    const cards = [];
    suits.forEach((suit) => {
      for (let rank = 2; rank <= 14; rank += 1) cards.push({ suit, rank });
    });
    for (let i = cards.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
  }

  function drawCard() { return deck.pop(); }
  function rankLabel(rank) { return rankNames[rank] || String(rank); }

  function blackjackValue(cards) {
    let total = 0;
    let aces = 0;
    cards.forEach((card) => {
      if (card.rank === 14) { total += 11; aces += 1; }
      else total += Math.min(card.rank, 10);
    });
    while (total > 21 && aces > 0) { total -= 10; aces -= 1; }
    return { total, soft: aces > 0 };
  }

  function evaluatePoker(cards) {
    const values = cards.map((card) => card.rank).sort((a, b) => b - a);
    const counts = new Map();
    values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
    const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
    const flush = cards.every((card) => card.suit.id === cards[0].suit.id);
    const unique = [...new Set(values)];
    let straightHigh = 0;
    if (unique.length === 5 && unique[0] - unique[4] === 4) straightHigh = unique[0];
    if (unique.join(',') === '14,5,4,3,2') straightHigh = 5;
    let rank = 0;
    let tie = values;
    if (straightHigh && flush) { rank = 8; tie = [straightHigh]; }
    else if (groups[0][1] === 4) { rank = 7; tie = [groups[0][0], groups[1][0]]; }
    else if (groups[0][1] === 3 && groups[1][1] === 2) { rank = 6; tie = [groups[0][0], groups[1][0]]; }
    else if (flush) { rank = 5; }
    else if (straightHigh) { rank = 4; tie = [straightHigh]; }
    else if (groups[0][1] === 3) { rank = 3; tie = [groups[0][0], ...groups.slice(1).map((group) => group[0]).sort((a, b) => b - a)]; }
    else if (groups[0][1] === 2 && groups[1][1] === 2) { rank = 2; tie = [Math.max(groups[0][0], groups[1][0]), Math.min(groups[0][0], groups[1][0]), groups[2][0]]; }
    else if (groups[0][1] === 2) { rank = 1; tie = [groups[0][0], ...groups.slice(1).map((group) => group[0]).sort((a, b) => b - a)]; }
    return { rank, tie, name: handNames[rank] };
  }

  function comparePoker(player, dealer) {
    if (player.rank !== dealer.rank) return player.rank > dealer.rank ? 1 : -1;
    const length = Math.max(player.tie.length, dealer.tie.length);
    for (let index = 0; index < length; index += 1) {
      if ((player.tie[index] || 0) !== (dealer.tie[index] || 0)) return player.tie[index] > dealer.tie[index] ? 1 : -1;
    }
    return 0;
  }

  function dealerKeepMask(cards) {
    const result = evaluatePoker(cards);
    const counts = new Map();
    cards.forEach((card) => counts.set(card.rank, (counts.get(card.rank) || 0) + 1));
    if (result.rank >= 4) return new Set([0, 1, 2, 3, 4]);
    if (result.rank >= 1) {
      const usefulRanks = new Set([...counts.entries()].filter(([, count]) => count >= 2).map(([rank]) => rank));
      return new Set(cards.map((card, index) => usefulRanks.has(card.rank) ? index : -1).filter((index) => index >= 0));
    }
    const suitCounts = new Map();
    cards.forEach((card) => suitCounts.set(card.suit.id, (suitCounts.get(card.suit.id) || 0) + 1));
    const nearFlush = [...suitCounts.entries()].find(([, count]) => count === 4);
    if (nearFlush) return new Set(cards.map((card, index) => card.suit.id === nearFlush[0] ? index : -1).filter((index) => index >= 0));
    return new Set(cards.map((card, index) => card.rank >= 12 ? index : -1).filter((index) => index >= 0));
  }

  function cardElement(card, hidden, selectable, selected, index) {
    const element = document.createElement('div');
    element.className = `card${card.suit.red ? ' red' : ''}${hidden ? ' back' : ''}${selectable ? ' selectable' : ''}${selected ? ' selected' : ''}`;
    element.style.animationDelay = `${index * 70}ms`;
    element.style.setProperty('--deal-index', index);
    if (!hidden) {
      element.innerHTML = `<span class="card-rank">${rankLabel(card.rank)}<small>${card.suit.symbol}</small></span><span class="card-center">${card.suit.symbol}</span>`;
    }
    if (selectable) {
      element.setAttribute('role', 'button');
      element.setAttribute('tabindex', '0');
      element.setAttribute('aria-label', `${rankLabel(card.rank)} ${card.suit.id}, ${selected ? 'held' : 'tap to hold'}`);
      const toggle = () => toggleHeld(index);
      element.addEventListener('click', toggle);
      element.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(); } });
      if (selected) element.insertAdjacentHTML('beforeend', '<span class="hold-tag">HOLD</span>');
    }
    return element;
  }

  function renderHand(container, cards, options = {}) {
    container.innerHTML = '';
    if (!cards.length) {
      const count = game === 'poker' ? 5 : 2;
      for (let index = 0; index < count; index += 1) {
        const ghost = document.createElement('div');
        ghost.className = 'card ghost-card';
        ghost.innerHTML = `<span>${options.dealer ? '☄' : '?'}</span>`;
        container.appendChild(ghost);
      }
      return;
    }
    cards.forEach((card, index) => container.appendChild(cardElement(card, Boolean(options.hidden && (!options.revealFirst || index > 0)), Boolean(options.selectable), heldCards.has(index), index)));
  }

  function render() {
    const hideDealer = (game === 'blackjack' && phase === 'blackjackPlay') || (game === 'poker' && (phase === 'pokerHold' || phase === 'pokerDraw'));
    renderHand(dom.player, playerCards, { selectable: game === 'poker' && phase === 'pokerHold' });
    renderHand(dom.dealer, dealerCards, { dealer: true, hidden: hideDealer, revealFirst: game === 'blackjack' });
    dom.pot.textContent = `${stake} CC`;
    dom.balance.textContent = `${balance.toLocaleString('en-CA')} CC`;
    localStorage.setItem(walletKey, String(balance));
    dom.recharge.hidden = balance >= 10;

    [dom.deal, dom.hit, dom.stand, dom.double, dom.draw].forEach((button) => { button.hidden = true; button.disabled = false; });
    const ready = phase === 'betting' || phase === 'roundOver';
    dom.betConsole.hidden = !ready;
    document.querySelectorAll('.chip').forEach((button) => {
      button.classList.toggle('active', Number(button.dataset.bet) === selectedBet);
      button.disabled = !ready;
    });
    dom.blackjackTab.disabled = !ready;
    dom.pokerTab.disabled = !ready;
    if (ready) {
      dom.deal.hidden = false;
      dom.deal.textContent = `${phase === 'roundOver' ? 'NEW ROUND' : 'DEAL'} · ${selectedBet} CC`;
      dom.deal.disabled = balance < selectedBet;
    }
    if (phase === 'blackjackPlay') {
      dom.hit.hidden = dom.stand.hidden = dom.double.hidden = false;
      dom.double.disabled = playerCards.length !== 2 || balance < stake;
    }
    if (phase === 'pokerHold') dom.draw.hidden = false;
    if (phase === 'pokerDraw' || phase === 'dealerTurn') dom.actions.querySelectorAll('button').forEach((button) => { button.disabled = true; });
  }

  function setStatus(message, info) {
    dom.status.textContent = message;
    if (info !== undefined) dom.info.textContent = info;
    dom.status.classList.remove('signal-flash');
    void dom.status.offsetWidth;
    dom.status.classList.add('signal-flash');
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    dom.toast.textContent = message;
    dom.toast.classList.add('show');
    toastTimer = setTimeout(() => dom.toast.classList.remove('show'), 1900);
  }

  function walletBump() {
    dom.wallet.classList.remove('bump');
    void dom.wallet.offsetWidth;
    dom.wallet.classList.add('bump');
  }

  function flyCredit() {
    const rect = dom.wallet.getBoundingClientRect();
    const coin = document.createElement('span');
    coin.className = 'credit-fly';
    coin.textContent = 'CC';
    coin.style.left = `${rect.left + rect.width / 2}px`;
    coin.style.top = `${rect.top + rect.height / 2}px`;
    dom.effects.appendChild(coin);
    setTimeout(() => coin.remove(), 700);
  }

  function payoutOrbit(count = 7) {
    const tableRect = dom.table.getBoundingClientRect();
    for (let index = 0; index < count; index += 1) {
      const coin = document.createElement('span');
      coin.className = 'credit-fly payout-credit';
      coin.textContent = 'CC';
      coin.style.left = `${tableRect.left + tableRect.width * (.3 + Math.random() * .4)}px`;
      coin.style.top = `${tableRect.top + tableRect.height * (.34 + Math.random() * .22)}px`;
      coin.style.animationDelay = `${index * 55}ms`;
      dom.effects.appendChild(coin);
      setTimeout(() => coin.remove(), 1200 + index * 55);
    }
  }

  function sparks(win = true) {
    const colors = win ? ['#ffd967', '#c7ff68', '#6affef', '#ff5ccf'] : ['#ff607d', '#9b62ff'];
    for (let index = 0; index < (win ? 34 : 14); index += 1) {
      const spark = document.createElement('span');
      spark.className = 'spark';
      spark.style.left = `${48 + Math.random() * 4}%`;
      spark.style.top = `${45 + Math.random() * 8}%`;
      spark.style.background = colors[index % colors.length];
      spark.style.color = colors[index % colors.length];
      spark.style.setProperty('--dx', `${(Math.random() - .5) * 480}px`);
      spark.style.setProperty('--dy', `${(Math.random() - .72) * 390}px`);
      dom.effects.appendChild(spark);
      setTimeout(() => spark.remove(), 1100);
    }
  }

  function pulseTable(outcome) {
    dom.table.classList.remove('win', 'loss');
    void dom.table.offsetWidth;
    if (outcome === 'win') dom.table.classList.add('win');
    if (outcome === 'loss') dom.table.classList.add('loss');
    if (window.cosmoSceneEffects) window.cosmoSceneEffects.mood(outcome);
  }

  function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

  function beginRound() {
    ensureAudio();
    if (balance < selectedBet) {
      showToast('Not enough Cosmo Credits. Emergency credits are ready.');
      gameSound('error');
      dom.recharge.hidden = false;
      return;
    }
    balance -= selectedBet;
    stake = selectedBet;
    deck = makeDeck();
    playerCards = [];
    dealerCards = [];
    heldCards.clear();
    phase = game === 'blackjack' ? 'blackjackPlay' : 'pokerHold';
    flyCredit();
    walletBump();
    gameSound('chip');
    if (window.cosmoSceneEffects) window.cosmoSceneEffects.mood('deal');
    if (game === 'blackjack') {
      playerCards = [drawCard(), drawCard()];
      dealerCards = [drawCard(), drawCard()];
      const value = blackjackValue(playerCards).total;
      setStatus('Cards locked into orbit.', `Your hand: ${value} · Dealer shows ${blackjackValue([dealerCards[0]]).total}`);
      render();
      gameSound('deal');
      const playerNatural = value === 21;
      const dealerNatural = blackjackValue(dealerCards).total === 21;
      if (playerNatural || dealerNatural) setTimeout(() => settleNaturals(playerNatural, dealerNatural), 650);
    } else {
      playerCards = Array.from({ length: 5 }, drawCard);
      dealerCards = Array.from({ length: 5 }, drawCard);
      const hand = evaluatePoker(playerCards);
      setStatus('Tap the cards you want to HOLD.', `${hand.name} · Unheld cards will be replaced once`);
      render();
      gameSound('deal');
    }
  }

  function settleNaturals(playerNatural, dealerNatural) {
    if (playerNatural && dealerNatural) finishRound('Two blackjacks. The orbit is even.', 'push', stake);
    else if (playerNatural) finishRound('BLACKJACK! A perfect cosmic alignment.', 'win', Math.floor(stake * 2.5));
    else finishRound('ZYL-7 reveals Blackjack.', 'loss', 0);
  }

  function finishRound(message, outcome, payout) {
    if (payout > 0) {
      balance += payout;
      walletBump();
    }
    phase = 'roundOver';
    setStatus(message, outcome === 'win' ? `Payout received: ${payout} CC` : outcome === 'push' ? `${payout} CC returned` : 'The house keeps this orbit.');
    dom.dealerName.textContent = outcome === 'win' ? 'ZYL-7 · IMPRESSED' : outcome === 'loss' ? 'ZYL-7 · HOUSE SIGNAL STRONG' : 'ZYL-7 · ORBITAL TIE';
    gameSound(outcome);
    pulseTable(outcome);
    if (outcome === 'win') { sparks(true); payoutOrbit(); }
    if (outcome === 'loss') sparks(false);
    render();
  }

  function hit() {
    ensureAudio();
    if (phase !== 'blackjackPlay') return;
    playerCards.push(drawCard());
    gameSound('deal');
    const value = blackjackValue(playerCards).total;
    setStatus(value > 21 ? 'Your orbit broke past 21.' : 'One more card enters orbit.', `Your hand: ${value}`);
    render();
    if (value > 21) finishRound(`BUST at ${value}. ZYL-7 collects the wager.`, 'loss', 0);
    else if (value === 21) dealerTurn();
  }

  async function dealerTurn() {
    if (phase !== 'blackjackPlay') return;
    phase = 'dealerTurn';
    setStatus('ZYL-7 calculates the house orbit…', `Your hand: ${blackjackValue(playerCards).total}`);
    render();
    gameSound('flip');
    await delay(500);
    while (blackjackValue(dealerCards).total < 17) {
      dealerCards.push(drawCard());
      gameSound('deal');
      render();
      await delay(520);
    }
    const playerValue = blackjackValue(playerCards).total;
    const dealerValue = blackjackValue(dealerCards).total;
    if (dealerValue > 21) finishRound(`Dealer busts at ${dealerValue}. You win!`, 'win', stake * 2);
    else if (playerValue > dealerValue) finishRound(`${playerValue} beats ${dealerValue}. Cosmo Credits transferred!`, 'win', stake * 2);
    else if (playerValue < dealerValue) finishRound(`ZYL-7 wins ${dealerValue} to ${playerValue}.`, 'loss', 0);
    else finishRound(`Push at ${playerValue}. Your credits return.`, 'push', stake);
  }

  function doubleDown() {
    ensureAudio();
    if (phase !== 'blackjackPlay' || playerCards.length !== 2 || balance < stake) return;
    balance -= stake;
    stake *= 2;
    flyCredit();
    gameSound('chip');
    playerCards.push(drawCard());
    render();
    const value = blackjackValue(playerCards).total;
    if (value > 21) finishRound(`Double orbit bust at ${value}.`, 'loss', 0);
    else dealerTurn();
  }

  function toggleHeld(index) {
    if (phase !== 'pokerHold') return;
    ensureAudio();
    if (heldCards.has(index)) heldCards.delete(index); else heldCards.add(index);
    gameSound('hold');
    const held = heldCards.size;
    setStatus(`${held} card${held === 1 ? '' : 's'} held.`, `${evaluatePoker(playerCards).name} · ${5 - held} will be replaced`);
    render();
  }

  async function drawPoker() {
    if (phase !== 'pokerHold') return;
    ensureAudio();
    phase = 'pokerDraw';
    setStatus('New cards entering the gravity well…', 'ZYL-7 is drawing too');
    render();
    const dealerHeld = dealerKeepMask(dealerCards);
    for (let index = 0; index < 5; index += 1) {
      if (!heldCards.has(index)) playerCards[index] = drawCard();
      if (!dealerHeld.has(index)) dealerCards[index] = drawCard();
      gameSound('deal');
      render();
      await delay(145);
    }
    await delay(450);
    phase = 'showdown';
    gameSound('flip');
    render();
    const playerResult = evaluatePoker(playerCards);
    const dealerResult = evaluatePoker(dealerCards);
    const comparison = comparePoker(playerResult, dealerResult);
    if (comparison > 0) finishRound(`${playerResult.name} defeats ${dealerResult.name}!`, 'win', stake * 2);
    else if (comparison < 0) finishRound(`ZYL-7's ${dealerResult.name} beats your ${playerResult.name}.`, 'loss', 0);
    else finishRound(`Both show ${playerResult.name}. Wager returned.`, 'push', stake);
  }

  function setGame(nextGame) {
    if (!['betting', 'roundOver'].includes(phase)) { showToast('Finish this hand before changing tables.'); return; }
    game = nextGame;
    phase = 'betting';
    stake = 0;
    playerCards = [];
    dealerCards = [];
    heldCards.clear();
    const poker = game === 'poker';
    dom.blackjackTab.classList.toggle('active', !poker);
    dom.pokerTab.classList.toggle('active', poker);
    dom.label.textContent = poker ? 'ALIEN DRAW POKER TABLE' : 'BLACKJACK TABLE';
    dom.dealerName.textContent = 'ZYL-7 · YOUR DEALER';
    dom.rulesTitle.textContent = poker ? '5-CARD DRAW POKER' : 'BLACKJACK';
    dom.rulesText.textContent = poker
      ? 'Build the strongest five-card hand. Tap cards to hold them, draw once, then compare your hand with ZYL-7.'
      : 'Reach 21 without going over. Number cards use their value, face cards are 10, and an Ace is 1 or 11.';
    setStatus(poker ? 'Choose a wager for the next showdown.' : 'Choose a wager to enter the orbit.', poker ? 'One draw · Best five-card hand wins' : 'Dealer stands on 17 · Blackjack pays 3:2');
    gameSound('flip');
    render();
  }

  document.querySelectorAll('.chip').forEach((button) => button.addEventListener('click', () => {
    if (!['betting', 'roundOver'].includes(phase)) return;
    ensureAudio();
    selectedBet = Number(button.dataset.bet);
    gameSound('chip');
    render();
  }));
  dom.deal.addEventListener('click', beginRound);
  dom.hit.addEventListener('click', hit);
  dom.stand.addEventListener('click', dealerTurn);
  dom.double.addEventListener('click', doubleDown);
  dom.draw.addEventListener('click', drawPoker);
  dom.blackjackTab.addEventListener('click', () => setGame('blackjack'));
  dom.pokerTab.addEventListener('click', () => setGame('poker'));
  dom.rulesToggle.addEventListener('click', () => {
    const open = dom.rulesPanel.classList.toggle('open');
    dom.rulesToggle.setAttribute('aria-expanded', String(open));
  });
  dom.recharge.addEventListener('click', () => {
    ensureAudio();
    balance += 500;
    gameSound('win');
    walletBump();
    showToast('500 emergency Cosmo Credits received.');
    render();
  });
  dom.music.addEventListener('click', () => {
    ensureAudio();
    musicOn = !musicOn;
    if (musicOn) startMusic(); else stopMusic();
    saveAudio();
    updateAudioButtons();
  });
  dom.sound.addEventListener('click', () => {
    ensureAudio();
    soundOn = !soundOn;
    saveAudio();
    updateAudioButtons();
    if (soundOn) gameSound('chip');
  });
  window.addEventListener('pointerdown', () => { ensureAudio(); }, { once: true });

  updateAudioButtons();
  setGame('blackjack');
})();
