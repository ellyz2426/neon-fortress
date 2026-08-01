import {
  createSystem,
  PanelUI,
  PanelDocument,
  UIKitDocument,
  UIKit,
  eq,
  World,
  InputComponent,
  Mesh,
  Group,
  BoxGeometry,
  SphereGeometry,
  CylinderGeometry,
  ConeGeometry,
  PlaneGeometry,
  MeshStandardMaterial,
  MeshBasicMaterial,
  LineBasicMaterial,
  Color,
  Vector3,
  EdgesGeometry,
  LineSegments,
  AdditiveBlending,
  AmbientLight,
  DirectionalLight,
  PointLight,
  FogExp2,
  Float32BufferAttribute,
  BufferGeometry,
} from '@iwsdk/core';

// ───── Audio Engine ─────
class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxVol = 0.5;
  private musicVol = 0.3;
  private musicOscs: OscillatorNode[] = [];
  private musicGains: GainNode[] = [];
  private musicPlaying = false;

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  setSfxVolume(v: number) { this.sfxVol = v; }
  setMusicVolume(v: number) {
    this.musicVol = v;
    this.musicGains.forEach(g => { if (g) g.gain.value = v * 0.15; });
  }

  play(type: string) {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const g = ctx.createGain();
    g.connect(this.masterGain!);
    g.gain.value = this.sfxVol;

    if (type === 'shoot') {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(880, now);
      o.frequency.exponentialRampToValueAtTime(220, now + 0.1);
      o.connect(g);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      o.start(now);
      o.stop(now + 0.12);
    } else if (type === 'hit') {
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.setValueAtTime(200, now);
      o.frequency.exponentialRampToValueAtTime(60, now + 0.2);
      o.connect(g);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      o.start(now);
      o.stop(now + 0.25);
    } else if (type === 'explode') {
      const bufSize = ctx.sampleRate * 0.3;
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(g);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      src.start(now);
    } else if (type === 'powerup') {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(440, now);
      o.frequency.exponentialRampToValueAtTime(1760, now + 0.2);
      o.connect(g);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      o.start(now);
      o.stop(now + 0.25);
    } else if (type === 'death') {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(400, now);
      o.frequency.exponentialRampToValueAtTime(40, now + 0.8);
      o.connect(g);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.9);
      o.start(now);
      o.stop(now + 0.9);
    } else if (type === 'fuel') {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(600, now);
      o.frequency.linearRampToValueAtTime(900, now + 0.15);
      o.connect(g);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      o.start(now);
      o.stop(now + 0.2);
    } else if (type === 'turret') {
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.setValueAtTime(150, now);
      o.frequency.exponentialRampToValueAtTime(80, now + 0.15);
      o.connect(g);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      o.start(now);
      o.stop(now + 0.18);
    } else if (type === 'alert') {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(1200, now);
      o.frequency.setValueAtTime(800, now + 0.1);
      o.frequency.setValueAtTime(1200, now + 0.2);
      o.connect(g);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      o.start(now);
      o.stop(now + 0.3);
    } else if (type === 'boss') {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(100, now);
      o.frequency.linearRampToValueAtTime(300, now + 0.3);
      o.frequency.linearRampToValueAtTime(100, now + 0.6);
      o.connect(g);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
      o.start(now);
      o.stop(now + 0.7);
    } else if (type === 'click') {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = 1000;
      o.connect(g);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      o.start(now);
      o.stop(now + 0.05);
    }
  }

  startMusic() {
    if (this.musicPlaying) return;
    const ctx = this.getCtx();
    this.musicPlaying = true;
    const notes = [110, 130.81, 146.83, 164.81, 130.81, 146.83, 110, 98];
    const types: OscillatorType[] = ['triangle', 'sine', 'sawtooth'];
    types.forEach((t, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = t;
      o.frequency.value = notes[0] * (i === 2 ? 2 : 1);
      g.gain.value = this.musicVol * 0.15;
      o.connect(g);
      g.connect(this.masterGain!);
      o.start();
      this.musicOscs.push(o);
      this.musicGains.push(g);
    });
    this.musicBeat(notes, 0);
  }

  private musicBeat(notes: number[], idx: number) {
    if (!this.musicPlaying) return;
    const note = notes[idx % notes.length];
    this.musicOscs.forEach((o, i) => {
      o.frequency.setTargetAtTime(note * (i === 2 ? 2 : 1), this.ctx!.currentTime, 0.05);
    });
    setTimeout(() => this.musicBeat(notes, idx + 1), 400);
  }

  stopMusic() {
    this.musicPlaying = false;
    this.musicOscs.forEach(o => { try { o.stop(); } catch {} });
    this.musicOscs = [];
    this.musicGains = [];
  }
}

const audio = new AudioEngine();

// ───── Game State ─────
type GameMode = 'arcade' | 'speed' | 'zen' | 'challenge';
type Difficulty = 'normal' | 'hard' | 'insane';
type ColorScheme = 'cyan' | 'green' | 'magenta' | 'gold';
type GameScreen = 'menu' | 'playing' | 'paused' | 'results' | 'settings' | 'stats' | 'tutorial';

const COLORS: Record<ColorScheme, { primary: number; secondary: number; accent: number; text: string }> = {
  cyan:    { primary: 0x00ffff, secondary: 0x0088aa, accent: 0xff4444, text: '#00ffff' },
  green:   { primary: 0x00ff88, secondary: 0x008844, accent: 0xff8800, text: '#00ff88' },
  magenta: { primary: 0xff44ff, secondary: 0x882288, accent: 0xffff00, text: '#ff44ff' },
  gold:    { primary: 0xffcc00, secondary: 0x886600, accent: 0x44aaff, text: '#ffcc00' },
};

interface Bullet { mesh: Mesh; vx: number; vy: number; vz: number; life: number; isEnemy?: boolean; }
interface Wall { group: Group; z: number; height: number; lane: number; }
interface FuelTank { mesh: Group; z: number; lane: number; alive: boolean; }
interface Turret { group: Group; z: number; lane: number; alive: boolean; cooldown: number; hp: number; }
interface EnemyFighter { group: Group; z: number; x: number; y: number; alive: boolean; cooldown: number; hp: number; vx: number; }
interface PowerUp { mesh: Group; z: number; lane: number; type: 'shield' | 'rapid' | 'fuel' | 'spread' | 'magnet'; alive: boolean; }
interface Particle { mesh: Mesh; vx: number; vy: number; vz: number; life: number; maxLife: number; }
interface BossShip { group: Group; z: number; x: number; y: number; alive: boolean; hp: number; maxHp: number; cooldown: number; phase: number; }

interface GameState {
  screen: GameScreen;
  mode: GameMode;
  difficulty: Difficulty;
  colorScheme: ColorScheme;
  score: number;
  highScore: number;
  lives: number;
  fuel: number;
  maxFuel: number;
  altitude: number;
  targetAltitude: number;
  scrollSpeed: number;
  baseSpeed: number;
  scrollZ: number;
  level: number;
  fortressSection: boolean;
  sectionTimer: number;
  combo: number;
  comboTimer: number;
  maxCombo: number;
  shieldTimer: number;
  rapidTimer: number;
  spreadShot: boolean;
  spreadTimer: number;
  shootCooldown: number;
  invincibleTimer: number;
  totalKills: number;
  totalFuelCollected: number;
  totalShotsHired: number;
  totalPowerups: number;
  totalWallsDodged: number;
  bossesDefeated: number;
  gamesPlayed: number;
  bestCombo: number;
  totalDistance: number;
  speedTimer: number;
  challengeMoves: number;
}

const state: GameState = {
  screen: 'menu',
  mode: 'arcade',
  difficulty: 'normal',
  colorScheme: 'cyan',
  score: 0,
  highScore: 0,
  lives: 3,
  fuel: 100,
  maxFuel: 100,
  altitude: 1.5,
  targetAltitude: 1.5,
  scrollSpeed: 6,
  baseSpeed: 6,
  scrollZ: 0,
  level: 1,
  fortressSection: true,
  sectionTimer: 0,
  combo: 0,
  comboTimer: 0,
  maxCombo: 0,
  shieldTimer: 0,
  rapidTimer: 0,
  spreadShot: false,
  spreadTimer: 0,
  shootCooldown: 0,
  invincibleTimer: 0,
  totalKills: 0,
  totalFuelCollected: 0,
  totalShotsHired: 0,
  totalPowerups: 0,
  totalWallsDodged: 0,
  bossesDefeated: 0,
  gamesPlayed: 0,
  bestCombo: 0,
  totalDistance: 0,
  speedTimer: 120,
  challengeMoves: 300,
};

// ───── Scene Objects ─────
let world: World;
let playerGroup: Group;
let playerShadow: Mesh;
let altitudeIndicator: Group;
const bullets: Bullet[] = [];
const walls: Wall[] = [];
const fuelTanks: FuelTank[] = [];
const turrets: Turret[] = [];
const enemies: EnemyFighter[] = [];
const powerUps: PowerUp[] = [];
const particles: Particle[] = [];
let boss: BossShip | null = null;
let spawnTimer = 0;
let playerX = 0;
let cameraGroup: Group;
const gridLines: LineSegments[] = [];
const ambientOrbs: Mesh[] = [];
const starField: Mesh[] = [];
const pillars: Mesh[] = [];

// Fortress structures
const fortressWalls: Group[] = [];
let fortressSpawnZ = -20;

function getColor() { return COLORS[state.colorScheme]; }
function getLives(): number {
  if (state.mode === 'zen') return 99;
  return state.difficulty === 'normal' ? 3 : state.difficulty === 'hard' ? 2 : 1;
}
function getDiffMult(): number {
  return state.difficulty === 'normal' ? 1 : state.difficulty === 'hard' ? 1.5 : 2;
}

// ───── Create Meshes ─────
function createPlayerShip(): Group {
  const c = getColor();
  const g = new Group();
  // Fuselage
  const bodyGeo = new BoxGeometry(0.6, 0.15, 1.2);
  const bodyMat = new MeshStandardMaterial({ color: c.primary, emissive: new Color(c.primary), emissiveIntensity: 0.4, metalness: 0.8, roughness: 0.2 });
  const body = new Mesh(bodyGeo, bodyMat);
  g.add(body);
  // Wings
  const wingGeo = new BoxGeometry(1.8, 0.05, 0.5);
  const wingMat = new MeshStandardMaterial({ color: c.secondary, emissive: new Color(c.secondary), emissiveIntensity: 0.3, metalness: 0.7, roughness: 0.3 });
  const wing = new Mesh(wingGeo, wingMat);
  wing.position.set(0, 0, 0.1);
  g.add(wing);
  // Cockpit
  const cockGeo = new SphereGeometry(0.15, 8, 6);
  const cockMat = new MeshStandardMaterial({ color: 0xffffff, emissive: new Color(0xffffff), emissiveIntensity: 0.6, metalness: 0.9, roughness: 0.1 });
  const cock = new Mesh(cockGeo, cockMat);
  cock.position.set(0, 0.1, -0.2);
  g.add(cock);
  // Engines
  [-0.5, 0.5].forEach(x => {
    const engGeo = new CylinderGeometry(0.08, 0.06, 0.4, 6);
    const engMat = new MeshStandardMaterial({ color: c.accent, emissive: new Color(c.accent), emissiveIntensity: 0.8 });
    const eng = new Mesh(engGeo, engMat);
    eng.position.set(x, -0.02, 0.5);
    eng.rotation.x = Math.PI / 2;
    g.add(eng);
  });
  // Wireframe overlay
  const wireGeo = new EdgesGeometry(bodyGeo);
  const wireMat = new LineBasicMaterial({ color: c.primary, transparent: true, opacity: 0.6 });
  const wire = new LineSegments(wireGeo, wireMat);
  g.add(wire);
  return g;
}

function createShadow(): Mesh {
  const geo = new PlaneGeometry(1.2, 0.8);
  const mat = new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4 });
  const m = new Mesh(geo, mat);
  m.rotation.x = -Math.PI / 2;
  return m;
}

function createAltitudeIndicator(): Group {
  const g = new Group();
  const poleGeo = new CylinderGeometry(0.01, 0.01, 4, 4);
  const poleMat = new LineBasicMaterial({ color: getColor().primary, transparent: true, opacity: 0.3 });
  const pole = new Mesh(new BoxGeometry(0.02, 4, 0.02), new MeshBasicMaterial({ color: getColor().primary, transparent: true, opacity: 0.2 }));
  pole.position.y = 2;
  g.add(pole);
  // Tick marks at each height level
  for (let h = 0.5; h <= 3.5; h += 0.5) {
    const tickGeo = new BoxGeometry(0.15, 0.02, 0.02);
    const tick = new Mesh(tickGeo, new MeshBasicMaterial({ color: getColor().primary, transparent: true, opacity: 0.3 }));
    tick.position.y = h;
    g.add(tick);
  }
  return g;
}

function createWall(lane: number, height: number, width: number): Group {
  const c = getColor();
  const g = new Group();
  const geo = new BoxGeometry(width, height, 0.4);
  const mat = new MeshStandardMaterial({ color: c.secondary, emissive: new Color(c.secondary), emissiveIntensity: 0.2, transparent: true, opacity: 0.7, metalness: 0.6, roughness: 0.4 });
  const m = new Mesh(geo, mat);
  m.position.y = height / 2;
  g.add(m);
  // Wireframe
  const wireGeo = new EdgesGeometry(geo);
  const wireMat = new LineBasicMaterial({ color: c.primary, transparent: true, opacity: 0.8 });
  const wire = new LineSegments(wireGeo, wireMat);
  wire.position.y = height / 2;
  g.add(wire);
  // Danger stripe on top
  const stripeGeo = new BoxGeometry(width, 0.05, 0.42);
  const stripeMat = new MeshBasicMaterial({ color: c.accent, transparent: true, opacity: 0.8 });
  const stripe = new Mesh(stripeGeo, stripeMat);
  stripe.position.y = height;
  g.add(stripe);
  g.position.x = lane * 2.5;
  return g;
}

function createFuelTank(lane: number): Group {
  const g = new Group();
  const tankGeo = new CylinderGeometry(0.25, 0.25, 0.6, 8);
  const tankMat = new MeshStandardMaterial({ color: 0xff8800, emissive: new Color(0xff8800), emissiveIntensity: 0.5 });
  const tank = new Mesh(tankGeo, tankMat);
  tank.position.y = 0.4;
  g.add(tank);
  // Label ring
  const ringGeo = new CylinderGeometry(0.3, 0.3, 0.05, 8);
  const ringMat = new MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.6 });
  const ring = new Mesh(ringGeo, ringMat);
  ring.position.y = 0.4;
  g.add(ring);
  // Base
  const baseGeo = new BoxGeometry(0.5, 0.1, 0.5);
  const baseMat = new MeshStandardMaterial({ color: 0x444444, metalness: 0.8, roughness: 0.3 });
  const base = new Mesh(baseGeo, baseMat);
  base.position.y = 0.05;
  g.add(base);
  g.position.x = lane * 2.5;
  return g;
}

function createTurret(lane: number): Group {
  const c = getColor();
  const g = new Group();
  // Base
  const baseGeo = new CylinderGeometry(0.3, 0.35, 0.3, 6);
  const baseMat = new MeshStandardMaterial({ color: c.accent, emissive: new Color(c.accent), emissiveIntensity: 0.3, metalness: 0.7, roughness: 0.3 });
  const base = new Mesh(baseGeo, baseMat);
  base.position.y = 0.15;
  g.add(base);
  // Gun barrel
  const barrelGeo = new CylinderGeometry(0.06, 0.06, 0.6, 6);
  const barrelMat = new MeshStandardMaterial({ color: 0xdddddd, metalness: 0.9, roughness: 0.1 });
  const barrel = new Mesh(barrelGeo, barrelMat);
  barrel.position.set(0, 0.3, -0.3);
  barrel.rotation.x = Math.PI / 2;
  g.add(barrel);
  // Dome
  const domeGeo = new SphereGeometry(0.2, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  const domeMat = new MeshStandardMaterial({ color: c.primary, emissive: new Color(c.primary), emissiveIntensity: 0.4 });
  const dome = new Mesh(domeGeo, domeMat);
  dome.position.y = 0.3;
  g.add(dome);
  g.position.x = lane * 2.5;
  return g;
}

function createEnemyFighter(): Group {
  const g = new Group();
  // Body
  const bodyGeo = new ConeGeometry(0.3, 0.8, 6);
  const bodyMat = new MeshStandardMaterial({ color: 0xff2200, emissive: new Color(0xff2200), emissiveIntensity: 0.5 });
  const body = new Mesh(bodyGeo, bodyMat);
  body.rotation.x = Math.PI / 2;
  g.add(body);
  // Wings
  const wingGeo = new BoxGeometry(1.2, 0.04, 0.3);
  const wingMat = new MeshStandardMaterial({ color: 0xcc1100, emissive: new Color(0xcc1100), emissiveIntensity: 0.3 });
  const wing = new Mesh(wingGeo, wingMat);
  g.add(wing);
  // Engine glow
  const engGeo = new SphereGeometry(0.1, 6, 4);
  const engMat = new MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.8 });
  const eng = new Mesh(engGeo, engMat);
  eng.position.z = 0.4;
  g.add(eng);
  return g;
}

function createBossShip(): Group {
  const c = getColor();
  const g = new Group();
  // Main hull
  const hullGeo = new BoxGeometry(3, 0.6, 2);
  const hullMat = new MeshStandardMaterial({ color: 0x880000, emissive: new Color(0xff0000), emissiveIntensity: 0.3, metalness: 0.8, roughness: 0.2 });
  const hull = new Mesh(hullGeo, hullMat);
  g.add(hull);
  // Wireframe
  const wireGeo = new EdgesGeometry(hullGeo);
  const wireMat = new LineBasicMaterial({ color: 0xff4444 });
  g.add(new LineSegments(wireGeo, wireMat));
  // Turrets on boss
  [-1, 0, 1].forEach(x => {
    const tGeo = new SphereGeometry(0.2, 6, 4);
    const tMat = new MeshStandardMaterial({ color: c.accent, emissive: new Color(c.accent), emissiveIntensity: 0.6 });
    const t = new Mesh(tGeo, tMat);
    t.position.set(x, 0.4, 0);
    g.add(t);
  });
  // Engines
  [-1.2, 1.2].forEach(x => {
    const eGeo = new CylinderGeometry(0.2, 0.15, 0.5, 6);
    const eMat = new MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.7 });
    const e = new Mesh(eGeo, eMat);
    e.position.set(x, 0, 1);
    e.rotation.x = Math.PI / 2;
    g.add(e);
  });
  return g;
}

function createPowerUpMesh(type: string): Group {
  const g = new Group();
  let color = 0x00ffff;
  if (type === 'shield') color = 0x4488ff;
  else if (type === 'rapid') color = 0xff4444;
  else if (type === 'fuel') color = 0xff8800;
  else if (type === 'spread') color = 0xffff00;
  else if (type === 'magnet') color = 0xff44ff;
  const geo = new SphereGeometry(0.2, 8, 6);
  const mat = new MeshStandardMaterial({ color, emissive: new Color(color), emissiveIntensity: 0.6 });
  const sphere = new Mesh(geo, mat);
  g.add(sphere);
  // Ring
  const ringGeo = new CylinderGeometry(0.3, 0.3, 0.03, 12);
  const ringMat = new MeshBasicMaterial({ color, transparent: true, opacity: 0.5 });
  const ring = new Mesh(ringGeo, ringMat);
  g.add(ring);
  return g;
}

function createBullet(color: number, isEnemy = false): Mesh {
  const geo = isEnemy ? new SphereGeometry(0.06, 4, 3) : new BoxGeometry(0.04, 0.04, 0.3);
  const mat = new MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
  return new Mesh(geo, mat);
}

function spawnParticles(x: number, y: number, z: number, color: number, count: number) {
  for (let i = 0; i < count; i++) {
    const geo = new BoxGeometry(0.05, 0.05, 0.05);
    const mat = new MeshBasicMaterial({ color, transparent: true, opacity: 1 });
    const m = new Mesh(geo, mat);
    m.position.set(x, y, z);
    world.scene.add(m);
    const speed = 2 + Math.random() * 4;
    const angle = Math.random() * Math.PI * 2;
    const elev = (Math.random() - 0.5) * Math.PI;
    particles.push({
      mesh: m,
      vx: Math.cos(angle) * Math.cos(elev) * speed,
      vy: Math.sin(elev) * speed + 1,
      vz: Math.sin(angle) * Math.cos(elev) * speed,
      life: 0.5 + Math.random() * 0.5,
      maxLife: 1,
    });
  }
}

// ───── Environment ─────
function buildEnvironment(scene: any) {
  const c = getColor();
  // Dark skybox sphere (framework overrides scene.background)
  const skyGeo = new SphereGeometry(50, 16, 12);
  const skyMat = new MeshBasicMaterial({ color: 0x000811, side: 2 }); // BackSide = 2
  const sky = new Mesh(skyGeo, skyMat);
  scene.add(sky);
  // Ambient light
  const ambient = new AmbientLight(0x222233, 0.4);
  scene.add(ambient);
  // Directional light
  const dirLight = new DirectionalLight(0xffffff, 0.6);
  dirLight.position.set(5, 10, -5);
  scene.add(dirLight);
  // Point lights
  const p1 = new PointLight(c.primary, 1, 30);
  p1.position.set(0, 8, -10);
  scene.add(p1);
  // Fog
  scene.fog = new FogExp2(0x000811, 0.02);
  // Grid floor
  const gridSize = 80;
  const gridDiv = 40;
  const gridVerts: number[] = [];
  for (let i = 0; i <= gridDiv; i++) {
    const t = (i / gridDiv) * gridSize - gridSize / 2;
    gridVerts.push(-gridSize / 2, 0, t, gridSize / 2, 0, t);
    gridVerts.push(t, 0, -gridSize / 2, t, 0, gridSize / 2);
  }
  const gridGeo = new BufferGeometry();
  gridGeo.setAttribute('position', new Float32BufferAttribute(gridVerts, 3));
  const gridMat = new LineBasicMaterial({ color: c.primary, transparent: true, opacity: 0.1 });
  const grid = new LineSegments(gridGeo, gridMat);
  scene.add(grid);
  gridLines.push(grid);
  // Pillars
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const radius = 20;
    const pillarGeo = new CylinderGeometry(0.15, 0.15, 12, 6);
    const pillarMat = new MeshStandardMaterial({ color: c.secondary, emissive: new Color(c.secondary), emissiveIntensity: 0.15 });
    const pillar = new Mesh(pillarGeo, pillarMat);
    pillar.position.set(Math.cos(angle) * radius, 6, Math.sin(angle) * radius);
    scene.add(pillar);
    pillars.push(pillar);
    // Pillar cap
    const capGeo = new SphereGeometry(0.2, 6, 4);
    const capMat = new MeshBasicMaterial({ color: c.primary, transparent: true, opacity: 0.5 });
    const cap = new Mesh(capGeo, capMat);
    cap.position.set(Math.cos(angle) * radius, 12, Math.sin(angle) * radius);
    scene.add(cap);
  }
  // Stars
  for (let i = 0; i < 100; i++) {
    const sGeo = new SphereGeometry(0.03 + Math.random() * 0.04, 4, 3);
    const sMat = new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 + Math.random() * 0.5 });
    const s = new Mesh(sGeo, sMat);
    s.position.set((Math.random() - 0.5) * 60, 5 + Math.random() * 15, (Math.random() - 0.5) * 60);
    scene.add(s);
    starField.push(s);
  }
  // Ambient floating orbs
  for (let i = 0; i < 20; i++) {
    const oGeo = new SphereGeometry(0.06, 6, 4);
    const oMat = new MeshBasicMaterial({ color: c.primary, transparent: true, opacity: 0.3 });
    const orb = new Mesh(oGeo, oMat);
    orb.position.set((Math.random() - 0.5) * 30, 1 + Math.random() * 5, (Math.random() - 0.5) * 30);
    scene.add(orb);
    ambientOrbs.push(orb);
  }
}

// ───── Fortress Spawning ─────
function spawnFortressSection() {
  const c = getColor();
  const z = fortressSpawnZ;
  const lvl = state.level;
  // Side walls (fortress corridor)
  for (let row = 0; row < 8; row++) {
    const rowZ = z - row * 4;
    // Left wall
    const lw = createWall(-2, 1 + Math.random() * 2, 1.5);
    lw.position.z = rowZ;
    world.scene.add(lw);
    walls.push({ group: lw, z: rowZ, height: 1 + Math.random() * 2, lane: -2 });
    // Right wall
    const rw = createWall(2, 1 + Math.random() * 2, 1.5);
    rw.position.z = rowZ;
    world.scene.add(rw);
    walls.push({ group: rw, z: rowZ, height: 1 + Math.random() * 2, lane: 2 });

    // Cross walls (must fly over or through gap)
    if (Math.random() < 0.3 + lvl * 0.03) {
      const crossLane = Math.floor(Math.random() * 3) - 1;
      const crossH = 0.8 + Math.random() * 1.5;
      const cw = createWall(crossLane, crossH, 2);
      cw.position.z = rowZ - 2;
      world.scene.add(cw);
      walls.push({ group: cw, z: rowZ - 2, height: crossH, lane: crossLane });
    }
    // Fuel tanks
    if (Math.random() < 0.2) {
      const fl = Math.floor(Math.random() * 3) - 1;
      const ft = createFuelTank(fl);
      ft.position.z = rowZ - 1;
      world.scene.add(ft);
      fuelTanks.push({ mesh: ft, z: rowZ - 1, lane: fl, alive: true });
    }
    // Turrets
    if (Math.random() < 0.25 + lvl * 0.02) {
      const tl = Math.floor(Math.random() * 3) - 1;
      const turret = createTurret(tl);
      turret.position.z = rowZ - 1.5;
      world.scene.add(turret);
      turrets.push({ group: turret, z: rowZ - 1.5, lane: tl, alive: true, cooldown: 1 + Math.random() * 2, hp: 1 + Math.floor(lvl / 3) });
    }
    // Power-ups
    if (Math.random() < 0.12) {
      const pl = Math.floor(Math.random() * 3) - 1;
      const types: Array<'shield' | 'rapid' | 'fuel' | 'spread' | 'magnet'> = ['shield', 'rapid', 'fuel', 'spread', 'magnet'];
      const pt = types[Math.floor(Math.random() * types.length)];
      const pm = createPowerUpMesh(pt);
      pm.position.set(pl * 2.5, 1.5, rowZ - 3);
      world.scene.add(pm);
      powerUps.push({ mesh: pm, z: rowZ - 3, lane: pl, type: pt, alive: true });
    }
  }
  fortressSpawnZ -= 40;
}

function spawnOpenSection() {
  const z = fortressSpawnZ;
  const lvl = state.level;
  const count = 3 + Math.floor(lvl / 2);
  for (let i = 0; i < count; i++) {
    const eg = createEnemyFighter();
    const ex = (Math.random() - 0.5) * 8;
    const ey = 1 + Math.random() * 2.5;
    const ez = z - i * 6 - Math.random() * 4;
    eg.position.set(ex, ey, ez);
    world.scene.add(eg);
    enemies.push({ group: eg, z: ez, x: ex, y: ey, alive: true, cooldown: 2 + Math.random() * 3, hp: 1 + Math.floor(lvl / 4), vx: (Math.random() - 0.5) * 2 });
  }
  // Power-ups in open space
  if (Math.random() < 0.3) {
    const types: Array<'shield' | 'rapid' | 'fuel' | 'spread' | 'magnet'> = ['shield', 'rapid', 'fuel', 'spread', 'magnet'];
    const pt = types[Math.floor(Math.random() * types.length)];
    const pm = createPowerUpMesh(pt);
    pm.position.set((Math.random() - 0.5) * 4, 1.5, z - 15);
    world.scene.add(pm);
    powerUps.push({ mesh: pm, z: z - 15, lane: 0, type: pt, alive: true });
  }
  fortressSpawnZ -= 30;
}

function spawnBoss() {
  if (boss && boss.alive) return;
  const c = getColor();
  const bg = createBossShip();
  const bz = fortressSpawnZ - 15;
  bg.position.set(0, 2, bz);
  world.scene.add(bg);
  const hp = 10 + state.level * 5;
  boss = { group: bg, z: bz, x: 0, y: 2, alive: true, hp, maxHp: hp, cooldown: 2, phase: 0 };
  audio.play('boss');
  fortressSpawnZ -= 40;
}

// ───── Cleanup ─────
function cleanupBehind() {
  const limit = state.scrollZ + 15;
  // Walls
  for (let i = walls.length - 1; i >= 0; i--) {
    if (walls[i].z > limit) {
      world.scene.remove(walls[i].group);
      walls.splice(i, 1);
    }
  }
  // Fuel tanks
  for (let i = fuelTanks.length - 1; i >= 0; i--) {
    if (fuelTanks[i].z > limit) {
      world.scene.remove(fuelTanks[i].mesh);
      fuelTanks.splice(i, 1);
    }
  }
  // Turrets
  for (let i = turrets.length - 1; i >= 0; i--) {
    if (turrets[i].z > limit) {
      world.scene.remove(turrets[i].group);
      turrets.splice(i, 1);
    }
  }
  // Enemies
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (enemies[i].z > limit) {
      world.scene.remove(enemies[i].group);
      enemies.splice(i, 1);
    }
  }
  // Power-ups
  for (let i = powerUps.length - 1; i >= 0; i--) {
    if (powerUps[i].z > limit) {
      world.scene.remove(powerUps[i].mesh);
      powerUps.splice(i, 1);
    }
  }
}

// ───── Game Logic ─────
function resetGame() {
  state.score = 0;
  state.lives = getLives();
  state.fuel = state.maxFuel;
  state.altitude = 1.5;
  state.targetAltitude = 1.5;
  state.scrollZ = 0;
  state.scrollSpeed = state.baseSpeed;
  state.level = 1;
  state.fortressSection = true;
  state.sectionTimer = 0;
  state.combo = 0;
  state.comboTimer = 0;
  state.maxCombo = 0;
  state.shieldTimer = 0;
  state.rapidTimer = 0;
  state.spreadShot = false;
  state.spreadTimer = 0;
  state.shootCooldown = 0;
  state.invincibleTimer = 0;
  state.speedTimer = 120;
  state.challengeMoves = 300;
  playerX = 0;
  fortressSpawnZ = -20;
  // Clear all objects
  bullets.forEach(b => world.scene.remove(b.mesh));
  bullets.length = 0;
  walls.forEach(w => world.scene.remove(w.group));
  walls.length = 0;
  fuelTanks.forEach(f => world.scene.remove(f.mesh));
  fuelTanks.length = 0;
  turrets.forEach(t => world.scene.remove(t.group));
  turrets.length = 0;
  enemies.forEach(e => world.scene.remove(e.group));
  enemies.length = 0;
  powerUps.forEach(p => world.scene.remove(p.mesh));
  powerUps.length = 0;
  particles.forEach(p => world.scene.remove(p.mesh));
  particles.length = 0;
  if (boss) { world.scene.remove(boss.group); boss = null; }
  // Initial fortress
  spawnFortressSection();
  state.gamesPlayed++;
}

function addScore(pts: number) {
  const mult = Math.max(1, state.combo);
  state.score += pts * mult;
  if (state.score > state.highScore) state.highScore = state.score;
}

function addCombo() {
  state.combo++;
  state.comboTimer = 3;
  if (state.combo > state.maxCombo) state.maxCombo = state.combo;
  if (state.combo > state.bestCombo) state.bestCombo = state.combo;
}

function playerHit() {
  if (state.invincibleTimer > 0 || state.shieldTimer > 0) {
    state.shieldTimer = 0;
    audio.play('hit');
    return;
  }
  state.lives--;
  state.invincibleTimer = 2;
  audio.play('death');
  spawnParticles(playerGroup.position.x, playerGroup.position.y, playerGroup.position.z, getColor().accent, 20);
  if (state.lives <= 0) {
    state.screen = 'results';
    audio.stopMusic();
    saveStats();
  }
}

function shootBullet() {
  if (state.shootCooldown > 0) return;
  const c = getColor();
  const cooldown = state.rapidTimer > 0 ? 0.1 : 0.2;
  state.shootCooldown = cooldown;
  state.totalShotsHired++;
  audio.play('shoot');

  const spawnBullet = (offsetX: number, offsetAngle: number) => {
    const b = createBullet(c.primary);
    b.position.set(playerGroup.position.x + offsetX, playerGroup.position.y, playerGroup.position.z);
    world.scene.add(b);
    const speed = 25;
    bullets.push({ mesh: b, vx: Math.sin(offsetAngle) * speed, vy: 0, vz: -speed, life: 2 });
  };

  spawnBullet(0, 0);
  if (state.spreadShot) {
    spawnBullet(-0.3, -0.1);
    spawnBullet(0.3, 0.1);
  }
}

function saveStats() {
  try {
    const stored = localStorage.getItem('neon-fortress-stats');
    const stats = stored ? JSON.parse(stored) : {};
    stats.highScore = Math.max(stats.highScore || 0, state.highScore);
    stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
    stats.totalKills = (stats.totalKills || 0) + state.totalKills;
    stats.totalFuel = (stats.totalFuel || 0) + state.totalFuelCollected;
    stats.totalShots = (stats.totalShots || 0) + state.totalShotsHired;
    stats.totalPowerups = (stats.totalPowerups || 0) + state.totalPowerups;
    stats.bossesDefeated = (stats.bossesDefeated || 0) + state.bossesDefeated;
    stats.bestCombo = Math.max(stats.bestCombo || 0, state.bestCombo);
    stats.totalDistance = (stats.totalDistance || 0) + state.totalDistance;
    localStorage.setItem('neon-fortress-stats', JSON.stringify(stats));
    state.highScore = stats.highScore;
  } catch {}
}

function loadStats() {
  try {
    const stored = localStorage.getItem('neon-fortress-stats');
    if (stored) {
      const stats = JSON.parse(stored);
      state.highScore = stats.highScore || 0;
    }
  } catch {}
}

// ───── Main System ─────

export class GameSystem extends createSystem({
  menu: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/menu.json')] },
  hud: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/hud.json')] },
  pause: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/pause.json')] },
  results: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/results.json')] },
  settings: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/settings.json')] },
  stats: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/stats.json')] },
  tutorial: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/tutorial.json')] },
}) {
  private docs: Record<string, { entity: any; doc: UIKitDocument }> = {};
  private initialized = false;
  private time = 0;
  private keys: Record<string, boolean> = {};

  init() {
    world = this.world;
    loadStats();

    // Build environment
    buildEnvironment(world.scene);
    // Force dark background - remove any HDRI/environment
    world.scene.background = new Color(0x000811);
    world.scene.environment = null;

    // Player ship
    playerGroup = createPlayerShip();
    playerGroup.position.set(0, 1.5, 0);
    world.scene.add(playerGroup);

    // Shadow
    playerShadow = createShadow();
    world.scene.add(playerShadow);

    // Altitude indicator
    altitudeIndicator = createAltitudeIndicator();
    altitudeIndicator.position.set(-6, 0, 0);
    world.scene.add(altitudeIndicator);

    // Camera setup
    cameraGroup = new Group();
    world.scene.add(cameraGroup);

    // Set isometric-like camera — elevated and behind
    world.camera.position.set(0, 15, 12);
    world.camera.lookAt(0, 0, -8);

    // Keyboard input
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      if (e.key === 'Escape' || e.key === 'p') {
        if (state.screen === 'playing') { state.screen = 'paused'; audio.stopMusic(); }
        else if (state.screen === 'paused') { state.screen = 'playing'; audio.startMusic(); }
      }
    });
    window.addEventListener('keyup', (e) => { this.keys[e.key.toLowerCase()] = false; });

    // Create panels
    this.createPanels();
    this.bindQueries();
  }

  private createPanels() {
    const panelConfigs = [
      { config: './ui/menu.json', pos: [0, 2.5, -4] as [number, number, number] },
      { config: './ui/hud.json', pos: [0, 4, -3] as [number, number, number] },
      { config: './ui/pause.json', pos: [0, 2.5, -4] as [number, number, number] },
      { config: './ui/results.json', pos: [0, 2.5, -4] as [number, number, number] },
      { config: './ui/settings.json', pos: [0, 2.5, -4] as [number, number, number] },
      { config: './ui/stats.json', pos: [0, 2.5, -4] as [number, number, number] },
      { config: './ui/tutorial.json', pos: [0, 2.5, -4] as [number, number, number] },
    ];
    panelConfigs.forEach(({ config, pos }) => {
      const entity = world.createTransformEntity(new Group());
      entity.object3D!.position.set(pos[0], pos[1], pos[2]);
      entity.addComponent(PanelUI, { config });
    });
  }

  private bindQueries() {
    const bindPanel = (queryName: string, key: string) => {
      (this.queries as any)[queryName].subscribe('qualify', (entity: any) => {
        const doc = PanelDocument.data.document[entity.index] as UIKitDocument;
        if (!doc) return;
        this.docs[key] = { entity, doc };
        this.wirePanel(key, doc);
      });
    };
    bindPanel('menu', 'menu');
    bindPanel('hud', 'hud');
    bindPanel('pause', 'pause');
    bindPanel('results', 'results');
    bindPanel('settings', 'settings');
    bindPanel('stats', 'stats');
    bindPanel('tutorial', 'tutorial');
  }

  private wirePanel(key: string, doc: UIKitDocument) {
    const btn = (id: string, fn: () => void) => {
      const el = doc.getElementById(id) as UIKit.Text | undefined;
      el?.addEventListener('click', () => { audio.play('click'); fn(); });
    };

    if (key === 'menu') {
      btn('btn-play', () => { state.screen = 'playing'; resetGame(); audio.startMusic(); });
      btn('btn-mode-arcade', () => { state.mode = 'arcade'; this.updateMenuModes(); });
      btn('btn-mode-speed', () => { state.mode = 'speed'; this.updateMenuModes(); });
      btn('btn-mode-zen', () => { state.mode = 'zen'; this.updateMenuModes(); });
      btn('btn-mode-challenge', () => { state.mode = 'challenge'; this.updateMenuModes(); });
      btn('btn-diff-normal', () => { state.difficulty = 'normal'; this.updateMenuDiff(); });
      btn('btn-diff-hard', () => { state.difficulty = 'hard'; this.updateMenuDiff(); });
      btn('btn-diff-insane', () => { state.difficulty = 'insane'; this.updateMenuDiff(); });
      btn('btn-settings', () => { state.screen = 'settings'; });
      btn('btn-stats', () => { state.screen = 'stats'; });
      btn('btn-tutorial', () => { state.screen = 'tutorial'; });
    } else if (key === 'pause') {
      btn('btn-resume', () => { state.screen = 'playing'; audio.startMusic(); });
      btn('btn-quit', () => { state.screen = 'menu'; saveStats(); });
    } else if (key === 'results') {
      btn('btn-retry', () => { state.screen = 'playing'; resetGame(); audio.startMusic(); });
      btn('btn-menu', () => { state.screen = 'menu'; });
    } else if (key === 'settings') {
      btn('btn-color-cyan', () => { state.colorScheme = 'cyan'; });
      btn('btn-color-green', () => { state.colorScheme = 'green'; });
      btn('btn-color-magenta', () => { state.colorScheme = 'magenta'; });
      btn('btn-color-gold', () => { state.colorScheme = 'gold'; });
      btn('btn-settings-back', () => { state.screen = 'menu'; });
    } else if (key === 'stats') {
      btn('btn-stats-back', () => { state.screen = 'menu'; });
    } else if (key === 'tutorial') {
      btn('btn-tutorial-back', () => { state.screen = 'menu'; });
    }
    this.initialized = true;
  }

  private updateMenuModes() {
    const doc = this.docs['menu']?.doc;
    if (!doc) return;
    const modes: GameMode[] = ['arcade', 'speed', 'zen', 'challenge'];
    modes.forEach(m => {
      const el = doc.getElementById(`btn-mode-${m}`) as UIKit.Text | undefined;
      el?.setProperties({ backgroundColor: state.mode === m ? '#00aaaa' : '#333333' });
    });
  }

  private updateMenuDiff() {
    const doc = this.docs['menu']?.doc;
    if (!doc) return;
    const diffs: Difficulty[] = ['normal', 'hard', 'insane'];
    diffs.forEach(d => {
      const el = doc.getElementById(`btn-diff-${d}`) as UIKit.Text | undefined;
      el?.setProperties({ backgroundColor: state.difficulty === d ? '#00aaaa' : '#333333' });
    });
  }

  update(delta: number, time: number) {
    this.time = time;
    if (!this.initialized) return;

    // Panel visibility
    this.updatePanelVisibility();

    if (state.screen === 'playing') {
      this.updateGameplay(delta);
      this.updateHUD();
    }

    // Animate particles
    this.updateParticles(delta);
    // Animate ambient
    this.updateAmbient(time);
    // Camera follow
    this.updateCamera(delta);
  }

  private updatePanelVisibility() {
    const show = (key: string, visible: boolean) => {
      const d = this.docs[key];
      if (d) d.entity.object3D!.visible = visible;
    };
    show('menu', state.screen === 'menu');
    show('hud', state.screen === 'playing');
    show('pause', state.screen === 'paused');
    show('results', state.screen === 'results');
    show('settings', state.screen === 'settings');
    show('stats', state.screen === 'stats');
    show('tutorial', state.screen === 'tutorial');
  }

  private updateGameplay(delta: number) {
    const dt = Math.min(delta, 0.05);

    // ── Input ──
    let moveX = 0;
    let moveAlt = 0;
    let shoot = false;

    // Keyboard
    if (this.keys['a'] || this.keys['arrowleft']) moveX = -1;
    if (this.keys['d'] || this.keys['arrowright']) moveX = 1;
    if (this.keys['w'] || this.keys['arrowup']) moveAlt = 1;
    if (this.keys['s'] || this.keys['arrowdown']) moveAlt = -1;
    if (this.keys[' '] || this.keys['e'] || this.keys['k']) shoot = true;

    // XR controllers
    const right = world.input.xr.gamepads.right;
    const left = world.input.xr.gamepads.left;
    if (right) {
      const stick = right.getAxesValues(InputComponent.Thumbstick);
      if (stick) {
        if (Math.abs(stick.x) > 0.2) moveX = stick.x;
      }
      if (right.getButtonPressed(InputComponent.Trigger)) shoot = true;
    }
    if (left) {
      const stick = left.getAxesValues(InputComponent.Thumbstick);
      if (stick) {
        if (Math.abs(stick.y) > 0.2) moveAlt = -stick.y;
      }
    }

    // Move player laterally
    const lateralSpeed = 6;
    playerX += moveX * lateralSpeed * dt;
    playerX = Math.max(-5, Math.min(5, playerX));
    playerGroup.position.x = playerX;

    // Altitude control
    state.targetAltitude += moveAlt * 3 * dt;
    state.targetAltitude = Math.max(0.3, Math.min(3.5, state.targetAltitude));
    state.altitude += (state.targetAltitude - state.altitude) * 5 * dt;
    playerGroup.position.y = state.altitude;

    // Player tilt based on movement
    playerGroup.rotation.z = -moveX * 0.3;
    playerGroup.rotation.x = moveAlt * 0.15;

    // Shadow
    playerShadow.position.set(playerX, 0.01, playerGroup.position.z);
    const shadowScale = 1 - (state.altitude - 0.3) / 3.5 * 0.5;
    playerShadow.scale.set(shadowScale, shadowScale, 1);
    (playerShadow.material as MeshBasicMaterial).opacity = 0.4 * shadowScale;

    // Shoot
    if (shoot) shootBullet();
    state.shootCooldown = Math.max(0, state.shootCooldown - dt);

    // Scroll
    state.scrollZ -= state.scrollSpeed * dt;
    state.totalDistance += state.scrollSpeed * dt;

    // Fuel depletion
    const fuelRate = 3 * getDiffMult();
    state.fuel -= fuelRate * dt;
    if (state.fuel <= 0) {
      state.fuel = 0;
      playerHit();
    }

    // Timers
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }
    if (state.shieldTimer > 0) state.shieldTimer -= dt;
    if (state.rapidTimer > 0) state.rapidTimer -= dt;
    if (state.spreadTimer > 0) { state.spreadTimer -= dt; if (state.spreadTimer <= 0) state.spreadShot = false; }
    if (state.invincibleTimer > 0) state.invincibleTimer -= dt;

    // Speed mode timer
    if (state.mode === 'speed') {
      state.speedTimer -= dt;
      if (state.speedTimer <= 0) {
        state.screen = 'results';
        audio.stopMusic();
        saveStats();
        return;
      }
    }

    // Section management
    state.sectionTimer += dt;
    if (state.sectionTimer > 12) {
      state.sectionTimer = 0;
      state.fortressSection = !state.fortressSection;
      if (state.fortressSection) {
        spawnFortressSection();
      } else {
        spawnOpenSection();
      }
      // Boss every 3 levels
      if (!state.fortressSection && state.level % 3 === 0) {
        spawnBoss();
      }
    }
    // Level up every 60 seconds of distance
    const newLevel = Math.floor(-state.scrollZ / 200) + 1;
    if (newLevel > state.level) {
      state.level = newLevel;
      state.scrollSpeed = state.baseSpeed + state.level * 0.3;
    }

    // Spawn more content if needed
    if (fortressSpawnZ > state.scrollZ - 80) {
      if (state.fortressSection) spawnFortressSection();
      else spawnOpenSection();
    }

    // ── Update bullets ──
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.mesh.position.x += b.vx * dt;
      b.mesh.position.y += b.vy * dt;
      b.mesh.position.z += b.vz * dt;
      b.life -= dt;
      if (b.life <= 0) {
        world.scene.remove(b.mesh);
        bullets.splice(i, 1);
        continue;
      }
      // Player bullet collision checks
      if (!b.isEnemy) {
        // vs turrets
        for (const t of turrets) {
          if (!t.alive) continue;
          const dx = b.mesh.position.x - t.group.position.x;
          const dz = b.mesh.position.z - t.z;
          if (Math.abs(dx) < 0.5 && Math.abs(dz) < 0.5) {
            t.hp--;
            if (t.hp <= 0) {
              t.alive = false;
              t.group.visible = false;
              addScore(200);
              addCombo();
              state.totalKills++;
              spawnParticles(t.group.position.x, 0.3, t.z, getColor().accent, 12);
              audio.play('explode');
            } else {
              audio.play('hit');
            }
            world.scene.remove(b.mesh);
            bullets.splice(i, 1);
            break;
          }
        }
        // vs enemies
        for (const e of enemies) {
          if (!e.alive) continue;
          const dx = b.mesh.position.x - e.group.position.x;
          const dy = b.mesh.position.y - e.group.position.y;
          const dz = b.mesh.position.z - e.z;
          if (Math.abs(dx) < 0.6 && Math.abs(dy) < 0.6 && Math.abs(dz) < 0.6) {
            e.hp--;
            if (e.hp <= 0) {
              e.alive = false;
              e.group.visible = false;
              addScore(300);
              addCombo();
              state.totalKills++;
              spawnParticles(e.group.position.x, e.group.position.y, e.z, 0xff4400, 15);
              audio.play('explode');
            } else {
              audio.play('hit');
            }
            world.scene.remove(b.mesh);
            bullets.splice(i, 1);
            break;
          }
        }
        // vs fuel tanks
        for (const f of fuelTanks) {
          if (!f.alive) continue;
          const dx = b.mesh.position.x - f.mesh.position.x;
          const dz = b.mesh.position.z - f.z;
          if (Math.abs(dx) < 0.5 && Math.abs(dz) < 0.5 && b.mesh.position.y < 0.8) {
            f.alive = false;
            f.mesh.visible = false;
            state.fuel = Math.min(state.maxFuel, state.fuel + 25);
            state.totalFuelCollected++;
            addScore(100);
            spawnParticles(f.mesh.position.x, 0.4, f.z, 0xff8800, 10);
            audio.play('fuel');
            world.scene.remove(b.mesh);
            bullets.splice(i, 1);
            break;
          }
        }
        // vs boss
        if (boss && boss.alive) {
          const dx = b.mesh.position.x - boss.group.position.x;
          const dy = b.mesh.position.y - boss.group.position.y;
          const dz = b.mesh.position.z - boss.z;
          if (Math.abs(dx) < 1.8 && Math.abs(dy) < 0.5 && Math.abs(dz) < 1.2) {
            boss.hp--;
            audio.play('hit');
            if (boss.hp <= 0) {
              boss.alive = false;
              boss.group.visible = false;
              addScore(2000);
              state.bossesDefeated++;
              spawnParticles(boss.group.position.x, boss.group.position.y, boss.z, 0xff0000, 30);
              audio.play('explode');
            }
            world.scene.remove(b.mesh);
            bullets.splice(i, 1);
          }
        }
      } else {
        // Enemy bullet vs player
        const dx = b.mesh.position.x - playerGroup.position.x;
        const dy = b.mesh.position.y - playerGroup.position.y;
        const dz = b.mesh.position.z - playerGroup.position.z;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.3 && Math.abs(dz) < 0.5) {
          playerHit();
          world.scene.remove(b.mesh);
          bullets.splice(i, 1);
        }
      }
    }

    // ── Update turrets ──
    for (const t of turrets) {
      if (!t.alive) continue;
      // Position relative to scroll
      t.group.position.z = t.z - state.scrollZ;
      t.cooldown -= dt;
      if (t.cooldown <= 0 && t.group.position.z > -20 && t.group.position.z < 10) {
        t.cooldown = 2 / getDiffMult();
        // Fire at player
        const dx = playerGroup.position.x - t.group.position.x;
        const dy = playerGroup.position.y - 0.3;
        const dz = playerGroup.position.z - t.group.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist > 0.1) {
          const speed = 8;
          const b = createBullet(0xff4444, true);
          b.position.set(t.group.position.x, 0.3, t.group.position.z);
          world.scene.add(b);
          bullets.push({ mesh: b, vx: (dx / dist) * speed, vy: (dy / dist) * speed, vz: (dz / dist) * speed, life: 3, isEnemy: true });
          audio.play('turret');
        }
      }
    }

    // ── Update enemies ──
    for (const e of enemies) {
      if (!e.alive) continue;
      e.group.position.z = e.z - state.scrollZ;
      e.group.position.x = e.x + Math.sin(this.time * 2 + e.z) * 1.5;
      e.group.position.y = e.y;
      e.cooldown -= dt;
      if (e.cooldown <= 0 && e.group.position.z > -20 && e.group.position.z < 10) {
        e.cooldown = 2.5 / getDiffMult();
        const dx = playerGroup.position.x - e.group.position.x;
        const dy = playerGroup.position.y - e.group.position.y;
        const dz = playerGroup.position.z - e.group.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist > 0.1) {
          const speed = 10;
          const b = createBullet(0xff2200, true);
          b.position.set(e.group.position.x, e.group.position.y, e.group.position.z);
          world.scene.add(b);
          bullets.push({ mesh: b, vx: (dx / dist) * speed, vy: (dy / dist) * speed, vz: (dz / dist) * speed, life: 3, isEnemy: true });
        }
      }
      // Player collision
      const pdx = playerGroup.position.x - e.group.position.x;
      const pdy = playerGroup.position.y - e.group.position.y;
      const pdz = playerGroup.position.z - e.group.position.z;
      if (Math.abs(pdx) < 0.6 && Math.abs(pdy) < 0.4 && Math.abs(pdz) < 0.6) {
        e.alive = false;
        e.group.visible = false;
        playerHit();
        spawnParticles(e.group.position.x, e.group.position.y, e.z - state.scrollZ, 0xff4400, 12);
        audio.play('explode');
      }
    }

    // ── Update walls (collision) ──
    for (const w of walls) {
      w.group.position.z = w.z - state.scrollZ;
      // Player wall collision
      const wPos = w.group.position;
      const px = playerGroup.position.x;
      const pz = playerGroup.position.z;
      if (Math.abs(px - wPos.x) < 1.2 && Math.abs(pz - wPos.z) < 0.4 && state.altitude < w.height) {
        playerHit();
      }
    }
    state.totalWallsDodged++;

    // ── Update fuel tanks ──
    for (const f of fuelTanks) {
      if (!f.alive) continue;
      f.mesh.position.z = f.z - state.scrollZ;
    }

    // ── Update power-ups ──
    for (let i = powerUps.length - 1; i >= 0; i--) {
      const p = powerUps[i];
      if (!p.alive) continue;
      p.mesh.position.z = p.z - state.scrollZ;
      p.mesh.rotation.y += dt * 2;
      // Pickup
      const dx = playerGroup.position.x - p.mesh.position.x;
      const dy = playerGroup.position.y - p.mesh.position.y;
      const dz = playerGroup.position.z - p.mesh.position.z;
      if (Math.abs(dx) < 0.6 && Math.abs(dy) < 0.6 && Math.abs(dz) < 0.6) {
        p.alive = false;
        p.mesh.visible = false;
        state.totalPowerups++;
        audio.play('powerup');
        if (p.type === 'shield') state.shieldTimer = 10;
        else if (p.type === 'rapid') state.rapidTimer = 8;
        else if (p.type === 'fuel') { state.fuel = Math.min(state.maxFuel, state.fuel + 40); }
        else if (p.type === 'spread') { state.spreadShot = true; state.spreadTimer = 10; }
        else if (p.type === 'magnet') { addScore(500); }
      }
    }

    // ── Update boss ──
    if (boss && boss.alive) {
      boss.group.position.z = boss.z - state.scrollZ;
      boss.group.position.x = boss.x + Math.sin(this.time * 1.5) * 3;
      boss.group.position.y = boss.y + Math.sin(this.time * 2.5) * 0.5;
      boss.cooldown -= dt;
      if (boss.cooldown <= 0 && boss.group.position.z > -25 && boss.group.position.z < 15) {
        boss.cooldown = 1.5 / getDiffMult();
        // Multi-shot
        for (let a = -1; a <= 1; a++) {
          const b = createBullet(0xff0000, true);
          b.position.set(boss.group.position.x + a * 1, boss.group.position.y, boss.group.position.z);
          world.scene.add(b);
          const dx = playerGroup.position.x - b.position.x;
          const dy = playerGroup.position.y - b.position.y;
          const dz = playerGroup.position.z - b.position.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const speed = 12;
          bullets.push({ mesh: b, vx: dist > 0.1 ? (dx / dist) * speed : 0, vy: dist > 0.1 ? (dy / dist) * speed : 0, vz: dist > 0.1 ? (dz / dist) * speed : speed, life: 4, isEnemy: true });
        }
        audio.play('turret');
      }
      // Boss collision
      const dx = playerGroup.position.x - boss.group.position.x;
      const dy = playerGroup.position.y - boss.group.position.y;
      const dz = playerGroup.position.z - boss.group.position.z;
      if (Math.abs(dx) < 1.5 && Math.abs(dy) < 0.5 && Math.abs(dz) < 1.0) {
        playerHit();
      }
    }

    // Cleanup passed objects
    cleanupBehind();
  }

  private updateHUD() {
    const doc = this.docs['hud']?.doc;
    if (!doc) return;
    const setText = (id: string, text: string) => {
      (doc.getElementById(id) as UIKit.Text | undefined)?.setProperties({ text });
    };
    setText('hud-score', `Score: ${state.score}`);
    setText('hud-lives', `Lives: ${state.lives}`);
    setText('hud-fuel', `Fuel: ${Math.floor(state.fuel)}%`);
    setText('hud-level', `Level: ${state.level}`);
    setText('hud-combo', state.combo > 1 ? `Combo x${state.combo}` : '');
    setText('hud-altitude', `Alt: ${state.altitude.toFixed(1)}m`);
    if (state.mode === 'speed') setText('hud-timer', `Time: ${Math.ceil(state.speedTimer)}s`);
    else setText('hud-timer', '');
    // Power-up indicators
    let powers = '';
    if (state.shieldTimer > 0) powers += `Shield ${Math.ceil(state.shieldTimer)}s `;
    if (state.rapidTimer > 0) powers += `Rapid ${Math.ceil(state.rapidTimer)}s `;
    if (state.spreadTimer > 0) powers += `Spread ${Math.ceil(state.spreadTimer)}s `;
    setText('hud-powerups', powers);
  }

  private updateParticles(dt: number) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.vy -= 5 * dt;
      p.life -= dt;
      const alpha = p.life / p.maxLife;
      (p.mesh.material as MeshBasicMaterial).opacity = alpha;
      p.mesh.scale.setScalar(alpha);
      if (p.life <= 0) {
        world.scene.remove(p.mesh);
        particles.splice(i, 1);
      }
    }
  }

  private updateAmbient(time: number) {
    // Floating orbs
    ambientOrbs.forEach((orb, i) => {
      orb.position.y += Math.sin(time * 0.5 + i) * 0.003;
    });
    // Stars twinkle
    starField.forEach((s, i) => {
      (s.material as MeshBasicMaterial).opacity = 0.3 + Math.sin(time * 2 + i * 0.7) * 0.2;
    });
    // Player blink on invincible
    if (state.invincibleTimer > 0) {
      playerGroup.visible = Math.sin(this.time * 20) > 0;
    } else {
      playerGroup.visible = true;
    }
    // Shield visual
    if (state.shieldTimer > 0) {
      // Tint player slightly blue
    }
  }

  private updateCamera(dt: number) {
    // Isometric follow camera
    const targetX = playerX * 0.3;
    const targetZ = -8;
    world.camera.position.x += (targetX - world.camera.position.x) * 3 * dt;
    world.camera.position.z += (targetZ + 12 - world.camera.position.z) * 3 * dt;
    world.camera.lookAt(targetX, 1, targetZ);

    // Move altitude indicator
    altitudeIndicator.position.set(playerX - 3, 0, playerGroup.position.z);

    // Update results panel
    if (state.screen === 'results') {
      const doc = this.docs['results']?.doc;
      if (doc) {
        const setText = (id: string, text: string) => {
          (doc.getElementById(id) as UIKit.Text | undefined)?.setProperties({ text });
        };
        setText('result-score', `Final Score: ${state.score}`);
        setText('result-high', `High Score: ${state.highScore}`);
        setText('result-level', `Level Reached: ${state.level}`);
        setText('result-kills', `Enemies Destroyed: ${state.totalKills}`);
        setText('result-combo', `Best Combo: x${state.maxCombo}`);
        setText('result-distance', `Distance: ${Math.floor(state.totalDistance)}m`);
      }
    }

    // Update stats panel
    if (state.screen === 'stats') {
      const doc = this.docs['stats']?.doc;
      if (doc) {
        const setText = (id: string, text: string) => {
          (doc.getElementById(id) as UIKit.Text | undefined)?.setProperties({ text });
        };
        try {
          const stored = localStorage.getItem('neon-fortress-stats');
          const s = stored ? JSON.parse(stored) : {};
          setText('stat-highscore', `High Score: ${s.highScore || 0}`);
          setText('stat-games', `Games Played: ${s.gamesPlayed || 0}`);
          setText('stat-kills', `Total Kills: ${s.totalKills || 0}`);
          setText('stat-fuel', `Total Fuel: ${s.totalFuel || 0}`);
          setText('stat-shots', `Total Shots: ${s.totalShots || 0}`);
          setText('stat-powerups', `Power-ups: ${s.totalPowerups || 0}`);
          setText('stat-bosses', `Bosses Beaten: ${s.bossesDefeated || 0}`);
          setText('stat-combo', `Best Combo: x${s.bestCombo || 0}`);
          setText('stat-distance', `Total Distance: ${Math.floor(s.totalDistance || 0)}m`);
        } catch {}
      }
    }
  }
}
