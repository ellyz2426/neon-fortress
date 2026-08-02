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
  RingGeometry,
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
  private baseTempo = 400;
  private tensionLevel = 0; // 0=normal, 1=boss nearby

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

  setTension(level: number) {
    this.tensionLevel = Math.max(0, Math.min(1, level));
    this.baseTempo = 400 - this.tensionLevel * 150; // faster near boss
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
      o.start(now); o.stop(now + 0.12);
    } else if (type === 'hit') {
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.setValueAtTime(200, now);
      o.frequency.exponentialRampToValueAtTime(60, now + 0.2);
      o.connect(g);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      o.start(now); o.stop(now + 0.25);
    } else if (type === 'explode') {
      const bufSize = ctx.sampleRate * 0.3;
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
      const src = ctx.createBufferSource();
      src.buffer = buf; src.connect(g);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      src.start(now);
    } else if (type === 'powerup') {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(440, now);
      o.frequency.exponentialRampToValueAtTime(1760, now + 0.2);
      o.connect(g);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      o.start(now); o.stop(now + 0.25);
    } else if (type === 'death') {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(400, now);
      o.frequency.exponentialRampToValueAtTime(40, now + 0.8);
      o.connect(g);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.9);
      o.start(now); o.stop(now + 0.9);
    } else if (type === 'fuel') {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(600, now);
      o.frequency.linearRampToValueAtTime(900, now + 0.15);
      o.connect(g);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      o.start(now); o.stop(now + 0.2);
    } else if (type === 'turret') {
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.setValueAtTime(150, now);
      o.frequency.exponentialRampToValueAtTime(80, now + 0.15);
      o.connect(g);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      o.start(now); o.stop(now + 0.18);
    } else if (type === 'alert') {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(1200, now);
      o.frequency.setValueAtTime(800, now + 0.1);
      o.frequency.setValueAtTime(1200, now + 0.2);
      o.connect(g);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      o.start(now); o.stop(now + 0.3);
    } else if (type === 'boss') {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(100, now);
      o.frequency.linearRampToValueAtTime(300, now + 0.3);
      o.frequency.linearRampToValueAtTime(100, now + 0.6);
      o.connect(g);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
      o.start(now); o.stop(now + 0.7);
    } else if (type === 'click') {
      const o = ctx.createOscillator();
      o.type = 'sine'; o.frequency.value = 1000;
      o.connect(g);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      o.start(now); o.stop(now + 0.05);
    } else if (type === 'missile') {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(200, now);
      o.frequency.exponentialRampToValueAtTime(600, now + 0.15);
      o.frequency.exponentialRampToValueAtTime(100, now + 0.3);
      o.connect(g);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      o.start(now); o.stop(now + 0.35);
    } else if (type === 'electric') {
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.setValueAtTime(2000, now);
      o.frequency.exponentialRampToValueAtTime(100, now + 0.15);
      o.connect(g);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      o.start(now); o.stop(now + 0.2);
    } else if (type === 'mine') {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(300, now);
      o.frequency.exponentialRampToValueAtTime(50, now + 0.4);
      o.connect(g); g.gain.value = this.sfxVol * 0.8;
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      o.start(now); o.stop(now + 0.5);
    } else if (type === 'shield_break') {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(800, now);
      o.frequency.exponentialRampToValueAtTime(200, now + 0.4);
      o.connect(g);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      o.start(now); o.stop(now + 0.5);
    } else if (type === 'gate') {
      // Heavy metallic crash for gate destruction
      const bufSize = ctx.sampleRate * 0.5;
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 0.5);
      const src = ctx.createBufferSource();
      src.buffer = buf; src.connect(g);
      g.gain.value = this.sfxVol * 1.2;
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.55);
      src.start(now);
    } else if (type === 'checkpoint') {
      // Ascending chime
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(660, now);
      o.frequency.setValueAtTime(880, now + 0.1);
      o.frequency.setValueAtTime(1100, now + 0.2);
      o.connect(g);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      o.start(now); o.stop(now + 0.35);
    } else if (type === 'weapon_upgrade') {
      // Power-up ascending dual tone
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(440, now);
      o.frequency.exponentialRampToValueAtTime(1320, now + 0.25);
      o.connect(g);
      const o2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      o2.type = 'sine'; o2.frequency.setValueAtTime(660, now);
      o2.frequency.exponentialRampToValueAtTime(1760, now + 0.25);
      g2.gain.value = this.sfxVol * 0.6;
      o2.connect(g2); g2.connect(this.masterGain!);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      g2.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      o.start(now); o.stop(now + 0.3);
      o2.start(now); o2.stop(now + 0.3);
    } else if (type === 'formation') {
      // Warning klaxon
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.setValueAtTime(600, now);
      o.frequency.setValueAtTime(400, now + 0.15);
      o.frequency.setValueAtTime(600, now + 0.3);
      o.connect(g);
      g.gain.value = this.sfxVol * 0.5;
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      o.start(now); o.stop(now + 0.4);
    } else if (type === 'bomb') {
      // Low rumble for bombing ground targets
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(80, now);
      o.frequency.exponentialRampToValueAtTime(40, now + 0.4);
      o.connect(g); g.gain.value = this.sfxVol * 0.8;
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      o.start(now); o.stop(now + 0.5);
    } else if (type === 'dive') {
      // Descending whistle for dive bomber
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(1500, now);
      o.frequency.exponentialRampToValueAtTime(200, now + 0.6);
      o.connect(g); g.gain.value = this.sfxVol * 0.6;
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.65);
      o.start(now); o.stop(now + 0.65);
    } else if (type === 'bonus') {
      // Celebratory ascending triple tone
      const notes = [440, 660, 880];
      notes.forEach((freq, i) => {
        const o2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        o2.type = 'sine';
        o2.frequency.value = freq;
        g2.gain.value = this.sfxVol * 0.3;
        o2.connect(g2); g2.connect(this.masterGain!);
        g2.gain.exponentialRampToValueAtTime(0.01, now + 0.1 * i + 0.3);
        o2.start(now + 0.1 * i); o2.stop(now + 0.1 * i + 0.3);
      });
    } else if (type === 'cloak') {
      // Ethereal shimmer for cloaker appearing
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(1800, now);
      o.frequency.exponentialRampToValueAtTime(600, now + 0.3);
      o.connect(g); g.gain.value = this.sfxVol * 0.4;
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      o.start(now); o.stop(now + 0.35);
    } else if (type === 'rock_break') {
      // Crunch for asteroid destruction
      const bufSize = ctx.sampleRate * 0.25;
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 0.7) * 0.6;
      const src = ctx.createBufferSource();
      src.buffer = buf; src.connect(g);
      g.gain.value = this.sfxVol * 0.7;
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      src.start(now);
    } else if (type === 'sector') {
      // Deep resonant tone for sector transition
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(100, now);
      o.frequency.linearRampToValueAtTime(200, now + 0.4);
      o.connect(g); g.gain.value = this.sfxVol * 0.5;
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      o.start(now); o.stop(now + 0.6);
    } else if (type === 'streak') {
      // Ascending triumphant chord for kill streak milestones
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const o2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        o2.type = 'sine';
        o2.frequency.value = freq;
        g2.gain.value = this.sfxVol * 0.25;
        o2.connect(g2); g2.connect(this.masterGain!);
        g2.gain.exponentialRampToValueAtTime(0.01, now + 0.05 * i + 0.4);
        o2.start(now + 0.05 * i); o2.stop(now + 0.05 * i + 0.4);
      });
    } else if (type === 'gravity') {
      // Deep wobbling bass for gravity well
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(60, now);
      o.frequency.linearRampToValueAtTime(120, now + 0.2);
      o.frequency.linearRampToValueAtTime(50, now + 0.5);
      o.connect(g); g.gain.value = this.sfxVol * 0.4;
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      o.start(now); o.stop(now + 0.6);
    } else if (type === 'wingman_spawn') {
      // Upbeat dual-tone for wingman arrival
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(330, now);
      o.frequency.exponentialRampToValueAtTime(660, now + 0.15);
      o.connect(g); g.gain.value = this.sfxVol * 0.4;
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      o.start(now); o.stop(now + 0.3);
      const o2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      o2.type = 'sine'; o2.frequency.setValueAtTime(440, now + 0.1);
      o2.frequency.exponentialRampToValueAtTime(880, now + 0.25);
      g2.gain.value = this.sfxVol * 0.3;
      o2.connect(g2); g2.connect(this.masterGain!);
      g2.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      o2.start(now + 0.1); o2.stop(now + 0.35);
    } else if (type === 'multiplier') {
      // Quick rising ping for score multiplier zone
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(1000, now);
      o.frequency.exponentialRampToValueAtTime(2000, now + 0.1);
      o.connect(g); g.gain.value = this.sfxVol * 0.35;
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      o.start(now); o.stop(now + 0.15);
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
      o.connect(g); g.connect(this.masterGain!);
      o.start();
      this.musicOscs.push(o);
      this.musicGains.push(g);
    });
    this.musicBeat(notes, 0);
  }

  private musicBeat(notes: number[], idx: number) {
    if (!this.musicPlaying) return;
    const note = notes[idx % notes.length];
    const pitchMult = 1 + this.tensionLevel * 0.3;
    this.musicOscs.forEach((o, i) => {
      o.frequency.setTargetAtTime(note * (i === 2 ? 2 : 1) * pitchMult, this.ctx!.currentTime, 0.05);
    });
    setTimeout(() => this.musicBeat(notes, idx + 1), this.baseTempo);
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

interface Bullet { mesh: Mesh; vx: number; vy: number; vz: number; life: number; isEnemy?: boolean; isMissile?: boolean; damage?: number; }
interface Wall { group: Group; z: number; height: number; lane: number; moving?: boolean; baseHeight?: number; moveSpeed?: number; }
interface FuelTank { mesh: Group; z: number; lane: number; alive: boolean; }
interface Turret { group: Group; z: number; lane: number; alive: boolean; cooldown: number; hp: number; }
interface EnemyFighter { group: Group; z: number; x: number; y: number; alive: boolean; cooldown: number; hp: number; vx: number; }
interface PowerUp { mesh: Group; z: number; lane: number; type: 'shield' | 'rapid' | 'fuel' | 'spread' | 'magnet' | 'missile' | 'weapon'; alive: boolean; }
interface Particle { mesh: Mesh; vx: number; vy: number; vz: number; life: number; maxLife: number; }
interface BossShip { group: Group; z: number; x: number; y: number; alive: boolean; hp: number; maxHp: number; cooldown: number; phase: number; shieldActive: boolean; shieldHp: number; shieldMesh: Mesh | null; phaseTimer: number; spawnCooldown: number; }
interface PatrolDrone { group: Group; z: number; x: number; y: number; alive: boolean; hp: number; cooldown: number; patternAngle: number; patternRadius: number; centerX: number; centerY: number; }
interface MineObj { mesh: Group; z: number; x: number; y: number; alive: boolean; armTimer: number; pulsePhase: number; }
interface ElectricBarrier { group: Group; z: number; active: boolean; timer: number; onTime: number; offTime: number; boltMeshes: Mesh[]; }
interface FloatingScore { mesh: Group; life: number; vy: number; }
interface WarningArrow { mesh: Group; life: number; targetZ: number; targetX: number; }
interface CeilingBeam { mesh: Mesh; z: number; }
interface LightStrip { mesh: Mesh; z: number; side: number; }
interface Formation { fighters: EnemyFighter[]; centerZ: number; pattern: 'v' | 'line' | 'diamond'; alive: boolean; }
interface GroundTarget { group: Group; z: number; lane: number; alive: boolean; hp: number; maxHp: number; type: 'hangar' | 'radar' | 'depot'; }
interface CheckpointMarker { group: Group; z: number; reached: boolean; }
interface DiveBomber { group: Group; z: number; x: number; y: number; alive: boolean; hp: number; phase: 'hover' | 'dive'; diveTimer: number; targetX: number; targetY: number; }
interface Asteroid { group: Group; z: number; x: number; y: number; alive: boolean; hp: number; size: number; rotSpeed: { x: number; y: number; z: number }; vx: number; vy: number; }
interface CloakerEnemy { group: Group; z: number; x: number; y: number; alive: boolean; hp: number; cooldown: number; cloakPhase: number; visible_pct: number; shimmerTimer: number; }
interface GravityWell { group: Group; z: number; x: number; y: number; alive: boolean; hp: number; pullRadius: number; pullStrength: number; rotSpeed: number; }
interface Wingman { group: Group; alive: boolean; hp: number; maxHp: number; cooldown: number; respawnTimer: number; targetEnemy: EnemyFighter | PatrolDrone | CloakerEnemy | null; }

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
  // Round 2 additions
  missileAmmo: number;
  missileCooldown: number;
  screenShakeTimer: number;
  screenShakeIntensity: number;
  bossWarningShown: boolean;
  totalMissilesUsed: number;
  // Round 3 additions
  weaponLevel: number;
  checkpoint: number;
  lastCheckpointZ: number;
  alertText: string;
  alertTimer: number;
  checkpointsReached: number;
  groundTargetsDestroyed: number;
  formationsDestroyed: number;
  bonusActive: boolean;
  bonusTimer: number;
  diveBombersKilled: number;
  // Round 5 additions
  smartBombs: number;
  smartBombCooldown: number;
  totalSmartBombs: number;
  asteroidsDestroyed: number;
  cloakersKilled: number;
  sectorTheme: number; // rotates 0-3
  // Round 6 additions
  killStreak: number;
  bestStreak: number;
  totalWingmanKills: number;
  wingmanActive: boolean;
  wingmanRespawnTimer: number;
  scoreMultiplier: number;
  scoreMultiplierTimer: number;
  gravityWellsDestroyed: number;
}

const state: GameState = {
  screen: 'menu', mode: 'arcade', difficulty: 'normal', colorScheme: 'cyan',
  score: 0, highScore: 0, lives: 3, fuel: 100, maxFuel: 100,
  altitude: 1.5, targetAltitude: 1.5,
  scrollSpeed: 6, baseSpeed: 6, scrollZ: 0, level: 1,
  fortressSection: true, sectionTimer: 0,
  combo: 0, comboTimer: 0, maxCombo: 0,
  shieldTimer: 0, rapidTimer: 0, spreadShot: false, spreadTimer: 0,
  shootCooldown: 0, invincibleTimer: 0,
  totalKills: 0, totalFuelCollected: 0, totalShotsHired: 0,
  totalPowerups: 0, totalWallsDodged: 0, bossesDefeated: 0,
  gamesPlayed: 0, bestCombo: 0, totalDistance: 0,
  speedTimer: 120, challengeMoves: 300,
  missileAmmo: 3, missileCooldown: 0,
  screenShakeTimer: 0, screenShakeIntensity: 0,
  bossWarningShown: false, totalMissilesUsed: 0,
  weaponLevel: 1, checkpoint: 0, lastCheckpointZ: 0,
  alertText: '', alertTimer: 0,
  checkpointsReached: 0, groundTargetsDestroyed: 0, formationsDestroyed: 0,
  bonusActive: false, bonusTimer: 0, diveBombersKilled: 0,
  smartBombs: 1, smartBombCooldown: 0, totalSmartBombs: 0,
  asteroidsDestroyed: 0, cloakersKilled: 0, sectorTheme: 0,
  killStreak: 0, bestStreak: 0, totalWingmanKills: 0,
  wingmanActive: false, wingmanRespawnTimer: 0,
  scoreMultiplier: 1, scoreMultiplierTimer: 0, gravityWellsDestroyed: 0,
};

// ───── Scene Objects ─────
let world: World;
let playerGroup: Group;
let playerShadow: Mesh;
let altitudeIndicator: Group;
let shieldBubble: Mesh;
let radarGroup: Group;
const engineTrailParticles: Particle[] = [];
const bullets: Bullet[] = [];
const walls: Wall[] = [];
const fuelTanks: FuelTank[] = [];
const turrets: Turret[] = [];
const enemies: EnemyFighter[] = [];
const powerUps: PowerUp[] = [];
const particles: Particle[] = [];
const patrolDrones: PatrolDrone[] = [];
const mines: MineObj[] = [];
const electricBarriers: ElectricBarrier[] = [];
const floatingScores: FloatingScore[] = [];
const warningArrows: WarningArrow[] = [];
const ceilingBeams: CeilingBeam[] = [];
const lightStrips: LightStrip[] = [];
const radarDots: Mesh[] = [];
const formations: Formation[] = [];
const groundTargets: GroundTarget[] = [];
const checkpointMarkers: CheckpointMarker[] = [];
const diveBombers: DiveBomber[] = [];
const asteroids: Asteroid[] = [];
const cloakers: CloakerEnemy[] = [];
const gravityWells: GravityWell[] = [];
let wingman: Wingman | null = null;
let boss: BossShip | null = null;
let spawnTimer = 0;
let playerX = 0;
let cameraGroup: Group;
const gridLines: LineSegments[] = [];
const ambientOrbs: Mesh[] = [];
const starField: Mesh[] = [];
const pillars: Mesh[] = [];
const fortressWalls: Group[] = [];
let fortressSpawnZ = -20;
let engineTrailTimer = 0;

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
  const bodyGeo = new BoxGeometry(0.6, 0.15, 1.2);
  const bodyMat = new MeshStandardMaterial({ color: c.primary, emissive: new Color(c.primary), emissiveIntensity: 0.4, metalness: 0.8, roughness: 0.2 });
  g.add(new Mesh(bodyGeo, bodyMat));
  const wingGeo = new BoxGeometry(1.8, 0.05, 0.5);
  const wingMat = new MeshStandardMaterial({ color: c.secondary, emissive: new Color(c.secondary), emissiveIntensity: 0.3, metalness: 0.7, roughness: 0.3 });
  const wing = new Mesh(wingGeo, wingMat);
  wing.position.set(0, 0, 0.1);
  g.add(wing);
  const cockGeo = new SphereGeometry(0.15, 8, 6);
  const cockMat = new MeshStandardMaterial({ color: 0xffffff, emissive: new Color(0xffffff), emissiveIntensity: 0.6, metalness: 0.9, roughness: 0.1 });
  const cock = new Mesh(cockGeo, cockMat);
  cock.position.set(0, 0.1, -0.2);
  g.add(cock);
  [-0.5, 0.5].forEach(x => {
    const engGeo = new CylinderGeometry(0.08, 0.06, 0.4, 6);
    const engMat = new MeshStandardMaterial({ color: c.accent, emissive: new Color(c.accent), emissiveIntensity: 0.8 });
    const eng = new Mesh(engGeo, engMat);
    eng.position.set(x, -0.02, 0.5);
    eng.rotation.x = Math.PI / 2;
    g.add(eng);
  });
  const wireGeo = new EdgesGeometry(bodyGeo);
  const wireMat = new LineBasicMaterial({ color: c.primary, transparent: true, opacity: 0.6 });
  g.add(new LineSegments(wireGeo, wireMat));
  return g;
}

function createShieldBubbleMesh(): Mesh {
  const geo = new SphereGeometry(0.9, 16, 12);
  const mat = new MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.2, wireframe: true });
  return new Mesh(geo, mat);
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
  const pole = new Mesh(new BoxGeometry(0.02, 4, 0.02), new MeshBasicMaterial({ color: getColor().primary, transparent: true, opacity: 0.2 }));
  pole.position.y = 2;
  g.add(pole);
  for (let h = 0.5; h <= 3.5; h += 0.5) {
    const tick = new Mesh(new BoxGeometry(0.15, 0.02, 0.02), new MeshBasicMaterial({ color: getColor().primary, transparent: true, opacity: 0.3 }));
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
  const wireGeo = new EdgesGeometry(geo);
  g.add(new LineSegments(wireGeo, new LineBasicMaterial({ color: c.primary, transparent: true, opacity: 0.8 })));
  const stripe = new Mesh(new BoxGeometry(width, 0.05, 0.42), new MeshBasicMaterial({ color: c.accent, transparent: true, opacity: 0.8 }));
  stripe.position.y = height;
  g.add(stripe);
  g.position.x = lane * 2.5;
  return g;
}

function createFuelTank(lane: number): Group {
  const g = new Group();
  const tank = new Mesh(new CylinderGeometry(0.25, 0.25, 0.6, 8), new MeshStandardMaterial({ color: 0xff8800, emissive: new Color(0xff8800), emissiveIntensity: 0.5 }));
  tank.position.y = 0.4;
  g.add(tank);
  const ring = new Mesh(new CylinderGeometry(0.3, 0.3, 0.05, 8), new MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.6 }));
  ring.position.y = 0.4;
  g.add(ring);
  const base = new Mesh(new BoxGeometry(0.5, 0.1, 0.5), new MeshStandardMaterial({ color: 0x444444, metalness: 0.8, roughness: 0.3 }));
  base.position.y = 0.05;
  g.add(base);
  g.position.x = lane * 2.5;
  return g;
}

function createTurret(lane: number): Group {
  const c = getColor();
  const g = new Group();
  const base = new Mesh(new CylinderGeometry(0.3, 0.35, 0.3, 6), new MeshStandardMaterial({ color: c.accent, emissive: new Color(c.accent), emissiveIntensity: 0.3, metalness: 0.7, roughness: 0.3 }));
  base.position.y = 0.15;
  g.add(base);
  const barrel = new Mesh(new CylinderGeometry(0.06, 0.06, 0.6, 6), new MeshStandardMaterial({ color: 0xdddddd, metalness: 0.9, roughness: 0.1 }));
  barrel.position.set(0, 0.3, -0.3);
  barrel.rotation.x = Math.PI / 2;
  g.add(barrel);
  const dome = new Mesh(new SphereGeometry(0.2, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), new MeshStandardMaterial({ color: c.primary, emissive: new Color(c.primary), emissiveIntensity: 0.4 }));
  dome.position.y = 0.3;
  g.add(dome);
  g.position.x = lane * 2.5;
  return g;
}

function createEnemyFighter(): Group {
  const g = new Group();
  const body = new Mesh(new ConeGeometry(0.3, 0.8, 6), new MeshStandardMaterial({ color: 0xff2200, emissive: new Color(0xff2200), emissiveIntensity: 0.5 }));
  body.rotation.x = Math.PI / 2;
  g.add(body);
  g.add(new Mesh(new BoxGeometry(1.2, 0.04, 0.3), new MeshStandardMaterial({ color: 0xcc1100, emissive: new Color(0xcc1100), emissiveIntensity: 0.3 })));
  const eng = new Mesh(new SphereGeometry(0.1, 6, 4), new MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.8 }));
  eng.position.z = 0.4;
  g.add(eng);
  return g;
}

function createPatrolDroneMesh(): Group {
  const g = new Group();
  // Octagonal body
  const body = new Mesh(new CylinderGeometry(0.25, 0.25, 0.15, 8), new MeshStandardMaterial({ color: 0xffaa00, emissive: new Color(0xffaa00), emissiveIntensity: 0.4, metalness: 0.7 }));
  g.add(body);
  // Rotor arms
  [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach(angle => {
    const arm = new Mesh(new BoxGeometry(0.6, 0.03, 0.06), new MeshStandardMaterial({ color: 0x888888, metalness: 0.8 }));
    arm.rotation.y = angle;
    g.add(arm);
    const rotor = new Mesh(new CylinderGeometry(0.08, 0.08, 0.02, 6), new MeshBasicMaterial({ color: 0x44ff44, transparent: true, opacity: 0.6 }));
    rotor.position.set(Math.sin(angle) * 0.3, 0.05, Math.cos(angle) * 0.3);
    g.add(rotor);
  });
  // Scanner eye
  const eye = new Mesh(new SphereGeometry(0.06, 6, 4), new MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.9 }));
  eye.position.y = -0.08;
  g.add(eye);
  return g;
}

function createMineMesh(): Group {
  const g = new Group();
  const core = new Mesh(new SphereGeometry(0.15, 8, 6), new MeshStandardMaterial({ color: 0xff4400, emissive: new Color(0xff4400), emissiveIntensity: 0.3 }));
  g.add(core);
  // Spikes
  [new Vector3(1, 0, 0), new Vector3(-1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, -1, 0), new Vector3(0, 0, 1), new Vector3(0, 0, -1)].forEach(dir => {
    const spike = new Mesh(new ConeGeometry(0.04, 0.12, 4), new MeshStandardMaterial({ color: 0xcc3300, emissive: new Color(0xcc3300), emissiveIntensity: 0.4 }));
    spike.position.set(dir.x * 0.18, dir.y * 0.18, dir.z * 0.18);
    spike.lookAt(dir.x * 2, dir.y * 2, dir.z * 2);
    g.add(spike);
  });
  // Pulse ring
  const ring = new Mesh(new RingGeometry(0.2, 0.25, 12), new MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.4, side: 2 }));
  g.add(ring);
  return g;
}

function createElectricBarrierMesh(width: number): Group {
  const c = getColor();
  const g = new Group();
  // Left pylon
  const pylonL = new Mesh(new BoxGeometry(0.2, 4, 0.2), new MeshStandardMaterial({ color: 0x444466, emissive: new Color(0x4444ff), emissiveIntensity: 0.2, metalness: 0.8 }));
  pylonL.position.set(-width / 2, 2, 0);
  g.add(pylonL);
  // Right pylon
  const pylonR = new Mesh(new BoxGeometry(0.2, 4, 0.2), new MeshStandardMaterial({ color: 0x444466, emissive: new Color(0x4444ff), emissiveIntensity: 0.2, metalness: 0.8 }));
  pylonR.position.set(width / 2, 2, 0);
  g.add(pylonR);
  // Top connector
  const top = new Mesh(new BoxGeometry(width, 0.08, 0.08), new MeshBasicMaterial({ color: 0x4444ff, transparent: true, opacity: 0.6 }));
  top.position.y = 4;
  g.add(top);
  return g;
}

function createElectricBolt(width: number, height: number): Mesh {
  const verts: number[] = [];
  const segments = 12;
  for (let i = 0; i < segments; i++) {
    const t = i / (segments - 1);
    const y = t * height;
    const x = (Math.random() - 0.5) * width * 0.8;
    const nextT = (i + 1) / (segments - 1);
    const nextY = nextT * height;
    const nextX = (Math.random() - 0.5) * width * 0.8;
    verts.push(x, y, 0, nextX, nextY, 0);
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(verts, 3));
  return new LineSegments(geo, new LineBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0.8 })) as any;
}

function createBossShip(): Group {
  const c = getColor();
  const g = new Group();
  const hullGeo = new BoxGeometry(3, 0.6, 2);
  g.add(new Mesh(hullGeo, new MeshStandardMaterial({ color: 0x880000, emissive: new Color(0xff0000), emissiveIntensity: 0.3, metalness: 0.8, roughness: 0.2 })));
  g.add(new LineSegments(new EdgesGeometry(hullGeo), new LineBasicMaterial({ color: 0xff4444 })));
  [-1, 0, 1].forEach(x => {
    const t = new Mesh(new SphereGeometry(0.2, 6, 4), new MeshStandardMaterial({ color: c.accent, emissive: new Color(c.accent), emissiveIntensity: 0.6 }));
    t.position.set(x, 0.4, 0);
    g.add(t);
  });
  [-1.2, 1.2].forEach(x => {
    const e = new Mesh(new CylinderGeometry(0.2, 0.15, 0.5, 6), new MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.7 }));
    e.position.set(x, 0, 1);
    e.rotation.x = Math.PI / 2;
    g.add(e);
  });
  return g;
}

function createBossShieldMesh(): Mesh {
  const geo = new SphereGeometry(2.2, 16, 12);
  const mat = new MeshBasicMaterial({ color: 0x4444ff, transparent: true, opacity: 0.15, wireframe: true });
  return new Mesh(geo, mat);
}

function createPowerUpMesh(type: string): Group {
  const g = new Group();
  let color = 0x00ffff;
  if (type === 'shield') color = 0x4488ff;
  else if (type === 'rapid') color = 0xff4444;
  else if (type === 'fuel') color = 0xff8800;
  else if (type === 'spread') color = 0xffff00;
  else if (type === 'magnet') color = 0xff44ff;
  else if (type === 'missile') color = 0x44ffaa;
  else if (type === 'weapon') color = 0xffff44;
  const sphere = new Mesh(new SphereGeometry(0.2, 8, 6), new MeshStandardMaterial({ color, emissive: new Color(color), emissiveIntensity: 0.6 }));
  g.add(sphere);
  const ring = new Mesh(new CylinderGeometry(0.3, 0.3, 0.03, 12), new MeshBasicMaterial({ color, transparent: true, opacity: 0.5 }));
  g.add(ring);
  if (type === 'missile') {
    // Add small missile icon
    const missile = new Mesh(new ConeGeometry(0.06, 0.2, 4), new MeshBasicMaterial({ color: 0xffffff }));
    missile.position.y = 0.35;
    missile.rotation.x = Math.PI;
    g.add(missile);
  }
  if (type === 'weapon') {
    // Add arrows indicating upgrade
    const arrow = new Mesh(new ConeGeometry(0.08, 0.15, 4), new MeshBasicMaterial({ color: 0xffffff }));
    arrow.position.y = 0.35;
    g.add(arrow);
  }
  return g;
}

function createBullet(color: number, isEnemy = false): Mesh {
  const geo = isEnemy ? new SphereGeometry(0.06, 4, 3) : new BoxGeometry(0.04, 0.04, 0.3);
  return new Mesh(geo, new MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }));
}

function createMissileMesh(): Mesh {
  const geo = new ConeGeometry(0.06, 0.4, 6);
  const mat = new MeshStandardMaterial({ color: 0x44ffaa, emissive: new Color(0x44ffaa), emissiveIntensity: 0.8 });
  const m = new Mesh(geo, mat);
  m.rotation.x = Math.PI / 2;
  return m;
}

function createRadar(): Group {
  const g = new Group();
  // Radar background disc
  const disc = new Mesh(new CylinderGeometry(1.2, 1.2, 0.02, 24), new MeshBasicMaterial({ color: 0x001100, transparent: true, opacity: 0.6 }));
  g.add(disc);
  // Radar rim
  const rim = new Mesh(new RingGeometry(1.15, 1.25, 24), new MeshBasicMaterial({ color: 0x00ff44, transparent: true, opacity: 0.4, side: 2 }));
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = 0.02;
  g.add(rim);
  // Cross lines
  const crossVerts = [-1.1, 0, 0, 1.1, 0, 0, 0, 0, -1.1, 0, 0, 1.1];
  const crossGeo = new BufferGeometry();
  crossGeo.setAttribute('position', new Float32BufferAttribute(crossVerts, 3));
  const cross = new LineSegments(crossGeo, new LineBasicMaterial({ color: 0x003300, transparent: true, opacity: 0.4 }));
  cross.position.y = 0.025;
  g.add(cross);
  // Range rings
  [0.4, 0.8].forEach(r => {
    const ringVerts: number[] = [];
    for (let i = 0; i < 24; i++) {
      const a1 = (i / 24) * Math.PI * 2;
      const a2 = ((i + 1) / 24) * Math.PI * 2;
      ringVerts.push(Math.cos(a1) * r, 0, Math.sin(a1) * r, Math.cos(a2) * r, 0, Math.sin(a2) * r);
    }
    const rGeo = new BufferGeometry();
    rGeo.setAttribute('position', new Float32BufferAttribute(ringVerts, 3));
    const rLine = new LineSegments(rGeo, new LineBasicMaterial({ color: 0x003300, transparent: true, opacity: 0.3 }));
    rLine.position.y = 0.025;
    g.add(rLine);
  });
  // Player dot (center)
  const playerDot = new Mesh(new SphereGeometry(0.05, 6, 4), new MeshBasicMaterial({ color: 0x00ff44 }));
  playerDot.position.y = 0.04;
  g.add(playerDot);
  return g;
}

function createRadarDot(color: number): Mesh {
  const geo = new SphereGeometry(0.04, 4, 3);
  return new Mesh(geo, new MeshBasicMaterial({ color, transparent: true, opacity: 0.8 }));
}

function createFloatingScoreMesh(pts: number, color: number): Group {
  const g = new Group();
  // Small glowing sphere as score indicator
  const glow = new Mesh(new SphereGeometry(0.08, 6, 4), new MeshBasicMaterial({ color, transparent: true, opacity: 0.8 }));
  g.add(glow);
  // Ring expanding outward
  const ring = new Mesh(new RingGeometry(0.1, 0.15, 8), new MeshBasicMaterial({ color, transparent: true, opacity: 0.6, side: 2 }));
  g.add(ring);
  return g;
}

function createCeilingBeam(z: number, xPos: number): Mesh {
  const c = getColor();
  const geo = new BoxGeometry(0.15, 0.15, 4);
  const mat = new MeshStandardMaterial({ color: c.secondary, emissive: new Color(c.secondary), emissiveIntensity: 0.1, metalness: 0.7, roughness: 0.3 });
  const m = new Mesh(geo, mat);
  m.position.set(xPos, 4.5, z);
  return m;
}

function createLightStrip(z: number, side: number): Mesh {
  const c = getColor();
  const geo = new BoxGeometry(0.08, 0.08, 3);
  const mat = new MeshBasicMaterial({ color: c.primary, transparent: true, opacity: 0.4 });
  const m = new Mesh(geo, mat);
  m.position.set(side * 4.5, 0.1, z);
  return m;
}

function spawnParticles(x: number, y: number, z: number, color: number, count: number) {
  for (let i = 0; i < count; i++) {
    const m = new Mesh(new BoxGeometry(0.05, 0.05, 0.05), new MeshBasicMaterial({ color, transparent: true, opacity: 1 }));
    m.position.set(x, y, z);
    world.scene.add(m);
    const speed = 2 + Math.random() * 4;
    const angle = Math.random() * Math.PI * 2;
    const elev = (Math.random() - 0.5) * Math.PI;
    particles.push({ mesh: m, vx: Math.cos(angle) * Math.cos(elev) * speed, vy: Math.sin(elev) * speed + 1, vz: Math.sin(angle) * Math.cos(elev) * speed, life: 0.5 + Math.random() * 0.5, maxLife: 1 });
  }
}

function spawnEngineTrail() {
  [-0.5, 0.5].forEach(xOff => {
    const m = new Mesh(new BoxGeometry(0.03, 0.03, 0.06), new MeshBasicMaterial({ color: getColor().accent, transparent: true, opacity: 0.7 }));
    const px = playerGroup.position.x + xOff;
    const py = playerGroup.position.y - 0.02;
    const pz = playerGroup.position.z + 0.7;
    m.position.set(px, py, pz);
    world.scene.add(m);
    engineTrailParticles.push({ mesh: m, vx: (Math.random() - 0.5) * 0.3, vy: -0.3 + Math.random() * -0.2, vz: 2 + Math.random(), life: 0.3 + Math.random() * 0.2, maxLife: 0.5 });
  });
}

function spawnFloatingScore(x: number, y: number, z: number, pts: number) {
  const color = pts >= 500 ? 0xffcc00 : pts >= 200 ? 0x00ffff : 0x44ff44;
  const g = createFloatingScoreMesh(pts, color);
  g.position.set(x, y, z);
  world.scene.add(g);
  floatingScores.push({ mesh: g, life: 1.0, vy: 2 });
}

function triggerScreenShake(intensity: number, duration: number) {
  state.screenShakeTimer = duration;
  state.screenShakeIntensity = intensity;
}

function spawnWarningArrow(x: number, z: number) {
  const g = new Group();
  const arrow = new Mesh(new ConeGeometry(0.15, 0.3, 4), new MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.8 }));
  arrow.rotation.x = Math.PI;
  g.add(arrow);
  const ring = new Mesh(new RingGeometry(0.2, 0.28, 8), new MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.5, side: 2 }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -0.2;
  g.add(ring);
  g.position.set(x, 5, 0);
  world.scene.add(g);
  warningArrows.push({ mesh: g, life: 2, targetZ: z, targetX: x });
}

// ───── Ground Targets ─────
function createGroundTargetMesh(type: 'hangar' | 'radar' | 'depot'): Group {
  const c = getColor();
  const g = new Group();
  if (type === 'hangar') {
    const base = new Mesh(new BoxGeometry(1.2, 0.3, 0.8), new MeshStandardMaterial({ color: 0x555566, emissive: new Color(0x334455), emissiveIntensity: 0.2, metalness: 0.7, roughness: 0.3 }));
    base.position.y = 0.15;
    g.add(base);
    const roof = new Mesh(new CylinderGeometry(0.6, 0.6, 1.2, 6, 1, false, 0, Math.PI), new MeshStandardMaterial({ color: 0x445566, emissive: new Color(0x223344), emissiveIntensity: 0.15, metalness: 0.6 }));
    roof.rotation.z = Math.PI / 2;
    roof.position.y = 0.3;
    g.add(roof);
    const wireGeo = new EdgesGeometry(new BoxGeometry(1.22, 0.32, 0.82));
    g.add(new LineSegments(wireGeo, new LineBasicMaterial({ color: c.accent, transparent: true, opacity: 0.5 })));
  } else if (type === 'radar') {
    const pole = new Mesh(new CylinderGeometry(0.06, 0.06, 0.7, 6), new MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 }));
    pole.position.y = 0.35;
    g.add(pole);
    const dish = new Mesh(new ConeGeometry(0.4, 0.15, 8, 1, true), new MeshStandardMaterial({ color: 0xaaaacc, emissive: new Color(c.primary), emissiveIntensity: 0.3, metalness: 0.5, side: 2 }));
    dish.position.y = 0.7;
    g.add(dish);
    const base = new Mesh(new BoxGeometry(0.5, 0.1, 0.5), new MeshStandardMaterial({ color: 0x555555, metalness: 0.7 }));
    base.position.y = 0.05;
    g.add(base);
  } else {
    const tank1 = new Mesh(new CylinderGeometry(0.2, 0.2, 0.5, 8), new MeshStandardMaterial({ color: 0xff6600, emissive: new Color(0xff4400), emissiveIntensity: 0.3 }));
    tank1.rotation.z = Math.PI / 2;
    tank1.position.set(-0.25, 0.3, 0);
    g.add(tank1);
    const tank2 = new Mesh(new CylinderGeometry(0.2, 0.2, 0.5, 8), new MeshStandardMaterial({ color: 0xff6600, emissive: new Color(0xff4400), emissiveIntensity: 0.3 }));
    tank2.rotation.z = Math.PI / 2;
    tank2.position.set(0.25, 0.3, 0);
    g.add(tank2);
    const base = new Mesh(new BoxGeometry(0.9, 0.1, 0.6), new MeshStandardMaterial({ color: 0x444444, metalness: 0.7 }));
    base.position.y = 0.05;
    g.add(base);
    const pipe = new Mesh(new CylinderGeometry(0.03, 0.03, 0.8, 6), new MeshStandardMaterial({ color: 0x666666 }));
    pipe.position.set(0, 0.2, 0.35);
    pipe.rotation.x = Math.PI / 2;
    g.add(pipe);
  }
  return g;
}

function createCheckpoint(z: number): Group {
  const c = getColor();
  const g = new Group();
  // Gate posts
  [-3.5, 3.5].forEach(x => {
    const post = new Mesh(new CylinderGeometry(0.08, 0.08, 4, 6), new MeshStandardMaterial({ color: c.primary, emissive: new Color(c.primary), emissiveIntensity: 0.3 }));
    post.position.set(x, 2, 0);
    g.add(post);
    const topLight = new Mesh(new SphereGeometry(0.12, 6, 4), new MeshBasicMaterial({ color: 0x44ff44, transparent: true, opacity: 0.7 }));
    topLight.position.set(x, 4.1, 0);
    g.add(topLight);
  });
  // Cross bar
  const bar = new Mesh(new BoxGeometry(7, 0.06, 0.06), new MeshBasicMaterial({ color: 0x44ff44, transparent: true, opacity: 0.5 }));
  bar.position.y = 4;
  g.add(bar);
  // Marker ring
  const ring = new Mesh(new RingGeometry(2.5, 2.7, 16), new MeshBasicMaterial({ color: 0x44ff44, transparent: true, opacity: 0.3, side: 2 }));
  ring.position.y = 2;
  g.add(ring);
  g.position.z = z;
  return g;
}

function createDiveBomberMesh(): Group {
  const g = new Group();
  // Sleek triangular body
  const body = new Mesh(new ConeGeometry(0.35, 1.0, 3), new MeshStandardMaterial({ color: 0xff0066, emissive: new Color(0xff0066), emissiveIntensity: 0.5, metalness: 0.7, roughness: 0.2 }));
  body.rotation.x = Math.PI / 2;
  g.add(body);
  // Delta wings
  const wing = new Mesh(new BoxGeometry(1.6, 0.03, 0.6), new MeshStandardMaterial({ color: 0xcc0044, emissive: new Color(0xcc0044), emissiveIntensity: 0.3, metalness: 0.6 }));
  wing.position.z = 0.15;
  g.add(wing);
  // Warning lights (pulse when diving)
  [-0.4, 0.4].forEach(x => {
    const light = new Mesh(new SphereGeometry(0.06, 6, 4), new MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.8 }));
    light.position.set(x, -0.05, 0.2);
    g.add(light);
  });
  // Engine glow
  const eng = new Mesh(new SphereGeometry(0.12, 6, 4), new MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.7 }));
  eng.position.z = 0.5;
  g.add(eng);
  return g;
}

function createBonusRing(z: number): Group {
  const c = getColor();
  const g = new Group();
  const ring = new Mesh(new RingGeometry(2.0, 2.3, 16), new MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.5, side: 2 }));
  ring.position.y = 2;
  g.add(ring);
  const inner = new Mesh(new RingGeometry(1.5, 1.6, 16), new MeshBasicMaterial({ color: 0x44ff44, transparent: true, opacity: 0.3, side: 2 }));
  inner.position.y = 2;
  g.add(inner);
  g.position.z = z;
  return g;
}

// ───── Asteroid ─────
function createAsteroidMesh(size: number): Group {
  const g = new Group();
  // Rough rocky shape using a low-poly sphere with wireframe
  const geo = new SphereGeometry(size, 6, 4);
  // Displace vertices for rough asteroid look
  const posAttr = geo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const z = posAttr.getZ(i);
    const noise = 0.7 + Math.random() * 0.6;
    posAttr.setXYZ(i, x * noise, y * noise, z * noise);
  }
  geo.computeVertexNormals();
  const core = new Mesh(geo, new MeshStandardMaterial({ color: 0x555566, roughness: 0.9, metalness: 0.2, emissive: 0x222233, emissiveIntensity: 0.2 }));
  g.add(core);
  // Wireframe overlay
  const wire = new LineSegments(new EdgesGeometry(geo), new LineBasicMaterial({ color: 0x8888aa, transparent: true, opacity: 0.5 }));
  g.add(wire);
  return g;
}

// ───── Cloaker Enemy ─────
function createCloakerMesh(): Group {
  const g = new Group();
  // Sleek angular stealth fighter shape
  const body = new Mesh(new BoxGeometry(0.7, 0.15, 1.0), new MeshStandardMaterial({ color: 0x112244, roughness: 0.3, metalness: 0.9, emissive: 0x223366, emissiveIntensity: 0.3, transparent: true, opacity: 0.8 }));
  g.add(body);
  // Angular wings
  const lw = new Mesh(new BoxGeometry(0.8, 0.05, 0.5), new MeshStandardMaterial({ color: 0x112244, roughness: 0.3, metalness: 0.9, emissive: 0x223366, emissiveIntensity: 0.3, transparent: true, opacity: 0.8 }));
  lw.position.set(-0.5, 0, 0.1);
  lw.rotation.z = -0.2;
  g.add(lw);
  const rw = new Mesh(new BoxGeometry(0.8, 0.05, 0.5), new MeshStandardMaterial({ color: 0x112244, roughness: 0.3, metalness: 0.9, emissive: 0x223366, emissiveIntensity: 0.3, transparent: true, opacity: 0.8 }));
  rw.position.set(0.5, 0, 0.1);
  rw.rotation.z = 0.2;
  g.add(rw);
  // Shimmer eye (glows when visible)
  const eye = new Mesh(new SphereGeometry(0.06, 6, 4), new MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.6 }));
  eye.position.set(0, 0.1, -0.35);
  g.add(eye);
  // Wireframe
  const wireGeo = new EdgesGeometry(new BoxGeometry(0.75, 0.2, 1.05));
  const wire = new LineSegments(wireGeo, new LineBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.3 }));
  g.add(wire);
  return g;
}

function createGravityWellMesh(): Group {
  const g = new Group();
  // Central singularity sphere
  const core = new Mesh(new SphereGeometry(0.3, 12, 8), new MeshBasicMaterial({ color: 0x8800ff, transparent: true, opacity: 0.8 }));
  g.add(core);
  // Accretion rings
  for (let i = 0; i < 3; i++) {
    const ring = new Mesh(
      new RingGeometry(0.6 + i * 0.4, 0.7 + i * 0.4, 24),
      new MeshBasicMaterial({ color: 0xaa44ff, transparent: true, opacity: 0.4 - i * 0.1, side: 2 })
    );
    ring.rotation.x = Math.PI / 2 + (i - 1) * 0.3;
    g.add(ring);
  }
  // Outer glow sphere
  const glow = new Mesh(new SphereGeometry(1.5, 12, 8), new MeshBasicMaterial({ color: 0x6600cc, transparent: true, opacity: 0.1, wireframe: true }));
  g.add(glow);
  // Wireframe edges
  const wireGeo = new EdgesGeometry(new SphereGeometry(0.3, 12, 8));
  g.add(new LineSegments(wireGeo, new LineBasicMaterial({ color: 0xcc88ff, transparent: true, opacity: 0.6 })));
  return g;
}

function createWingmanShip(): Group {
  const c = getColor();
  const g = new Group();
  // Smaller version of the player ship
  const bodyGeo = new BoxGeometry(0.4, 0.1, 0.8);
  const bodyMat = new MeshStandardMaterial({ color: 0x44aaff, emissive: new Color(0x44aaff), emissiveIntensity: 0.5, metalness: 0.8, roughness: 0.2 });
  g.add(new Mesh(bodyGeo, bodyMat));
  const wingGeo = new BoxGeometry(1.2, 0.03, 0.35);
  const wingMat = new MeshStandardMaterial({ color: 0x2288dd, emissive: new Color(0x2288dd), emissiveIntensity: 0.3 });
  const wing = new Mesh(wingGeo, wingMat);
  wing.position.set(0, 0, 0.05);
  g.add(wing);
  const cockGeo = new SphereGeometry(0.1, 6, 4);
  const cockMat = new MeshStandardMaterial({ color: 0xffffff, emissive: new Color(0xffffff), emissiveIntensity: 0.5 });
  const cock = new Mesh(cockGeo, cockMat);
  cock.position.set(0, 0.07, -0.15);
  g.add(cock);
  // Engine glow
  const eng = new Mesh(new SphereGeometry(0.06, 4, 4), new MeshBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0.8 }));
  eng.position.z = 0.4;
  g.add(eng);
  // Wireframe
  const wireGeo = new EdgesGeometry(bodyGeo);
  g.add(new LineSegments(wireGeo, new LineBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0.5 })));
  return g;
}

function createScoreZoneMesh(): Group {
  const g = new Group();
  const geo = new BoxGeometry(4, 3, 0.15);
  const mat = new MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.08, side: 2 });
  g.add(new Mesh(geo, mat));
  // Border edges
  const wireGeo = new EdgesGeometry(geo);
  g.add(new LineSegments(wireGeo, new LineBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.5 })));
  return g;
}

function spawnWingman() {
  if (wingman && wingman.alive) return;
  const ship = createWingmanShip();
  ship.position.set(playerX + 1.5, state.altitude - 0.3, playerGroup.position.z + 1);
  world.scene.add(ship);
  wingman = { group: ship, alive: true, hp: 3, maxHp: 3, cooldown: 0, respawnTimer: 0, targetEnemy: null };
  state.wingmanActive = true;
  audio.play('wingman_spawn');
  showAlert('WINGMAN DEPLOYED!');
}

function checkKillStreak() {
  state.killStreak++;
  if (state.killStreak > state.bestStreak) state.bestStreak = state.killStreak;
  if (state.killStreak === 5) {
    addScore(500); audio.play('streak'); showAlert('HOT STREAK! x5 +500');
  } else if (state.killStreak === 10) {
    addScore(1000); audio.play('streak'); showAlert('KILLING SPREE! x10 +1000');
    state.rapidTimer = Math.max(state.rapidTimer, 5);
  } else if (state.killStreak === 15) {
    addScore(2000); audio.play('streak'); showAlert('UNSTOPPABLE! x15 +2000');
    state.shieldTimer = Math.max(state.shieldTimer, 5);
  } else if (state.killStreak === 25) {
    addScore(5000); audio.play('streak'); showAlert('LEGENDARY! x25 +5000');
    state.smartBombs = Math.min(3, state.smartBombs + 1);
  }
}

// ───── Smart Bomb VFX ─────
function triggerSmartBomb() {
  if (state.smartBombs <= 0 || state.smartBombCooldown > 0) return;
  state.smartBombs--;
  state.totalSmartBombs++;
  state.smartBombCooldown = 1.0;
  audio.play('bomb');
  triggerScreenShake(0.6, 0.8);
  showAlert('SMART BOMB!');

  // Kill all enemies on screen
  let killCount = 0;
  for (const e of enemies) {
    if (e.alive && e.group.position.z > -25 && e.group.position.z < 15) {
      e.alive = false; e.group.visible = false;
      spawnParticles(e.group.position.x, e.group.position.y, e.group.position.z, 0xffcc00, 8);
      killCount++;
    }
  }
  for (const d of patrolDrones) {
    if (d.alive && d.group.position.z > -25 && d.group.position.z < 15) {
      d.alive = false; d.group.visible = false;
      spawnParticles(d.group.position.x, d.group.position.y, d.group.position.z, 0xffcc00, 8);
      killCount++;
    }
  }
  for (const m of mines) {
    if (m.alive && m.mesh.position.z > -25 && m.mesh.position.z < 15) {
      m.alive = false; m.mesh.visible = false;
      spawnParticles(m.mesh.position.x, m.mesh.position.y, m.mesh.position.z, 0xffcc00, 6);
      killCount++;
    }
  }
  for (const db of diveBombers) {
    if (db.alive && db.group.position.z > -25 && db.group.position.z < 15) {
      db.alive = false; db.group.visible = false;
      spawnParticles(db.group.position.x, db.group.position.y, db.group.position.z, 0xffcc00, 8);
      killCount++;
    }
  }
  for (const cl of cloakers) {
    if (cl.alive && cl.group.position.z > -25 && cl.group.position.z < 15) {
      cl.alive = false; cl.group.visible = false;
      spawnParticles(cl.group.position.x, cl.group.position.y, cl.group.position.z, 0x4488ff, 10);
      killCount++;
    }
  }
  for (const a of asteroids) {
    if (a.alive && a.group.position.z > -25 && a.group.position.z < 15) {
      a.alive = false; a.group.visible = false;
      spawnParticles(a.group.position.x, a.group.position.y, a.group.position.z, 0x8888aa, 10);
      killCount++;
    }
  }
  // Remove enemy bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    if (bullets[i].isEnemy) {
      world.scene.remove(bullets[i].mesh);
      bullets.splice(i, 1);
    }
  }
  state.totalKills += killCount;
  addScore(killCount * 100);

  // Flash VFX - expanding ring
  const ring = new Mesh(new RingGeometry(0.5, 1.0, 24), new MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.8, side: 2 }));
  ring.position.set(playerGroup.position.x, playerGroup.position.y, playerGroup.position.z);
  ring.rotation.x = -Math.PI / 2;
  world.scene.add(ring);
  let ringLife = 0.6;
  const expandRing = () => {
    ringLife -= 0.016;
    if (ringLife <= 0) { world.scene.remove(ring); return; }
    const s = 1 + (0.6 - ringLife) * 40;
    ring.scale.setScalar(s);
    (ring.material as MeshBasicMaterial).opacity = ringLife;
    requestAnimationFrame(expandRing);
  };
  expandRing();
}

// ───── Sector Theme ─────
const SECTOR_THEMES = [
  { name: 'DEEP SPACE', fogColor: 0x000811, ambientTint: 0x224466, gridColor: 0x003344 },
  { name: 'NEBULA', fogColor: 0x110022, ambientTint: 0x664488, gridColor: 0x330044 },
  { name: 'ASTEROID BELT', fogColor: 0x0a0a0a, ambientTint: 0x886644, gridColor: 0x332200 },
  { name: 'ION STORM', fogColor: 0x001122, ambientTint: 0x2288aa, gridColor: 0x004466 },
];

function applySectorTheme(themeIdx: number) {
  const theme = SECTOR_THEMES[themeIdx % SECTOR_THEMES.length];
  if (world && world.scene) {
    world.scene.background = new Color(theme.fogColor);
    if (world.scene.fog) {
      (world.scene.fog as FogExp2).color.setHex(theme.fogColor);
    }
    // Tint ambient orbs
    ambientOrbs.forEach(orb => {
      (orb.material as MeshBasicMaterial).color.setHex(theme.ambientTint);
    });
    // Tint grid lines
    gridLines.forEach(line => {
      ((line as LineSegments).material as LineBasicMaterial).color.setHex(theme.gridColor);
    });
  }
}

function getPerformanceRank(score: number, kills: number, level: number, combo: number): { rank: string; label: string; color: string } {
  const total = score / 1000 + kills * 2 + level * 10 + combo * 5;
  if (total >= 200) return { rank: 'S', label: 'SUPREME COMMANDER', color: '#ffcc00' };
  if (total >= 120) return { rank: 'A', label: 'ACE PILOT', color: '#00ffcc' };
  if (total >= 70) return { rank: 'B', label: 'VETERAN', color: '#00aaff' };
  if (total >= 30) return { rank: 'C', label: 'CADET', color: '#88ff44' };
  return { rank: 'D', label: 'ROOKIE', color: '#ff8844' };
}

function spawnFormation(baseZ: number) {
  const patterns: Array<'v' | 'line' | 'diamond'> = ['v', 'line', 'diamond'];
  const pattern = patterns[Math.floor(Math.random() * patterns.length)];
  const centerX = (Math.random() - 0.5) * 4;
  const centerY = 1.5 + Math.random() * 1;
  const formationFighters: EnemyFighter[] = [];

  let offsets: Array<[number, number]> = [];
  if (pattern === 'v') {
    offsets = [[0, 0], [-1.2, 1.5], [1.2, 1.5], [-2.4, 3], [2.4, 3]];
  } else if (pattern === 'line') {
    offsets = [[-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0]];
  } else {
    offsets = [[0, 0], [-1.2, 1], [1.2, 1], [0, 2], [-1.2, -1], [1.2, -1]];
  }

  for (const [ox, oz] of offsets) {
    const eg = createEnemyFighter();
    const ex = centerX + ox;
    const ey = centerY;
    const ez = baseZ - oz;
    eg.position.set(ex, ey, ez);
    world.scene.add(eg);
    const fighter: EnemyFighter = { group: eg, z: ez + state.scrollZ, x: ex, y: ey, alive: true, cooldown: 3 + Math.random() * 2, hp: 2 + Math.floor(state.level / 3), vx: 0 };
    enemies.push(fighter);
    formationFighters.push(fighter);
  }
  formations.push({ fighters: formationFighters, centerZ: baseZ + state.scrollZ, pattern, alive: true });
  showAlert('FORMATION INCOMING!');
}

function showAlert(text: string) {
  state.alertText = text;
  state.alertTimer = 2;
}

// ───── Environment ─────
function buildEnvironment(scene: any) {
  const c = getColor();
  scene.add(new Mesh(new SphereGeometry(50, 16, 12), new MeshBasicMaterial({ color: 0x000811, side: 2 })));
  scene.add(new AmbientLight(0x222233, 0.4));
  const dirLight = new DirectionalLight(0xffffff, 0.6);
  dirLight.position.set(5, 10, -5);
  scene.add(dirLight);
  const p1 = new PointLight(c.primary, 1, 30);
  p1.position.set(0, 8, -10);
  scene.add(p1);
  scene.fog = new FogExp2(0x000811, 0.02);
  // Grid floor
  const gridSize = 80, gridDiv = 40;
  const gridVerts: number[] = [];
  for (let i = 0; i <= gridDiv; i++) {
    const t = (i / gridDiv) * gridSize - gridSize / 2;
    gridVerts.push(-gridSize / 2, 0, t, gridSize / 2, 0, t);
    gridVerts.push(t, 0, -gridSize / 2, t, 0, gridSize / 2);
  }
  const gridGeo = new BufferGeometry();
  gridGeo.setAttribute('position', new Float32BufferAttribute(gridVerts, 3));
  const grid = new LineSegments(gridGeo, new LineBasicMaterial({ color: c.primary, transparent: true, opacity: 0.1 }));
  scene.add(grid);
  gridLines.push(grid);
  // Pillars
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const radius = 20;
    const pillar = new Mesh(new CylinderGeometry(0.15, 0.15, 12, 6), new MeshStandardMaterial({ color: c.secondary, emissive: new Color(c.secondary), emissiveIntensity: 0.15 }));
    pillar.position.set(Math.cos(angle) * radius, 6, Math.sin(angle) * radius);
    scene.add(pillar);
    pillars.push(pillar);
    const cap = new Mesh(new SphereGeometry(0.2, 6, 4), new MeshBasicMaterial({ color: c.primary, transparent: true, opacity: 0.5 }));
    cap.position.set(Math.cos(angle) * radius, 12, Math.sin(angle) * radius);
    scene.add(cap);
  }
  // Stars
  for (let i = 0; i < 100; i++) {
    const s = new Mesh(new SphereGeometry(0.03 + Math.random() * 0.04, 4, 3), new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 + Math.random() * 0.5 }));
    s.position.set((Math.random() - 0.5) * 60, 5 + Math.random() * 15, (Math.random() - 0.5) * 60);
    scene.add(s);
    starField.push(s);
  }
  // Ambient floating orbs
  for (let i = 0; i < 20; i++) {
    const orb = new Mesh(new SphereGeometry(0.06, 6, 4), new MeshBasicMaterial({ color: c.primary, transparent: true, opacity: 0.3 }));
    orb.position.set((Math.random() - 0.5) * 30, 1 + Math.random() * 5, (Math.random() - 0.5) * 30);
    scene.add(orb);
    ambientOrbs.push(orb);
  }
}


// ───── Fortress Spawning (Enhanced) ─────
function spawnFortressSection() {
  const c = getColor();
  const z = fortressSpawnZ;
  const lvl = state.level;
  for (let row = 0; row < 8; row++) {
    const rowZ = z - row * 4;
    // Side walls
    const lw = createWall(-2, 1 + Math.random() * 2, 1.5);
    lw.position.z = rowZ;
    world.scene.add(lw);
    walls.push({ group: lw, z: rowZ, height: 1 + Math.random() * 2, lane: -2 });
    const rw = createWall(2, 1 + Math.random() * 2, 1.5);
    rw.position.z = rowZ;
    world.scene.add(rw);
    walls.push({ group: rw, z: rowZ, height: 1 + Math.random() * 2, lane: 2 });

    // Cross walls (some moving)
    if (Math.random() < 0.3 + lvl * 0.03) {
      const crossLane = Math.floor(Math.random() * 3) - 1;
      const crossH = 0.8 + Math.random() * 1.5;
      const cw = createWall(crossLane, crossH, 2);
      cw.position.z = rowZ - 2;
      world.scene.add(cw);
      const isMoving = Math.random() < 0.2 + lvl * 0.02;
      walls.push({ group: cw, z: rowZ - 2, height: crossH, lane: crossLane, moving: isMoving, baseHeight: crossH, moveSpeed: 0.5 + Math.random() * 0.5 });
    }

    // Electric barriers (new - replaces some cross walls)
    if (Math.random() < 0.12 + lvl * 0.015 && row > 1) {
      const barrierWidth = 4 + Math.random() * 2;
      const bg = createElectricBarrierMesh(barrierWidth);
      bg.position.set(0, 0, rowZ - 3);
      world.scene.add(bg);
      const onT = 1.5 + Math.random();
      const offT = 1 + Math.random() * 0.5;
      const boltMeshes: Mesh[] = [];
      // Create initial bolts
      for (let b = 0; b < 3; b++) {
        const bolt = createElectricBolt(barrierWidth, 4);
        bolt.position.set(0, 0, 0);
        bg.add(bolt);
        boltMeshes.push(bolt);
      }
      electricBarriers.push({ group: bg, z: rowZ - 3, active: true, timer: 0, onTime: onT, offTime: offT, boltMeshes });
    }

    // Ceiling beams (enhanced fortress visuals)
    if (Math.random() < 0.4) {
      const beam = createCeilingBeam(rowZ - 1, (Math.random() - 0.5) * 6);
      world.scene.add(beam);
      ceilingBeams.push({ mesh: beam, z: rowZ - 1 });
    }

    // Light strips on walls
    if (Math.random() < 0.5) {
      const side = Math.random() > 0.5 ? 1 : -1;
      const ls = createLightStrip(rowZ - 1.5, side);
      world.scene.add(ls);
      lightStrips.push({ mesh: ls, z: rowZ - 1.5, side });
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
    // Patrol drones in fortress
    if (Math.random() < 0.15 + lvl * 0.02) {
      const drone = createPatrolDroneMesh();
      const dx = (Math.random() - 0.5) * 4;
      const dy = 1.5 + Math.random() * 1.5;
      drone.position.set(dx, dy, rowZ - 2);
      world.scene.add(drone);
      patrolDrones.push({ group: drone, z: rowZ - 2, x: dx, y: dy, alive: true, hp: 2, cooldown: 2 + Math.random() * 2, patternAngle: Math.random() * Math.PI * 2, patternRadius: 0.8 + Math.random() * 0.5, centerX: dx, centerY: dy });
    }
    // Power-ups (now includes missile ammo)
    if (Math.random() < 0.14) {
      const pl = Math.floor(Math.random() * 3) - 1;
      const types: Array<'shield' | 'rapid' | 'fuel' | 'spread' | 'magnet' | 'missile' | 'weapon'> = ['shield', 'rapid', 'fuel', 'spread', 'magnet', 'missile', 'weapon'];
      const pt = types[Math.floor(Math.random() * types.length)];
      const pm = createPowerUpMesh(pt === 'weapon' ? 'missile' : pt);
      pm.position.set(pl * 2.5, 1.5, rowZ - 3);
      world.scene.add(pm);
      powerUps.push({ mesh: pm, z: rowZ - 3, lane: pl, type: pt as any, alive: true });
    }
    // Ground targets (hangars, radar dishes, fuel depots)
    if (Math.random() < 0.18 + lvl * 0.02) {
      const gtTypes: Array<'hangar' | 'radar' | 'depot'> = ['hangar', 'radar', 'depot'];
      const gtType = gtTypes[Math.floor(Math.random() * gtTypes.length)];
      const gtLane = Math.floor(Math.random() * 3) - 1;
      const gt = createGroundTargetMesh(gtType);
      gt.position.set(gtLane * 2.5, 0, rowZ - 2.5);
      world.scene.add(gt);
      const hp = gtType === 'hangar' ? 3 : gtType === 'depot' ? 2 : 1;
      groundTargets.push({ group: gt, z: rowZ - 2.5, lane: gtLane, alive: true, hp, maxHp: hp, type: gtType });
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
  // Mine layers in open sections (new enemy type)
  if (lvl >= 2 && Math.random() < 0.3 + lvl * 0.05) {
    const mineCount = 1 + Math.floor(lvl / 4);
    for (let i = 0; i < mineCount; i++) {
      const mx = (Math.random() - 0.5) * 6;
      const my = 0.5 + Math.random() * 2;
      const mz = z - 10 - Math.random() * 15;
      const mm = createMineMesh();
      mm.position.set(mx, my, mz);
      world.scene.add(mm);
      mines.push({ mesh: mm, z: mz, x: mx, y: my, alive: true, armTimer: 1.5, pulsePhase: Math.random() * Math.PI * 2 });
    }
  }
  // Power-ups
  if (Math.random() < 0.35) {
    const types: Array<'shield' | 'rapid' | 'fuel' | 'spread' | 'magnet' | 'missile'> = ['shield', 'rapid', 'fuel', 'spread', 'magnet', 'missile'];
    const pt = types[Math.floor(Math.random() * types.length)];
    const pm = createPowerUpMesh(pt);
    pm.position.set((Math.random() - 0.5) * 4, 1.5, z - 15);
    world.scene.add(pm);
    powerUps.push({ mesh: pm, z: z - 15, lane: 0, type: pt, alive: true });
  }
  // Formation attack (higher level)
  if (lvl >= 2 && Math.random() < 0.3 + lvl * 0.04) {
    spawnFormation(z - 20 - Math.random() * 10);
  }
  // Dive bombers (level 3+)
  if (lvl >= 3 && Math.random() < 0.25 + lvl * 0.03) {
    const dbCount = 1 + Math.floor(lvl / 5);
    for (let i = 0; i < dbCount; i++) {
      const dbg = createDiveBomberMesh();
      const dbx = (Math.random() - 0.5) * 6;
      const dby = 4 + Math.random() * 2;
      const dbz = z - 8 - i * 5 - Math.random() * 3;
      dbg.position.set(dbx, dby, dbz);
      world.scene.add(dbg);
      diveBombers.push({ group: dbg, z: dbz, x: dbx, y: dby, alive: true, hp: 2 + Math.floor(lvl / 4), phase: 'hover', diveTimer: 2 + Math.random() * 2, targetX: 0, targetY: 0 });
    }
  }
  // Asteroids (level 2+) — floating rocks in open space
  if (lvl >= 2 && Math.random() < 0.35 + lvl * 0.04) {
    const astCount = 2 + Math.floor(lvl / 3);
    for (let i = 0; i < astCount; i++) {
      const size = 0.3 + Math.random() * 0.5;
      const ag = createAsteroidMesh(size);
      const ax = (Math.random() - 0.5) * 8;
      const ay = 0.5 + Math.random() * 3;
      const az = z - 5 - i * 4 - Math.random() * 5;
      ag.position.set(ax, ay, az);
      world.scene.add(ag);
      asteroids.push({
        group: ag, z: az, x: ax, y: ay, alive: true,
        hp: Math.ceil(size * 3), size,
        rotSpeed: { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2, z: (Math.random() - 0.5) * 2 },
        vx: (Math.random() - 0.5) * 1.5, vy: 0,
      });
    }
  }
  // Cloaker enemies (level 4+) — stealth fighters that phase in/out
  if (lvl >= 4 && Math.random() < 0.2 + lvl * 0.03) {
    const clCount = 1 + Math.floor(lvl / 6);
    for (let i = 0; i < clCount; i++) {
      const cg = createCloakerMesh();
      const cx = (Math.random() - 0.5) * 7;
      const cy = 1.5 + Math.random() * 1.5;
      const cz = z - 6 - i * 6 - Math.random() * 4;
      cg.position.set(cx, cy, cz);
      world.scene.add(cg);
      cloakers.push({
        group: cg, z: cz, x: cx, y: cy, alive: true,
        hp: 2 + Math.floor(lvl / 5), cooldown: 3 + Math.random() * 2,
        cloakPhase: Math.random() * Math.PI * 2, visible_pct: 0, shimmerTimer: 0,
      });
    }
  }
  // Smart bomb power-up (rare, level 5+)
  if (lvl >= 5 && Math.random() < 0.12) {
    const bm = createPowerUpMesh('magnet'); // reuse mesh type but tinted
    bm.position.set((Math.random() - 0.5) * 4, 1.5, z - 22);
    // Tint to golden
    bm.children.forEach(child => {
      if ((child as Mesh).material && 'color' in (child as Mesh).material) {
        ((child as Mesh).material as MeshBasicMaterial).color.setHex(0xffaa00);
      }
    });
    world.scene.add(bm);
    powerUps.push({ mesh: bm, z: z - 22, lane: 0, type: 'magnet', alive: true }); // magnet gives score, smart bomb via 'b' key
  }
  // Gravity wells (level 5+) — swirling vortices that pull the player
  if (lvl >= 5 && Math.random() < 0.2 + lvl * 0.02) {
    const gwg = createGravityWellMesh();
    const gwx = (Math.random() - 0.5) * 6;
    const gwy = 1.0 + Math.random() * 1.5;
    const gwz = z - 12 - Math.random() * 8;
    gwg.position.set(gwx, gwy, gwz);
    world.scene.add(gwg);
    gravityWells.push({
      group: gwg, z: gwz, x: gwx, y: gwy, alive: true,
      hp: 5 + Math.floor(lvl / 3), pullRadius: 6, pullStrength: 4 + lvl * 0.3, rotSpeed: 2,
    });
  }
  // Wingman spawn every 5 levels
  if (lvl >= 5 && lvl % 5 === 0 && !state.wingmanActive) {
    spawnWingman();
  }
  // Score multiplier zone in open sections (level 3+) — use magnet power-up with score multiplier effect
  if (lvl >= 3 && Math.random() < 0.2) {
    const szm = createPowerUpMesh('spread');
    szm.position.set((Math.random() - 0.5) * 4, 1.5, z - 18);
    // Tint to golden-yellow for multiplier
    szm.children.forEach(child => {
      if ((child as Mesh).material && 'color' in (child as Mesh).material) {
        ((child as Mesh).material as MeshBasicMaterial).color.setHex(0xffff00);
      }
    });
    world.scene.add(szm);
    powerUps.push({ mesh: szm, z: z - 18, lane: 0, type: 'magnet', alive: true }); // magnet type gives score bonus + activates multiplier
  }
  fortressSpawnZ -= 30;
}

function spawnBoss() {
  if (boss && boss.alive) return;
  const bg = createBossShip();
  const bz = fortressSpawnZ - 15;
  bg.position.set(0, 2, bz);
  world.scene.add(bg);
  const hp = 10 + state.level * 5;
  const shieldMesh = createBossShieldMesh();
  bg.add(shieldMesh);
  boss = { group: bg, z: bz, x: 0, y: 2, alive: true, hp, maxHp: hp, cooldown: 2, phase: 0, shieldActive: state.level >= 3, shieldHp: 3 + Math.floor(state.level / 2), shieldMesh, phaseTimer: 0, spawnCooldown: 8 };
  if (!boss.shieldActive) shieldMesh.visible = false;
  audio.play('boss');
  spawnWarningArrow(0, bz);
  state.bossWarningShown = true;
  showAlert('WARNING: BOSS APPROACHING!');
  fortressSpawnZ -= 40;
}

// ───── Cleanup ─────
function cleanupBehind() {
  const limit = state.scrollZ + 15;
  for (let i = walls.length - 1; i >= 0; i--) {
    if (walls[i].z > limit) { world.scene.remove(walls[i].group); walls.splice(i, 1); }
  }
  for (let i = fuelTanks.length - 1; i >= 0; i--) {
    if (fuelTanks[i].z > limit) { world.scene.remove(fuelTanks[i].mesh); fuelTanks.splice(i, 1); }
  }
  for (let i = turrets.length - 1; i >= 0; i--) {
    if (turrets[i].z > limit) { world.scene.remove(turrets[i].group); turrets.splice(i, 1); }
  }
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (enemies[i].z > limit) { world.scene.remove(enemies[i].group); enemies.splice(i, 1); }
  }
  for (let i = powerUps.length - 1; i >= 0; i--) {
    if (powerUps[i].z > limit) { world.scene.remove(powerUps[i].mesh); powerUps.splice(i, 1); }
  }
  for (let i = patrolDrones.length - 1; i >= 0; i--) {
    if (patrolDrones[i].z > limit) { world.scene.remove(patrolDrones[i].group); patrolDrones.splice(i, 1); }
  }
  for (let i = mines.length - 1; i >= 0; i--) {
    if (mines[i].z > limit) { world.scene.remove(mines[i].mesh); mines.splice(i, 1); }
  }
  for (let i = electricBarriers.length - 1; i >= 0; i--) {
    if (electricBarriers[i].z > limit) { world.scene.remove(electricBarriers[i].group); electricBarriers.splice(i, 1); }
  }
  for (let i = ceilingBeams.length - 1; i >= 0; i--) {
    if (ceilingBeams[i].z > limit) { world.scene.remove(ceilingBeams[i].mesh); ceilingBeams.splice(i, 1); }
  }
  for (let i = lightStrips.length - 1; i >= 0; i--) {
    if (lightStrips[i].z > limit) { world.scene.remove(lightStrips[i].mesh); lightStrips.splice(i, 1); }
  }
  for (let i = groundTargets.length - 1; i >= 0; i--) {
    if (groundTargets[i].z > limit) { world.scene.remove(groundTargets[i].group); groundTargets.splice(i, 1); }
  }
  for (let i = checkpointMarkers.length - 1; i >= 0; i--) {
    if (checkpointMarkers[i].z > limit) { world.scene.remove(checkpointMarkers[i].group); checkpointMarkers.splice(i, 1); }
  }
  for (let i = diveBombers.length - 1; i >= 0; i--) {
    if (diveBombers[i].z > limit) { world.scene.remove(diveBombers[i].group); diveBombers.splice(i, 1); }
  }
  for (let i = asteroids.length - 1; i >= 0; i--) {
    if (asteroids[i].z > limit) { world.scene.remove(asteroids[i].group); asteroids.splice(i, 1); }
  }
  for (let i = cloakers.length - 1; i >= 0; i--) {
    if (cloakers[i].z > limit) { world.scene.remove(cloakers[i].group); cloakers.splice(i, 1); }
  }
  for (let i = gravityWells.length - 1; i >= 0; i--) {
    if (gravityWells[i].z > limit) { world.scene.remove(gravityWells[i].group); gravityWells.splice(i, 1); }
  }
  // Clean dead formations
  for (let i = formations.length - 1; i >= 0; i--) {
    const f = formations[i];
    f.alive = f.fighters.some(fighter => fighter.alive);
    if (!f.alive) {
      const allDead = f.fighters.every(fighter => !fighter.alive);
      if (allDead) state.formationsDestroyed++;
      formations.splice(i, 1);
    }
  }
}

// ───── Game Logic ─────
function resetGame() {
  state.score = 0; state.lives = getLives(); state.fuel = state.maxFuel;
  state.altitude = 1.5; state.targetAltitude = 1.5;
  state.scrollZ = 0; state.scrollSpeed = state.baseSpeed; state.level = 1;
  state.fortressSection = true; state.sectionTimer = 0;
  state.combo = 0; state.comboTimer = 0; state.maxCombo = 0;
  state.shieldTimer = 0; state.rapidTimer = 0; state.spreadShot = false; state.spreadTimer = 0;
  state.shootCooldown = 0; state.invincibleTimer = 0;
  state.speedTimer = 120; state.challengeMoves = 300;
  state.missileAmmo = 3; state.missileCooldown = 0;
  state.screenShakeTimer = 0; state.screenShakeIntensity = 0;
  state.bossWarningShown = false; state.totalMissilesUsed = 0;
  state.weaponLevel = 1; state.checkpoint = 0; state.lastCheckpointZ = 0;
  state.alertText = ''; state.alertTimer = 0;
  state.groundTargetsDestroyed = 0; state.formationsDestroyed = 0;
  state.bonusActive = false; state.bonusTimer = 0; state.diveBombersKilled = 0;
  state.smartBombs = 1; state.smartBombCooldown = 0; state.totalSmartBombs = 0;
  state.asteroidsDestroyed = 0; state.cloakersKilled = 0;
  state.sectorTheme = 0;
  state.killStreak = 0; state.scoreMultiplier = 1; state.scoreMultiplierTimer = 0;
  state.gravityWellsDestroyed = 0;
  state.wingmanActive = false; state.wingmanRespawnTimer = 0;
  applySectorTheme(0);
  playerX = 0;
  fortressSpawnZ = -20;
  // Clear all objects
  bullets.forEach(b => world.scene.remove(b.mesh)); bullets.length = 0;
  walls.forEach(w => world.scene.remove(w.group)); walls.length = 0;
  fuelTanks.forEach(f => world.scene.remove(f.mesh)); fuelTanks.length = 0;
  turrets.forEach(t => world.scene.remove(t.group)); turrets.length = 0;
  enemies.forEach(e => world.scene.remove(e.group)); enemies.length = 0;
  powerUps.forEach(p => world.scene.remove(p.mesh)); powerUps.length = 0;
  particles.forEach(p => world.scene.remove(p.mesh)); particles.length = 0;
  patrolDrones.forEach(d => world.scene.remove(d.group)); patrolDrones.length = 0;
  mines.forEach(m => world.scene.remove(m.mesh)); mines.length = 0;
  electricBarriers.forEach(b => world.scene.remove(b.group)); electricBarriers.length = 0;
  floatingScores.forEach(f => world.scene.remove(f.mesh)); floatingScores.length = 0;
  warningArrows.forEach(w => world.scene.remove(w.mesh)); warningArrows.length = 0;
  ceilingBeams.forEach(b => world.scene.remove(b.mesh)); ceilingBeams.length = 0;
  lightStrips.forEach(l => world.scene.remove(l.mesh)); lightStrips.length = 0;
  engineTrailParticles.forEach(p => world.scene.remove(p.mesh)); engineTrailParticles.length = 0;
  radarDots.forEach(d => world.scene.remove(d)); radarDots.length = 0;
  if (boss) { world.scene.remove(boss.group); boss = null; }
  groundTargets.forEach(g => world.scene.remove(g.group)); groundTargets.length = 0;
  checkpointMarkers.forEach(c => world.scene.remove(c.group)); checkpointMarkers.length = 0;
  diveBombers.forEach(d => world.scene.remove(d.group)); diveBombers.length = 0;
  asteroids.forEach(a => world.scene.remove(a.group)); asteroids.length = 0;
  cloakers.forEach(c => world.scene.remove(c.group)); cloakers.length = 0;
  gravityWells.forEach(g => world.scene.remove(g.group)); gravityWells.length = 0;
  if (wingman) { world.scene.remove(wingman.group); wingman = null; }
  formations.length = 0;
  spawnFortressSection();
  state.gamesPlayed++;
}

function addScore(pts: number) {
  const mult = Math.max(1, state.combo) * state.scoreMultiplier;
  state.score += Math.floor(pts * mult);
  if (state.score > state.highScore) state.highScore = state.score;
}

function addCombo() {
  state.combo++; state.comboTimer = 3;
  if (state.combo > state.maxCombo) state.maxCombo = state.combo;
  if (state.combo > state.bestCombo) state.bestCombo = state.combo;
  checkKillStreak();
}

function playerHit() {
  if (state.invincibleTimer > 0 || state.shieldTimer > 0) {
    if (state.shieldTimer > 0) { state.shieldTimer = 0; audio.play('shield_break'); }
    else audio.play('hit');
    return;
  }
  state.lives--;
  state.invincibleTimer = 2;
  if (state.weaponLevel > 1) state.weaponLevel--;
  state.killStreak = 0; // Reset kill streak on hit
  triggerScreenShake(0.3, 0.4);
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
  const spawnB = (offsetX: number, offsetAngle: number) => {
    const b = createBullet(c.primary);
    b.position.set(playerGroup.position.x + offsetX, playerGroup.position.y, playerGroup.position.z);
    world.scene.add(b);
    const speed = 25;
    bullets.push({ mesh: b, vx: Math.sin(offsetAngle) * speed, vy: 0, vz: -speed, life: 2 });
  };
  spawnB(0, 0);
  if (state.spreadShot || state.weaponLevel >= 3) { spawnB(-0.3, -0.1); spawnB(0.3, 0.1); }
  if (state.weaponLevel >= 2) { spawnB(-0.15, 0); spawnB(0.15, 0); }
}

function shootMissile() {
  if (state.missileCooldown > 0 || state.missileAmmo <= 0) return;
  state.missileAmmo--;
  state.missileCooldown = 1.0;
  state.totalMissilesUsed++;
  audio.play('missile');
  const m = createMissileMesh();
  m.position.set(playerGroup.position.x, playerGroup.position.y, playerGroup.position.z);
  world.scene.add(m);
  bullets.push({ mesh: m, vx: 0, vy: 0, vz: -30, life: 3, isMissile: true, damage: 5 });
  triggerScreenShake(0.1, 0.15);
  // Missile trail
  spawnParticles(playerGroup.position.x, playerGroup.position.y, playerGroup.position.z + 0.5, 0x44ffaa, 5);
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
    stats.totalMissiles = (stats.totalMissiles || 0) + state.totalMissilesUsed;
    stats.checkpointsReached = (stats.checkpointsReached || 0) + state.checkpointsReached;
    stats.groundTargetsDestroyed = (stats.groundTargetsDestroyed || 0) + state.groundTargetsDestroyed;
    stats.formationsDestroyed = (stats.formationsDestroyed || 0) + state.formationsDestroyed;
    stats.asteroidsDestroyed = (stats.asteroidsDestroyed || 0) + state.asteroidsDestroyed;
    stats.cloakersKilled = (stats.cloakersKilled || 0) + state.cloakersKilled;
    stats.totalSmartBombs = (stats.totalSmartBombs || 0) + state.totalSmartBombs;
    stats.bestStreak = Math.max(stats.bestStreak || 0, state.bestStreak);
    stats.gravityWellsDestroyed = (stats.gravityWellsDestroyed || 0) + state.gravityWellsDestroyed;
    stats.totalWingmanKills = (stats.totalWingmanKills || 0) + state.totalWingmanKills;
    localStorage.setItem('neon-fortress-stats', JSON.stringify(stats));
    state.highScore = stats.highScore;
  } catch {}
}

function loadStats() {
  try {
    const stored = localStorage.getItem('neon-fortress-stats');
    if (stored) { const s = JSON.parse(stored); state.highScore = s.highScore || 0; }
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
    buildEnvironment(world.scene);
    world.scene.background = new Color(0x000811);
    world.scene.environment = null;

    playerGroup = createPlayerShip();
    playerGroup.position.set(0, 1.5, 0);
    world.scene.add(playerGroup);

    // Shield bubble (hidden by default)
    shieldBubble = createShieldBubbleMesh();
    shieldBubble.visible = false;
    playerGroup.add(shieldBubble);

    playerShadow = createShadow();
    world.scene.add(playerShadow);

    altitudeIndicator = createAltitudeIndicator();
    altitudeIndicator.position.set(-6, 0, 0);
    world.scene.add(altitudeIndicator);

    // Radar display
    radarGroup = createRadar();
    radarGroup.rotation.x = -Math.PI / 2;
    radarGroup.position.set(5.5, 3.5, -4);
    radarGroup.rotation.z = Math.PI;
    world.scene.add(radarGroup);

    cameraGroup = new Group();
    world.scene.add(cameraGroup);

    world.camera.position.set(0, 15, 12);
    world.camera.lookAt(0, 0, -8);

    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      if (e.key === 'Escape' || e.key === 'p') {
        if (state.screen === 'playing') { state.screen = 'paused'; audio.stopMusic(); }
        else if (state.screen === 'paused') { state.screen = 'playing'; audio.startMusic(); }
      }
      if (e.key === 'b' && state.screen === 'playing') triggerSmartBomb();
    });
    window.addEventListener('keyup', (e) => { this.keys[e.key.toLowerCase()] = false; });

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
    this.updatePanelVisibility();
    if (state.screen === 'playing') {
      this.updateGameplay(delta);
      this.updateHUD();
    }
    this.updateParticles(delta);
    this.updateEngineTrail(delta);
    this.updateFloatingScores(delta);
    this.updateWarningArrows(delta);
    this.updateAmbient(time);
    this.updateCamera(delta);
    this.updateRadar();
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
    // Radar only during gameplay
    if (radarGroup) radarGroup.visible = state.screen === 'playing';
  }

  private updateGameplay(delta: number) {
    const dt = Math.min(delta, 0.05);

    // ── Input ──
    let moveX = 0, moveAlt = 0, shoot = false, fireMissile = false;
    if (this.keys['a'] || this.keys['arrowleft']) moveX = -1;
    if (this.keys['d'] || this.keys['arrowright']) moveX = 1;
    if (this.keys['w'] || this.keys['arrowup']) moveAlt = 1;
    if (this.keys['s'] || this.keys['arrowdown']) moveAlt = -1;
    if (this.keys[' '] || this.keys['e'] || this.keys['k']) shoot = true;
    if (this.keys['q'] || this.keys['f']) fireMissile = true;

    // XR controllers
    const right = world.input.xr.gamepads.right;
    const left = world.input.xr.gamepads.left;
    if (right) {
      const stick = right.getAxesValues(InputComponent.Thumbstick);
      if (stick && Math.abs(stick.x) > 0.2) moveX = stick.x;
      if (right.getButtonPressed(InputComponent.Trigger)) shoot = true;
      if (right.getButtonPressed(InputComponent.Squeeze)) fireMissile = true;
      if (right.getButtonPressed(InputComponent.A_Button)) triggerSmartBomb();
    }
    if (left) {
      const stick = left.getAxesValues(InputComponent.Thumbstick);
      if (stick && Math.abs(stick.y) > 0.2) moveAlt = -stick.y;
      if (left.getButtonPressed(InputComponent.Trigger)) fireMissile = true;
    }

    // Move player
    const lateralSpeed = 6;
    playerX += moveX * lateralSpeed * dt;
    playerX = Math.max(-5, Math.min(5, playerX));
    playerGroup.position.x = playerX;

    // Altitude
    state.targetAltitude += moveAlt * 3 * dt;
    state.targetAltitude = Math.max(0.3, Math.min(3.5, state.targetAltitude));
    state.altitude += (state.targetAltitude - state.altitude) * 5 * dt;
    playerGroup.position.y = state.altitude;

    playerGroup.rotation.z = -moveX * 0.3;
    playerGroup.rotation.x = moveAlt * 0.15;

    // Shadow
    playerShadow.position.set(playerX, 0.01, playerGroup.position.z);
    const shadowScale = 1 - (state.altitude - 0.3) / 3.5 * 0.5;
    playerShadow.scale.set(shadowScale, shadowScale, 1);
    (playerShadow.material as MeshBasicMaterial).opacity = 0.4 * shadowScale;

    // Shield bubble visual
    shieldBubble.visible = state.shieldTimer > 0;
    if (state.shieldTimer > 0) {
      const pulse = 1 + Math.sin(this.time * 8) * 0.05;
      shieldBubble.scale.setScalar(pulse);
      (shieldBubble.material as MeshBasicMaterial).opacity = 0.15 + Math.sin(this.time * 4) * 0.05;
    }

    // Shoot & Missile
    if (shoot) shootBullet();
    if (fireMissile) shootMissile();
    state.shootCooldown = Math.max(0, state.shootCooldown - dt);
    state.missileCooldown = Math.max(0, state.missileCooldown - dt);

    // Engine trail
    engineTrailTimer += dt;
    if (engineTrailTimer > 0.03) {
      engineTrailTimer = 0;
      spawnEngineTrail();
    }

    // Scroll
    state.scrollZ -= state.scrollSpeed * dt;
    state.totalDistance += state.scrollSpeed * dt;

    // Fuel
    const fuelRate = 3 * getDiffMult();
    state.fuel -= fuelRate * dt;
    if (state.fuel <= 20 && state.fuel + fuelRate * dt > 20) showAlert('FUEL LOW!');
    if (state.fuel <= 0) { state.fuel = 0; playerHit(); }

    // Timers
    if (state.comboTimer > 0) { state.comboTimer -= dt; if (state.comboTimer <= 0) state.combo = 0; }
    if (state.shieldTimer > 0) state.shieldTimer -= dt;
    if (state.rapidTimer > 0) state.rapidTimer -= dt;
    if (state.spreadTimer > 0) { state.spreadTimer -= dt; if (state.spreadTimer <= 0) state.spreadShot = false; }
    if (state.invincibleTimer > 0) state.invincibleTimer -= dt;
    if (state.screenShakeTimer > 0) state.screenShakeTimer -= dt;
    if (state.smartBombCooldown > 0) state.smartBombCooldown -= dt;

    // Music tension near boss
    if (boss && boss.alive) {
      const bDist = Math.abs(boss.group.position.z - playerGroup.position.z);
      audio.setTension(Math.max(0, 1 - bDist / 30));
    } else {
      audio.setTension(0);
    }

    // Speed mode timer
    if (state.mode === 'speed') {
      state.speedTimer -= dt;
      if (state.speedTimer <= 0) { state.screen = 'results'; audio.stopMusic(); saveStats(); return; }
    }

    // Section management
    state.sectionTimer += dt;
    if (state.sectionTimer > 12) {
      state.sectionTimer = 0;
      state.fortressSection = !state.fortressSection;
      if (state.fortressSection) spawnFortressSection();
      else spawnOpenSection();
      if (!state.fortressSection && state.level % 3 === 0) spawnBoss();
    }
    const newLevel = Math.floor(-state.scrollZ / 200) + 1;
    if (newLevel > state.level) {
      state.level = newLevel;
      state.scrollSpeed = state.baseSpeed + state.level * 0.3;
      // Sector theme changes every 3 levels
      const newSector = Math.floor((state.level - 1) / 3) % SECTOR_THEMES.length;
      if (newSector !== state.sectorTheme) {
        state.sectorTheme = newSector;
        applySectorTheme(newSector);
        const theme = SECTOR_THEMES[newSector];
        showAlert(`ENTERING ${theme.name} SECTOR!`);
        audio.play('sector');
      } else {
        showAlert(`LEVEL ${state.level}! SPEED INCREASING!`);
      }
    }
    if (fortressSpawnZ > state.scrollZ - 80) {
      if (state.fortressSection) spawnFortressSection();
      else spawnOpenSection();
    }

    // ── Update bullets ──
    this.updateBullets(dt);
    // ── Update turrets ──
    this.updateTurrets(dt);
    // ── Update enemies ──
    this.updateEnemies(dt);
    // ── Update walls ──
    this.updateWalls(dt);
    // ── Update fuel tanks ──
    this.updateFuelTanks(dt);
    // ── Update power-ups ──
    this.updatePowerUps(dt);
    // ── Update boss ──
    this.updateBoss(dt);
    // ── Update patrol drones ──
    this.updatePatrolDrones(dt);
    // ── Update mines ──
    this.updateMines(dt);
    // ── Update electric barriers ──
    this.updateElectricBarriers(dt);
    // ── Update fortress visuals ──
    this.updateFortressVisuals(dt);
    // ── Update ground targets ──
    this.updateGroundTargets(dt);
    // ── Update formations ──
    this.updateFormations(dt);
    // ── Update checkpoints ──
    this.updateCheckpoints(dt);
    // ── Update dive bombers ──
    this.updateDiveBombers(dt);
    // ── Update asteroids ──
    this.updateAsteroids(dt);
    // ── Update cloakers ──
    this.updateCloakers(dt);
    // ── Update gravity wells ──
    this.updateGravityWells(dt);
    // ── Update wingman ──
    this.updateWingman(dt);
    // ── Update score multiplier ──
    if (state.scoreMultiplierTimer > 0) { state.scoreMultiplierTimer -= dt; if (state.scoreMultiplierTimer <= 0) { state.scoreMultiplier = 1; } }
    // ── Update bonus corridor ──
    this.updateBonusCorridor(dt);
    // ── Alert timer ──
    if (state.alertTimer > 0) state.alertTimer -= dt;
    // Cleanup
    cleanupBehind();
  }

  private updateBullets(dt: number) {
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.mesh.position.x += b.vx * dt;
      b.mesh.position.y += b.vy * dt;
      b.mesh.position.z += b.vz * dt;
      b.life -= dt;
      if (b.life <= 0) { world.scene.remove(b.mesh); bullets.splice(i, 1); continue; }

      if (!b.isEnemy) {
        const dmg = b.damage || 1;
        let hit = false;

        // vs turrets
        for (const t of turrets) {
          if (!t.alive || hit) continue;
          if (Math.abs(b.mesh.position.x - t.group.position.x) < 0.5 && Math.abs(b.mesh.position.z - t.z + state.scrollZ) < 0.5) {
            t.hp -= dmg;
            if (t.hp <= 0) {
              t.alive = false; t.group.visible = false;
              addScore(200); addCombo(); state.totalKills++;
              spawnParticles(t.group.position.x, 0.3, t.group.position.z, getColor().accent, 12);
              spawnFloatingScore(t.group.position.x, 0.8, t.group.position.z, 200);
              audio.play('explode');
              if (b.isMissile) triggerScreenShake(0.2, 0.25);
            } else audio.play('hit');
            hit = true;
          }
        }

        // vs enemies
        if (!hit) for (const e of enemies) {
          if (!e.alive || hit) continue;
          if (Math.abs(b.mesh.position.x - e.group.position.x) < 0.6 && Math.abs(b.mesh.position.y - e.group.position.y) < 0.6 && Math.abs(b.mesh.position.z - e.group.position.z) < 0.6) {
            e.hp -= dmg;
            if (e.hp <= 0) {
              e.alive = false; e.group.visible = false;
              addScore(300); addCombo(); state.totalKills++;
              spawnParticles(e.group.position.x, e.group.position.y, e.group.position.z, 0xff4400, 15);
              spawnFloatingScore(e.group.position.x, e.group.position.y + 0.5, e.group.position.z, 300);
              audio.play('explode');
              if (b.isMissile) triggerScreenShake(0.2, 0.25);
            } else audio.play('hit');
            hit = true;
          }
        }

        // vs patrol drones
        if (!hit) for (const d of patrolDrones) {
          if (!d.alive || hit) continue;
          if (Math.abs(b.mesh.position.x - d.group.position.x) < 0.5 && Math.abs(b.mesh.position.y - d.group.position.y) < 0.5 && Math.abs(b.mesh.position.z - d.group.position.z) < 0.5) {
            d.hp -= dmg;
            if (d.hp <= 0) {
              d.alive = false; d.group.visible = false;
              addScore(400); addCombo(); state.totalKills++;
              spawnParticles(d.group.position.x, d.group.position.y, d.group.position.z, 0xffaa00, 15);
              spawnFloatingScore(d.group.position.x, d.group.position.y + 0.5, d.group.position.z, 400);
              audio.play('explode');
            } else audio.play('hit');
            hit = true;
          }
        }

        // vs mines
        if (!hit) for (const m of mines) {
          if (!m.alive || hit) continue;
          if (Math.abs(b.mesh.position.x - m.mesh.position.x) < 0.3 && Math.abs(b.mesh.position.y - m.mesh.position.y) < 0.3 && Math.abs(b.mesh.position.z - m.mesh.position.z) < 0.3) {
            m.alive = false; m.mesh.visible = false;
            addScore(150); state.totalKills++;
            spawnParticles(m.mesh.position.x, m.mesh.position.y, m.mesh.position.z, 0xff4400, 10);
            spawnFloatingScore(m.mesh.position.x, m.mesh.position.y + 0.3, m.mesh.position.z, 150);
            audio.play('mine');
            hit = true;
          }
        }

        // vs dive bombers
        if (!hit) for (const db of diveBombers) {
          if (!db.alive || hit) continue;
          if (Math.abs(b.mesh.position.x - db.group.position.x) < 0.5 && Math.abs(b.mesh.position.y - db.group.position.y) < 0.5 && Math.abs(b.mesh.position.z - db.group.position.z) < 0.5) {
            db.hp -= dmg;
            if (db.hp <= 0) {
              db.alive = false; db.group.visible = false;
              addScore(500); addCombo(); state.totalKills++; state.diveBombersKilled++;
              spawnParticles(db.group.position.x, db.group.position.y, db.group.position.z, 0xff0066, 18);
              spawnFloatingScore(db.group.position.x, db.group.position.y + 0.5, db.group.position.z, 500);
              audio.play('explode');
              if (b.isMissile) triggerScreenShake(0.2, 0.25);
            } else audio.play('hit');
            hit = true;
          }
        }

        // vs asteroids
        if (!hit) for (const ast of asteroids) {
          if (!ast.alive || hit) continue;
          const dist = Math.sqrt(
            Math.pow(b.mesh.position.x - ast.group.position.x, 2) +
            Math.pow(b.mesh.position.y - ast.group.position.y, 2) +
            Math.pow(b.mesh.position.z - ast.group.position.z, 2)
          );
          if (dist < ast.size + 0.3) {
            ast.hp -= dmg;
            if (ast.hp <= 0) {
              ast.alive = false; ast.group.visible = false;
              const pts = Math.ceil(ast.size * 300);
              addScore(pts); addCombo(); state.totalKills++; state.asteroidsDestroyed++;
              spawnParticles(ast.group.position.x, ast.group.position.y, ast.group.position.z, 0x8888aa, 15);
              spawnFloatingScore(ast.group.position.x, ast.group.position.y + 0.5, ast.group.position.z, pts);
              audio.play('rock_break');
              if (b.isMissile) triggerScreenShake(0.2, 0.25);
            } else audio.play('hit');
            hit = true;
          }
        }

        // vs cloakers (only hittable when visible)
        if (!hit) for (const cl of cloakers) {
          if (!cl.alive || hit || cl.visible_pct < 0.2) continue;
          if (Math.abs(b.mesh.position.x - cl.group.position.x) < 0.6 && Math.abs(b.mesh.position.y - cl.group.position.y) < 0.4 && Math.abs(b.mesh.position.z - cl.group.position.z) < 0.6) {
            cl.hp -= dmg;
            if (cl.hp <= 0) {
              cl.alive = false; cl.group.visible = false;
              addScore(600); addCombo(); state.totalKills++; state.cloakersKilled++;
              spawnParticles(cl.group.position.x, cl.group.position.y, cl.group.position.z, 0x4488ff, 18);
              spawnFloatingScore(cl.group.position.x, cl.group.position.y + 0.5, cl.group.position.z, 600);
              audio.play('explode');
            } else audio.play('hit');
            hit = true;
          }
        }

        // vs gravity wells
        if (!hit) for (const gw of gravityWells) {
          if (!gw.alive || hit) continue;
          const dist = Math.sqrt(
            Math.pow(b.mesh.position.x - gw.group.position.x, 2) +
            Math.pow(b.mesh.position.y - gw.group.position.y, 2) +
            Math.pow(b.mesh.position.z - gw.group.position.z, 2)
          );
          if (dist < 1.2) {
            gw.hp -= (b.damage || 1);
            if (gw.hp <= 0) {
              gw.alive = false; gw.group.visible = false;
              addScore(800); addCombo(); state.totalKills++; state.gravityWellsDestroyed++;
              spawnParticles(gw.group.position.x, gw.group.position.y, gw.group.position.z, 0x8800ff, 25);
              spawnFloatingScore(gw.group.position.x, gw.group.position.y + 0.5, gw.group.position.z, 800);
              audio.play('explode');
              triggerScreenShake(0.3, 0.35);
              showAlert('GRAVITY WELL DESTROYED!');
            } else { audio.play('hit'); audio.play('gravity'); }
            hit = true;
          }
        }

        // vs ground targets
        if (!hit) for (const gt of groundTargets) {
          if (!gt.alive || hit) continue;
          const gtWorldZ = gt.z - state.scrollZ;
          if (Math.abs(b.mesh.position.x - gt.group.position.x) < 0.7 && Math.abs(b.mesh.position.z - gtWorldZ) < 0.5 && b.mesh.position.y < 1.0) {
            gt.hp -= dmg;
            if (gt.hp <= 0) {
              gt.alive = false; gt.group.visible = false;
              const pts = gt.type === 'hangar' ? 500 : gt.type === 'depot' ? 400 : 300;
              addScore(pts); addCombo(); state.totalKills++; state.groundTargetsDestroyed++;
              spawnParticles(gt.group.position.x, 0.4, gt.group.position.z, gt.type === 'depot' ? 0xff8800 : 0x888888, 18);
              spawnFloatingScore(gt.group.position.x, 1, gt.group.position.z, pts);
              audio.play('explode');
              if (b.isMissile) triggerScreenShake(0.3, 0.3);
              if (gt.type === 'depot') showAlert('DEPOT DESTROYED!');
            } else audio.play('hit');
            hit = true;
          }
        }

        // vs fuel tanks
        if (!hit) for (const f of fuelTanks) {
          if (!f.alive || hit) continue;
          if (Math.abs(b.mesh.position.x - f.mesh.position.x) < 0.5 && Math.abs(b.mesh.position.z - (f.z - state.scrollZ)) < 0.5 && b.mesh.position.y < 0.8) {
            f.alive = false; f.mesh.visible = false;
            state.fuel = Math.min(state.maxFuel, state.fuel + 25);
            state.totalFuelCollected++;
            addScore(100);
            spawnParticles(f.mesh.position.x, 0.4, f.mesh.position.z, 0xff8800, 10);
            spawnFloatingScore(f.mesh.position.x, 0.9, f.mesh.position.z, 100);
            audio.play('fuel');
            hit = true;
          }
        }

        // vs boss
        if (!hit && boss && boss.alive) {
          const dx = b.mesh.position.x - boss.group.position.x;
          const dy = b.mesh.position.y - boss.group.position.y;
          const dz = b.mesh.position.z - boss.group.position.z;
          if (Math.abs(dx) < 1.8 && Math.abs(dy) < 0.5 && Math.abs(dz) < 1.2) {
            if (boss.shieldActive && boss.shieldHp > 0) {
              boss.shieldHp -= dmg;
              audio.play('hit');
              if (boss.shieldHp <= 0) {
                boss.shieldActive = false;
                if (boss.shieldMesh) boss.shieldMesh.visible = false;
                audio.play('shield_break');
                spawnParticles(boss.group.position.x, boss.group.position.y, boss.group.position.z, 0x4444ff, 20);
              }
            } else {
              boss.hp -= dmg;
              audio.play('hit');
              if (boss.hp <= 0) {
                boss.alive = false; boss.group.visible = false;
                addScore(2000); state.bossesDefeated++;
                spawnParticles(boss.group.position.x, boss.group.position.y, boss.group.position.z, 0xff0000, 30);
                spawnFloatingScore(boss.group.position.x, boss.group.position.y + 1, boss.group.position.z, 2000);
                audio.play('explode');
                triggerScreenShake(0.5, 0.6);
                // Chain explosions from boss
                for (let chain = 0; chain < 4; chain++) {
                  setTimeout(() => {
                    if (boss && !boss.alive) {
                      const cx = boss.group.position.x + (Math.random() - 0.5) * 3;
                      const cy = boss.group.position.y + (Math.random() - 0.5) * 1;
                      const cz = boss.group.position.z + (Math.random() - 0.5) * 2;
                      spawnParticles(cx, cy, cz, 0xff4400, 8);
                    }
                  }, chain * 150);
                }
                // Trigger bonus corridor
                state.bonusActive = true;
                state.bonusTimer = 8;
                audio.play('bonus');
                showAlert('BONUS CORRIDOR! COLLECT EVERYTHING!');
              }
            }
            hit = true;
          }
        }

        if (hit) { world.scene.remove(b.mesh); bullets.splice(i, 1); }
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
  }

  private updateTurrets(dt: number) {
    for (const t of turrets) {
      if (!t.alive) continue;
      t.group.position.z = t.z - state.scrollZ;
      t.cooldown -= dt;
      if (t.cooldown <= 0 && t.group.position.z > -20 && t.group.position.z < 10) {
        t.cooldown = 2 / getDiffMult();
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
  }

  private updateEnemies(dt: number) {
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
          const b = createBullet(0xff2200, true);
          b.position.set(e.group.position.x, e.group.position.y, e.group.position.z);
          world.scene.add(b);
          bullets.push({ mesh: b, vx: (dx / dist) * 10, vy: (dy / dist) * 10, vz: (dz / dist) * 10, life: 3, isEnemy: true });
        }
      }
      // Collision
      if (Math.abs(playerGroup.position.x - e.group.position.x) < 0.6 && Math.abs(playerGroup.position.y - e.group.position.y) < 0.4 && Math.abs(playerGroup.position.z - e.group.position.z) < 0.6) {
        e.alive = false; e.group.visible = false;
        playerHit();
        spawnParticles(e.group.position.x, e.group.position.y, e.group.position.z, 0xff4400, 12);
        audio.play('explode');
      }
    }
  }

  private updatePatrolDrones(dt: number) {
    for (const d of patrolDrones) {
      if (!d.alive) continue;
      d.group.position.z = d.z - state.scrollZ;
      // Circular patrol pattern
      d.patternAngle += dt * 1.5;
      d.group.position.x = d.centerX + Math.cos(d.patternAngle) * d.patternRadius;
      d.group.position.y = d.centerY + Math.sin(d.patternAngle * 0.7) * 0.3;
      // Rotate drone body
      d.group.rotation.y += dt * 4;
      d.cooldown -= dt;
      if (d.cooldown <= 0 && d.group.position.z > -20 && d.group.position.z < 10) {
        d.cooldown = 2 / getDiffMult();
        const dx = playerGroup.position.x - d.group.position.x;
        const dy = playerGroup.position.y - d.group.position.y;
        const dz = playerGroup.position.z - d.group.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist > 0.1) {
          // Burst fire - 2 shots
          for (let s = 0; s < 2; s++) {
            const b = createBullet(0xffaa00, true);
            b.position.set(d.group.position.x, d.group.position.y, d.group.position.z);
            world.scene.add(b);
            const spread = (s - 0.5) * 0.15;
            const speed = 9;
            bullets.push({ mesh: b, vx: (dx / dist) * speed + spread, vy: (dy / dist) * speed, vz: (dz / dist) * speed, life: 2.5, isEnemy: true });
          }
          audio.play('turret');
        }
      }
      // Collision
      if (Math.abs(playerGroup.position.x - d.group.position.x) < 0.5 && Math.abs(playerGroup.position.y - d.group.position.y) < 0.5 && Math.abs(playerGroup.position.z - d.group.position.z) < 0.5) {
        d.alive = false; d.group.visible = false;
        playerHit();
        spawnParticles(d.group.position.x, d.group.position.y, d.group.position.z, 0xffaa00, 12);
        audio.play('explode');
      }
    }
  }

  private updateMines(dt: number) {
    for (const m of mines) {
      if (!m.alive) continue;
      m.mesh.position.z = m.z - state.scrollZ;
      m.mesh.position.x = m.x;
      m.mesh.position.y = m.y;
      // Arm timer
      if (m.armTimer > 0) { m.armTimer -= dt; continue; }
      // Pulse animation
      m.pulsePhase += dt * 3;
      const pulse = 1 + Math.sin(m.pulsePhase) * 0.15;
      m.mesh.scale.setScalar(pulse);
      // Proximity detection
      const dx = playerGroup.position.x - m.mesh.position.x;
      const dy = playerGroup.position.y - m.mesh.position.y;
      const dz = playerGroup.position.z - m.mesh.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < 1.2) {
        // Mine explodes
        m.alive = false; m.mesh.visible = false;
        spawnParticles(m.mesh.position.x, m.mesh.position.y, m.mesh.position.z, 0xff4400, 20);
        audio.play('mine');
        triggerScreenShake(0.25, 0.3);
        if (dist < 0.8) playerHit();
      }
    }
  }

  private updateElectricBarriers(dt: number) {
    for (const eb of electricBarriers) {
      eb.group.position.z = eb.z - state.scrollZ;
      eb.timer += dt;
      const cycleTime = eb.onTime + eb.offTime;
      const phase = eb.timer % cycleTime;
      const wasActive = eb.active;
      eb.active = phase < eb.onTime;

      // Toggle bolt visibility
      eb.boltMeshes.forEach(bolt => { bolt.visible = eb.active; });

      // Regenerate bolts periodically when active
      if (eb.active && Math.random() < dt * 8) {
        eb.boltMeshes.forEach(bolt => {
          const parent = bolt.parent;
          if (parent) {
            parent.remove(bolt);
            const newBolt = createElectricBolt(4, 4);
            parent.add(newBolt);
            eb.boltMeshes[eb.boltMeshes.indexOf(bolt)] = newBolt;
          }
        });
      }

      // Player collision when active
      if (eb.active && eb.group.position.z > -5 && eb.group.position.z < 5) {
        const dz = Math.abs(playerGroup.position.z - eb.group.position.z);
        if (dz < 0.5) {
          playerHit();
          audio.play('electric');
        }
      }
    }
  }

  private updateWalls(dt: number) {
    for (const w of walls) {
      w.group.position.z = w.z - state.scrollZ;
      // Moving walls
      if (w.moving && w.baseHeight !== undefined && w.moveSpeed) {
        const newH = w.baseHeight + Math.sin(this.time * w.moveSpeed) * 0.8;
        w.height = Math.max(0.3, newH);
        // Scale the wall mesh
        const meshes = w.group.children;
        if (meshes.length > 0) {
          const scale = w.height / (w.baseHeight || 1);
          meshes[0].scale.y = scale;
          meshes[0].position.y = w.height / 2;
        }
      }
      // Player collision
      const wPos = w.group.position;
      if (Math.abs(playerGroup.position.x - wPos.x) < 1.2 && Math.abs(playerGroup.position.z - wPos.z) < 0.4 && state.altitude < w.height) {
        playerHit();
      }
    }
    state.totalWallsDodged++;
  }

  private updateFuelTanks(dt: number) {
    for (const f of fuelTanks) {
      if (!f.alive) continue;
      f.mesh.position.z = f.z - state.scrollZ;
    }
  }

  private updatePowerUps(dt: number) {
    for (const p of powerUps) {
      if (!p.alive) continue;
      p.mesh.position.z = p.z - state.scrollZ;
      p.mesh.rotation.y += dt * 2;
      const dx = playerGroup.position.x - p.mesh.position.x;
      const dy = playerGroup.position.y - p.mesh.position.y;
      const dz = playerGroup.position.z - p.mesh.position.z;
      if (Math.abs(dx) < 0.6 && Math.abs(dy) < 0.6 && Math.abs(dz) < 0.6) {
        p.alive = false; p.mesh.visible = false;
        state.totalPowerups++;
        audio.play('powerup');
        if (p.type === 'shield') state.shieldTimer = 10;
        else if (p.type === 'rapid') state.rapidTimer = 8;
        else if (p.type === 'fuel') state.fuel = Math.min(state.maxFuel, state.fuel + 40);
        else if (p.type === 'spread') { state.spreadShot = true; state.spreadTimer = 10; }
        else if (p.type === 'magnet') { addScore(500); state.scoreMultiplier = 2; state.scoreMultiplierTimer = 5; audio.play('multiplier'); showAlert('2x SCORE MULTIPLIER!'); }
        else if (p.type === 'missile') { state.missileAmmo = Math.min(9, state.missileAmmo + 3); }
        else if (p.type === 'weapon') {
          if (state.weaponLevel < 3) {
            state.weaponLevel++;
            showAlert(`WEAPON LEVEL ${state.weaponLevel}!`);
          } else {
            addScore(500);
          }
        }
      }
    }
  }

  private updateBoss(dt: number) {
    if (!boss || !boss.alive) return;
    boss.group.position.z = boss.z - state.scrollZ;
    boss.phaseTimer += dt;

    // Boss phases based on HP percentage
    const hpPct = boss.hp / boss.maxHp;
    const newPhase = hpPct > 0.7 ? 0 : hpPct > 0.3 ? 1 : 2;
    if (newPhase !== boss.phase) {
      boss.phase = newPhase;
      // Phase transitions
      if (newPhase === 1) {
        // Re-activate shield if level >= 4
        if (state.level >= 4 && !boss.shieldActive) {
          boss.shieldActive = true;
          boss.shieldHp = 2;
          if (boss.shieldMesh) boss.shieldMesh.visible = true;
          audio.play('alert');
        }
      }
    }

    // Movement patterns per phase
    if (boss.phase === 0) {
      // Slow drift
      boss.group.position.x = boss.x + Math.sin(this.time * 1.5) * 3;
      boss.group.position.y = boss.y + Math.sin(this.time * 2.5) * 0.5;
    } else if (boss.phase === 1) {
      // Aggressive swooping
      boss.group.position.x = boss.x + Math.sin(this.time * 2.5) * 4;
      boss.group.position.y = boss.y + Math.sin(this.time * 3) * 1;
    } else {
      // Desperate erratic movement
      boss.group.position.x = boss.x + Math.sin(this.time * 3.5) * 5;
      boss.group.position.y = boss.y + Math.cos(this.time * 4) * 1.2;
    }

    // Shield visual pulse
    if (boss.shieldActive && boss.shieldMesh) {
      const p = 1 + Math.sin(this.time * 6) * 0.05;
      boss.shieldMesh.scale.setScalar(p);
      (boss.shieldMesh.material as MeshBasicMaterial).opacity = 0.1 + Math.sin(this.time * 3) * 0.05;
    }

    // Firing
    boss.cooldown -= dt;
    if (boss.cooldown <= 0 && boss.group.position.z > -25 && boss.group.position.z < 15) {
      boss.cooldown = (boss.phase === 2 ? 0.8 : 1.5) / getDiffMult();
      // Different attack patterns per phase
      const shotCount = boss.phase === 0 ? 3 : boss.phase === 1 ? 5 : 7;
      const spreadAngle = boss.phase === 0 ? 0.15 : boss.phase === 1 ? 0.2 : 0.3;
      for (let a = 0; a < shotCount; a++) {
        const offset = (a - (shotCount - 1) / 2) * spreadAngle;
        const b = createBullet(0xff0000, true);
        b.position.set(boss.group.position.x + Math.sin(offset) * 1.5, boss.group.position.y, boss.group.position.z);
        world.scene.add(b);
        const dx = playerGroup.position.x - b.position.x;
        const dy = playerGroup.position.y - b.position.y;
        const dz = playerGroup.position.z - b.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const speed = boss.phase === 2 ? 15 : 12;
        bullets.push({ mesh: b, vx: dist > 0.1 ? (dx / dist) * speed + Math.sin(offset) * 3 : 0, vy: dist > 0.1 ? (dy / dist) * speed : 0, vz: dist > 0.1 ? (dz / dist) * speed : speed, life: 4, isEnemy: true });
      }
      audio.play('turret');
    }

    // Spawn adds in phase 2
    if (boss.phase >= 1) {
      boss.spawnCooldown -= dt;
      if (boss.spawnCooldown <= 0) {
        boss.spawnCooldown = boss.phase === 2 ? 6 : 10;
        // Spawn patrol drone
        const drone = createPatrolDroneMesh();
        const dx = boss.group.position.x + (Math.random() - 0.5) * 3;
        const dy = boss.group.position.y + (Math.random() - 0.5);
        drone.position.set(dx, dy, boss.group.position.z);
        world.scene.add(drone);
        patrolDrones.push({ group: drone, z: boss.z, x: dx, y: dy, alive: true, hp: 1, cooldown: 2, patternAngle: Math.random() * Math.PI * 2, patternRadius: 1, centerX: dx, centerY: dy });
        audio.play('alert');
      }
    }

    // Boss collision
    const dx = playerGroup.position.x - boss.group.position.x;
    const dy = playerGroup.position.y - boss.group.position.y;
    const dz = playerGroup.position.z - boss.group.position.z;
    if (Math.abs(dx) < 1.5 && Math.abs(dy) < 0.5 && Math.abs(dz) < 1.0) playerHit();
  }

  private updateGroundTargets(dt: number) {
    for (const gt of groundTargets) {
      if (!gt.alive) continue;
      gt.group.position.z = gt.z - state.scrollZ;
      // Radar dish rotation for radar type
      if (gt.type === 'radar') {
        gt.group.children.forEach((child, idx) => {
          if (idx === 1) child.rotation.y += dt * 2; // rotate dish
        });
      }
      // Hit indicator - pulse when damaged
      if (gt.hp < gt.maxHp) {
        const dmgPct = gt.hp / gt.maxHp;
        gt.group.children.forEach(child => {
          if ((child as Mesh).material && 'emissiveIntensity' in (child as Mesh).material) {
            ((child as Mesh).material as MeshStandardMaterial).emissiveIntensity = 0.2 + (1 - dmgPct) * 0.5 * (0.5 + Math.sin(this.time * 8) * 0.5);
          }
        });
      }
    }
  }

  private updateFormations(dt: number) {
    for (const f of formations) {
      if (!f.alive) continue;
      // Check if all dead for bonus
      const aliveCount = f.fighters.filter(fighter => fighter.alive).length;
      if (aliveCount === 0 && f.alive) {
        f.alive = false;
        addScore(1000);
        showAlert('FORMATION ELIMINATED! +1000');
      }
    }
  }

  private updateCheckpoints(dt: number) {
    // Spawn checkpoint markers every 200m
    const nextCheckpointZ = -(state.checkpoint + 1) * 200;
    if (nextCheckpointZ > state.scrollZ - 80 && !checkpointMarkers.some(c => Math.abs(c.z - nextCheckpointZ) < 10)) {
      const marker = createCheckpoint(0);
      marker.position.z = nextCheckpointZ - state.scrollZ;
      world.scene.add(marker);
      checkpointMarkers.push({ group: marker, z: nextCheckpointZ, reached: false });
    }

    // Update and check checkpoint markers
    for (const cp of checkpointMarkers) {
      cp.group.position.z = cp.z - state.scrollZ;
      // Pulse the ring
      const ring = cp.group.children[cp.group.children.length - 1];
      if (ring) ring.rotation.z = this.time * 0.5;

      // Check if player passed
      if (!cp.reached && cp.group.position.z > -1 && cp.group.position.z < 1) {
        cp.reached = true;
        state.checkpoint++;
        state.checkpointsReached++;
        addScore(500);
        audio.play('powerup');
        showAlert(`CHECKPOINT ${state.checkpoint}! +500`);
        // Change checkpoint color to indicate reached
        cp.group.children.forEach(child => {
          if ((child as Mesh).material) {
            const mat = (child as Mesh).material as MeshBasicMaterial;
            if (mat.color) mat.color.setHex(0xffcc00);
          }
        });
      }
    }
  }

  private updateFortressVisuals(dt: number) {
    for (const beam of ceilingBeams) {
      beam.mesh.position.z = beam.z - state.scrollZ;
    }
    for (const ls of lightStrips) {
      ls.mesh.position.z = ls.z - state.scrollZ;
      // Pulse light strips
      const alpha = 0.3 + Math.sin(this.time * 2 + ls.z * 0.5) * 0.15;
      (ls.mesh.material as MeshBasicMaterial).opacity = alpha;
    }
  }

  private updateDiveBombers(dt: number) {
    for (const db of diveBombers) {
      if (!db.alive) continue;
      db.group.position.z = db.z - state.scrollZ;

      if (db.phase === 'hover') {
        // Hover high, waiting to dive
        db.group.position.x = db.x + Math.sin(this.time * 2 + db.z) * 1.5;
        db.group.position.y = db.y + Math.sin(this.time * 3) * 0.3;
        db.group.rotation.x = 0;
        // Warning light pulse
        db.group.children.forEach((child, idx) => {
          if (idx === 2 || idx === 3) {
            (child as Mesh).scale.setScalar(0.8 + Math.sin(this.time * 6) * 0.3);
          }
        });
        db.diveTimer -= dt;
        if (db.diveTimer <= 0 && db.group.position.z > -15 && db.group.position.z < 8) {
          // Lock on to player position and dive
          db.phase = 'dive';
          db.targetX = playerGroup.position.x;
          db.targetY = playerGroup.position.y;
          audio.play('dive');
          showAlert('DIVE BOMBER INCOMING!');
        }
      } else {
        // Diving at player's last known position
        const diveSpeed = 12;
        const dx = db.targetX - db.group.position.x;
        const dy = (db.targetY - 0.5) - db.group.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0.1) {
          db.group.position.x += (dx / dist) * diveSpeed * dt;
          db.group.position.y += (dy / dist) * diveSpeed * dt;
        }
        // Nose-down rotation during dive
        db.group.rotation.x = Math.min(Math.PI / 3, db.group.rotation.x + dt * 4);
        // Warning lights flash rapidly
        db.group.children.forEach((child, idx) => {
          if (idx === 2 || idx === 3) {
            (child as Mesh).visible = Math.sin(this.time * 20) > 0;
          }
        });
        // Engine trail during dive
        if (Math.random() < 0.5) {
          spawnParticles(db.group.position.x, db.group.position.y + 0.3, db.group.position.z + 0.3, 0xff4400, 1);
        }
        // Collision with player
        if (Math.abs(playerGroup.position.x - db.group.position.x) < 0.6 && Math.abs(playerGroup.position.y - db.group.position.y) < 0.5 && Math.abs(playerGroup.position.z - db.group.position.z) < 0.6) {
          db.alive = false; db.group.visible = false;
          playerHit();
          spawnParticles(db.group.position.x, db.group.position.y, db.group.position.z, 0xff0066, 20);
          audio.play('explode');
          triggerScreenShake(0.3, 0.35);
        }
        // If it misses and goes below floor, destroy it
        if (db.group.position.y < 0) {
          db.alive = false; db.group.visible = false;
          spawnParticles(db.group.position.x, 0.1, db.group.position.z, 0xff0066, 10);
          audio.play('explode');
        }
      }
    }
  }

  private updateAsteroids(dt: number) {
    for (const a of asteroids) {
      if (!a.alive) continue;
      a.group.position.z = a.z - state.scrollZ;
      a.group.position.x = a.x + Math.sin(this.time * 0.5 + a.z) * 0.3;
      a.group.position.y = a.y;
      // Tumble rotation
      a.group.rotation.x += a.rotSpeed.x * dt;
      a.group.rotation.y += a.rotSpeed.y * dt;
      a.group.rotation.z += a.rotSpeed.z * dt;
      // Slow drift
      a.x += a.vx * dt * 0.3;
      // Player collision
      const dist = Math.sqrt(
        Math.pow(playerGroup.position.x - a.group.position.x, 2) +
        Math.pow(playerGroup.position.y - a.group.position.y, 2) +
        Math.pow(playerGroup.position.z - a.group.position.z, 2)
      );
      if (dist < a.size + 0.4) {
        a.alive = false; a.group.visible = false;
        playerHit();
        spawnParticles(a.group.position.x, a.group.position.y, a.group.position.z, 0x8888aa, 15);
        audio.play('rock_break');
        triggerScreenShake(0.2, 0.2);
      }
    }
  }

  private updateCloakers(dt: number) {
    for (const cl of cloakers) {
      if (!cl.alive) continue;
      cl.group.position.z = cl.z - state.scrollZ;
      // Sinusoidal movement
      cl.group.position.x = cl.x + Math.sin(this.time * 1.8 + cl.z * 0.5) * 2;
      cl.group.position.y = cl.y + Math.sin(this.time * 2.5 + cl.z) * 0.4;
      // Cloaking cycle: fade in/out
      cl.cloakPhase += dt * 1.2;
      const cycle = Math.sin(cl.cloakPhase);
      // Visible when cycle > 0.3, fully visible at 1.0
      cl.visible_pct = Math.max(0, (cycle - 0.3) / 0.7);
      // Apply opacity to all mesh children
      cl.group.children.forEach(child => {
        if ((child as Mesh).material && 'opacity' in (child as Mesh).material) {
          ((child as Mesh).material as any).opacity = 0.05 + cl.visible_pct * 0.85;
        }
      });
      // Shimmer effect when partially visible
      cl.shimmerTimer += dt;
      if (cl.visible_pct > 0.1 && cl.visible_pct < 0.7) {
        const shimmer = Math.sin(this.time * 15 + cl.z) * 0.2;
        cl.group.children.forEach((child, idx) => {
          if (idx === 3) { // eye
            ((child as Mesh).material as MeshBasicMaterial).opacity = 0.3 + shimmer + cl.visible_pct * 0.5;
          }
        });
      }
      // Shoot when sufficiently visible
      cl.cooldown -= dt;
      if (cl.cooldown <= 0 && cl.visible_pct > 0.5 && cl.group.position.z > -20 && cl.group.position.z < 10) {
        cl.cooldown = 2.5 / getDiffMult();
        const dx = playerGroup.position.x - cl.group.position.x;
        const dy = playerGroup.position.y - cl.group.position.y;
        const dz = playerGroup.position.z - cl.group.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist > 0.1) {
          // Dual stealth bolts
          for (let s = 0; s < 2; s++) {
            const b = createBullet(0x4488ff, true);
            b.position.set(cl.group.position.x + (s - 0.5) * 0.4, cl.group.position.y, cl.group.position.z);
            world.scene.add(b);
            const speed = 11;
            bullets.push({ mesh: b, vx: (dx / dist) * speed, vy: (dy / dist) * speed, vz: (dz / dist) * speed, life: 2.5, isEnemy: true });
          }
          audio.play('cloak');
        }
      }
      // Player collision when visible
      if (cl.visible_pct > 0.3) {
        const dx = playerGroup.position.x - cl.group.position.x;
        const dy = playerGroup.position.y - cl.group.position.y;
        const dz = playerGroup.position.z - cl.group.position.z;
        if (Math.abs(dx) < 0.6 && Math.abs(dy) < 0.4 && Math.abs(dz) < 0.6) {
          cl.alive = false; cl.group.visible = false;
          playerHit();
          spawnParticles(cl.group.position.x, cl.group.position.y, cl.group.position.z, 0x4488ff, 15);
          audio.play('explode');
        }
      }
    }
  }

  private updateGravityWells(dt: number) {
    for (const gw of gravityWells) {
      if (!gw.alive) continue;
      gw.group.position.z = gw.z - state.scrollZ;
      gw.group.position.x = gw.x;
      gw.group.position.y = gw.y;
      // Rotate the well
      gw.group.rotation.y += gw.rotSpeed * dt;
      gw.group.rotation.z += gw.rotSpeed * 0.3 * dt;
      // Pulse core
      const pulse = 1 + Math.sin(this.time * 4 + gw.z) * 0.15;
      gw.group.children[0].scale.setScalar(pulse);
      // Pulse outer glow
      if (gw.group.children[4]) {
        ((gw.group.children[4] as Mesh).material as any).opacity = 0.05 + Math.sin(this.time * 2 + gw.z) * 0.05;
      }
      // Pull effect on player
      if (gw.group.position.z > -20 && gw.group.position.z < 10) {
        const dx = gw.group.position.x - playerGroup.position.x;
        const dy = gw.group.position.y - playerGroup.position.y;
        const dz = gw.group.position.z - playerGroup.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < gw.pullRadius && dist > 0.3) {
          const pullForce = (gw.pullStrength / (dist * dist)) * dt;
          playerX += (dx / dist) * pullForce * 2;
          playerX = Math.max(-5, Math.min(5, playerX));
          state.targetAltitude += (dy / dist) * pullForce;
          state.targetAltitude = Math.max(0.3, Math.min(3.5, state.targetAltitude));
          // Proximity damage
          if (dist < 0.8) {
            playerHit();
            spawnParticles(playerGroup.position.x, playerGroup.position.y, playerGroup.position.z, 0x8800ff, 10);
          }
        }
      }
    }
  }

  private updateWingman(dt: number) {
    // Handle wingman respawn timer
    if (!state.wingmanActive && state.wingmanRespawnTimer > 0) {
      state.wingmanRespawnTimer -= dt;
      if (state.wingmanRespawnTimer <= 0) {
        spawnWingman();
      }
      return;
    }
    if (!wingman || !wingman.alive) return;
    // Follow player with offset
    const targetX = playerX + 1.5;
    const targetY = state.altitude - 0.3;
    const targetZ = playerGroup.position.z + 1.5;
    wingman.group.position.x += (targetX - wingman.group.position.x) * 3 * dt;
    wingman.group.position.y += (targetY - wingman.group.position.y) * 3 * dt;
    wingman.group.position.z += (targetZ - wingman.group.position.z) * 3 * dt;
    // Bank with player
    wingman.group.rotation.z = -(playerX - wingman.group.position.x) * 0.3;
    // Auto-shoot at nearest enemy
    wingman.cooldown -= dt;
    if (wingman.cooldown <= 0) {
      // Find nearest enemy
      let nearestDist = 20;
      let nearestPos: { x: number; y: number; z: number } | null = null;
      for (const e of enemies) {
        if (!e.alive) continue;
        const dist = Math.sqrt(Math.pow(wingman.group.position.x - e.group.position.x, 2) + Math.pow(wingman.group.position.z - e.group.position.z, 2));
        if (dist < nearestDist && e.group.position.z < wingman.group.position.z) {
          nearestDist = dist; nearestPos = { x: e.group.position.x, y: e.group.position.y, z: e.group.position.z };
        }
      }
      for (const d of patrolDrones) {
        if (!d.alive) continue;
        const dist = Math.sqrt(Math.pow(wingman.group.position.x - d.group.position.x, 2) + Math.pow(wingman.group.position.z - d.group.position.z, 2));
        if (dist < nearestDist && d.group.position.z < wingman.group.position.z) {
          nearestDist = dist; nearestPos = { x: d.group.position.x, y: d.group.position.y, z: d.group.position.z };
        }
      }
      if (nearestPos) {
        wingman.cooldown = 0.4;
        const b = createBullet(0x44aaff, false);
        b.position.set(wingman.group.position.x, wingman.group.position.y, wingman.group.position.z);
        world.scene.add(b);
        const dx = nearestPos.x - wingman.group.position.x;
        const dy = nearestPos.y - wingman.group.position.y;
        const dz = nearestPos.z - wingman.group.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist > 0.1) {
          bullets.push({ mesh: b, vx: (dx / dist) * 15, vy: (dy / dist) * 15, vz: (dz / dist) * 15, life: 2.5, isEnemy: false });
        }
      } else {
        // No targets, shoot forward
        wingman.cooldown = 0.6;
        const b = createBullet(0x44aaff, false);
        b.position.set(wingman.group.position.x, wingman.group.position.y, wingman.group.position.z);
        world.scene.add(b);
        bullets.push({ mesh: b, vx: 0, vy: 0, vz: -15, life: 2, isEnemy: false });
      }
    }
    // Wingman engine trail
    if (Math.random() < 0.3) {
      const tp = new Mesh(new SphereGeometry(0.03, 4, 4), new MeshBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0.6 }));
      tp.position.set(wingman.group.position.x, wingman.group.position.y, wingman.group.position.z + 0.4);
      world.scene.add(tp);
      engineTrailParticles.push({ mesh: tp, vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5, vz: 1.5, life: 0.4, maxLife: 0.4 });
    }
  }

  private updateBonusCorridor(dt: number) {
    if (!state.bonusActive) return;
    state.bonusTimer -= dt;
    if (state.bonusTimer <= 0) {
      state.bonusActive = false;
      showAlert('BONUS OVER!');
      return;
    }
    // Spawn bonus collectibles periodically
    const spawnRate = 0.3;
    if (Math.random() < spawnRate) {
      const types: Array<'shield' | 'rapid' | 'fuel' | 'spread' | 'missile' | 'weapon'> = ['fuel', 'fuel', 'missile', 'weapon', 'shield', 'rapid'];
      const pt = types[Math.floor(Math.random() * types.length)];
      const pm = createPowerUpMesh(pt);
      const bx = (Math.random() - 0.5) * 6;
      const bz = playerGroup.position.z - 15 - Math.random() * 10;
      pm.position.set(bx, 1 + Math.random() * 1.5, bz);
      world.scene.add(pm);
      powerUps.push({ mesh: pm, z: bz + state.scrollZ, lane: 0, type: pt, alive: true });
    }
    // Spawn bonus rings for visual flair
    if (Math.random() < 0.1) {
      const ring = createBonusRing(0);
      const rz = playerGroup.position.z - 20 - Math.random() * 5;
      ring.position.z = rz;
      world.scene.add(ring);
      // Ring fades and gets cleaned up via particles naturally
      setTimeout(() => { world.scene.remove(ring); }, 3000);
    }
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
    setText('hud-altitude', `Alt: ${state.altitude.toFixed(1)}m`);
    // Combo and multiplier
    if (state.combo > 1) {
      setText('hud-combo', `x${state.combo} COMBO`);
    } else {
      setText('hud-combo', '');
    }
    if (state.mode === 'speed') setText('hud-timer', `Time: ${Math.ceil(state.speedTimer)}s`);
    else setText('hud-timer', '');
    // Power-up indicators
    let powers = '';
    if (state.shieldTimer > 0) powers += `🛡${Math.ceil(state.shieldTimer)}s `;
    if (state.rapidTimer > 0) powers += `⚡${Math.ceil(state.rapidTimer)}s `;
    if (state.spreadTimer > 0) powers += `💥${Math.ceil(state.spreadTimer)}s `;
    setText('hud-powerups', powers);
    // Missile ammo
    setText('hud-missiles', state.missileAmmo > 0 ? `🚀 x${state.missileAmmo}` : '');
    // Smart bomb count
    if (state.smartBombs > 0) {
      const bombStatus = state.smartBombCooldown > 0 ? ' (COOLDOWN)' : '';
      setText('hud-powerups', powers + `💣x${state.smartBombs}${bombStatus} `);
    }
    // Weapon level
    const wlvl = state.weaponLevel > 1 ? ` | WPN Lv${state.weaponLevel}` : '';
    setText('hud-altitude', `Alt: ${state.altitude.toFixed(1)}m${wlvl}`);
    // Checkpoint
    if (state.checkpoint > 0) {
      setText('hud-level', `Level: ${state.level} | CP: ${state.checkpoint}`);
    }
    // Kill streak + score multiplier in combo display
    if (state.killStreak >= 3) {
      const streakText = state.combo > 1 ? `x${state.combo} COMBO | 🔥${state.killStreak} STREAK` : `🔥${state.killStreak} STREAK`;
      setText('hud-combo', streakText);
    }
    if (state.scoreMultiplier > 1) {
      setText('hud-score', `Score: ${state.score} (${state.scoreMultiplier}x)`);
    }
    // Wingman status
    if (state.wingmanActive && wingman && wingman.alive) {
      const wlvl2 = state.weaponLevel > 1 ? ` | WPN Lv${state.weaponLevel}` : '';
      setText('hud-altitude', `Alt: ${state.altitude.toFixed(1)}m${wlvl2} | WINGMAN`);
    }
    // Alert text
    if (state.alertTimer > 0 && state.alertText) {
      if (!(boss && boss.alive)) {
        setText('hud-boss', `⚠ ${state.alertText}`);
      }
    }
    // Boss HP bar
    if (boss && boss.alive) {
      const hpPct = Math.floor((boss.hp / boss.maxHp) * 100);
      const barsCount = Math.ceil(hpPct / 5);
      const bars = '█'.repeat(barsCount) + '░'.repeat(20 - barsCount);
      const shieldInfo = boss.shieldActive ? ` [SHIELD x${boss.shieldHp}]` : '';
      setText('hud-boss', `BOSS ${bars} ${hpPct}%${shieldInfo}`);
    } else if (state.bonusActive) {
      setText('hud-boss', `⭐ BONUS TIME! ${Math.ceil(state.bonusTimer)}s ⭐`);
    } else if (state.alertTimer <= 0) {
      setText('hud-boss', '');
    }
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
      if (p.life <= 0) { world.scene.remove(p.mesh); particles.splice(i, 1); }
    }
  }

  private updateEngineTrail(dt: number) {
    for (let i = engineTrailParticles.length - 1; i >= 0; i--) {
      const p = engineTrailParticles[i];
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.life -= dt;
      const alpha = p.life / p.maxLife;
      (p.mesh.material as MeshBasicMaterial).opacity = alpha * 0.7;
      p.mesh.scale.setScalar(0.5 + alpha * 0.5);
      if (p.life <= 0) { world.scene.remove(p.mesh); engineTrailParticles.splice(i, 1); }
    }
  }

  private updateFloatingScores(dt: number) {
    for (let i = floatingScores.length - 1; i >= 0; i--) {
      const f = floatingScores[i];
      f.mesh.position.y += f.vy * dt;
      f.life -= dt;
      const alpha = f.life;
      f.mesh.children.forEach(child => {
        if ((child as Mesh).material) {
          ((child as Mesh).material as MeshBasicMaterial).opacity = alpha;
        }
      });
      const scale = 1 + (1 - f.life) * 0.5;
      f.mesh.scale.setScalar(scale);
      if (f.life <= 0) { world.scene.remove(f.mesh); floatingScores.splice(i, 1); }
    }
  }

  private updateWarningArrows(dt: number) {
    for (let i = warningArrows.length - 1; i >= 0; i--) {
      const w = warningArrows[i];
      w.life -= dt;
      // Bob up and down
      w.mesh.position.y = 4.5 + Math.sin(this.time * 6) * 0.3;
      w.mesh.position.x = w.targetX;
      // Pulse opacity
      w.mesh.children.forEach(child => {
        if ((child as Mesh).material) {
          ((child as Mesh).material as MeshBasicMaterial).opacity = 0.4 + Math.sin(this.time * 8) * 0.4;
        }
      });
      if (w.life <= 0) { world.scene.remove(w.mesh); warningArrows.splice(i, 1); }
    }
  }

  private updateRadar() {
    if (!radarGroup || state.screen !== 'playing') return;
    // Clean old dots
    radarDots.forEach(d => radarGroup.remove(d));
    radarDots.length = 0;

    const radarRange = 30;
    const radarScale = 1.0 / radarRange;

    const addDot = (wx: number, wz: number, color: number) => {
      const rx = (wx - playerGroup.position.x) * radarScale;
      const rz = (wz - playerGroup.position.z) * radarScale;
      if (Math.abs(rx) > 1.1 || Math.abs(rz) > 1.1) return;
      const dot = createRadarDot(color);
      dot.position.set(rx, 0.04, rz);
      radarGroup.add(dot);
      radarDots.push(dot);
    };

    // Enemies (red)
    enemies.forEach(e => { if (e.alive) addDot(e.group.position.x, e.group.position.z, 0xff2200); });
    // Turrets (orange)
    turrets.forEach(t => { if (t.alive) addDot(t.group.position.x, t.group.position.z, 0xff8800); });
    // Patrol drones (yellow)
    patrolDrones.forEach(d => { if (d.alive) addDot(d.group.position.x, d.group.position.z, 0xffaa00); });
    // Mines (red, smaller)
    mines.forEach(m => { if (m.alive) addDot(m.mesh.position.x, m.mesh.position.z, 0xff4400); });
    // Dive bombers (pink)
    diveBombers.forEach(db => { if (db.alive) addDot(db.group.position.x, db.group.position.z, 0xff0066); });
    // Boss (big red)
    if (boss && boss.alive) {
      const rx = (boss.group.position.x - playerGroup.position.x) * radarScale;
      const rz = (boss.group.position.z - playerGroup.position.z) * radarScale;
      if (Math.abs(rx) < 1.1 && Math.abs(rz) < 1.1) {
        const dot = new Mesh(new SphereGeometry(0.07, 6, 4), new MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.6 + Math.sin(this.time * 4) * 0.3 }));
        dot.position.set(rx, 0.04, rz);
        radarGroup.add(dot);
        radarDots.push(dot);
      }
    }
    // Power-ups (green)
    powerUps.forEach(p => { if (p.alive) addDot(p.mesh.position.x, p.mesh.position.z, 0x44ff44); });
    // Ground targets (white)
    groundTargets.forEach(gt => { if (gt.alive) addDot(gt.group.position.x, gt.group.position.z, 0xdddddd); });
    // Asteroids (gray)
    asteroids.forEach(a => { if (a.alive) addDot(a.group.position.x, a.group.position.z, 0x888888); });
    // Cloakers (blue, only when visible)
    cloakers.forEach(cl => { if (cl.alive && cl.visible_pct > 0.3) addDot(cl.group.position.x, cl.group.position.z, 0x4488ff); });
    // Gravity wells (purple)
    gravityWells.forEach(gw => { if (gw.alive) addDot(gw.group.position.x, gw.group.position.z, 0x8800ff); });
    // Wingman (light blue)
    if (wingman && wingman.alive) addDot(wingman.group.position.x, wingman.group.position.z, 0x44aaff);
  }

  private updateAmbient(time: number) {
    ambientOrbs.forEach((orb, i) => { orb.position.y += Math.sin(time * 0.5 + i) * 0.003; });
    // Star twinkling
    starField.forEach((s, i) => {
      const twinkle = Math.sin(time * (1.5 + (i % 5) * 0.3) + i * 1.7) * 0.3;
      (s.material as MeshBasicMaterial).opacity = 0.3 + twinkle;
      // Subtle scale pulse for some stars
      if (i % 3 === 0) {
        const scale = 1 + Math.sin(time * 2 + i) * 0.2;
        s.scale.setScalar(scale);
      }
    });
    // Player blink on invincible
    if (state.invincibleTimer > 0) {
      playerGroup.visible = Math.sin(this.time * 20) > 0;
    } else {
      playerGroup.visible = true;
    }
  }

  private updateCamera(dt: number) {
    const targetX = playerX * 0.3;
    const targetZ = -8;

    // Apply screen shake
    let shakeX = 0, shakeY = 0;
    if (state.screenShakeTimer > 0) {
      const intensity = state.screenShakeIntensity * (state.screenShakeTimer / 0.5);
      shakeX = (Math.random() - 0.5) * intensity;
      shakeY = (Math.random() - 0.5) * intensity;
    }

    world.camera.position.x += (targetX - world.camera.position.x + shakeX) * 3 * dt;
    world.camera.position.y = 15 + shakeY;
    world.camera.position.z += (targetZ + 12 - world.camera.position.z) * 3 * dt;
    world.camera.lookAt(targetX + shakeX * 0.5, 1, targetZ);

    altitudeIndicator.position.set(playerX - 3, 0, playerGroup.position.z);

    // Results panel
    if (state.screen === 'results') {
      const doc = this.docs['results']?.doc;
      if (doc) {
        const setText = (id: string, text: string) => {
          (doc.getElementById(id) as UIKit.Text | undefined)?.setProperties({ text });
        };
        setText('result-score', `Final Score: ${state.score}`);
        setText('result-high', `High Score: ${state.highScore}`);
        setText('result-level', `Level: ${state.level}`);
        setText('result-kills', `Kills: ${state.totalKills}`);
        setText('result-combo', `Best Combo: x${state.maxCombo}`);
        setText('result-distance', `Distance: ${Math.floor(state.totalDistance)}m`);
        setText('result-checkpoints', `Checkpoints: ${state.checkpointsReached}`);
        setText('result-ground', `Ground Targets: ${state.groundTargetsDestroyed}`);
        setText('result-formations', `Formations: ${state.formationsDestroyed}`);
        setText('result-missiles', `Missiles Used: ${state.totalMissilesUsed}`);
        // Kill streak
        setText('result-formations', `Formations: ${state.formationsDestroyed} | Streak: ${state.bestStreak}`);
        // Performance rank
        const rank = getPerformanceRank(state.score, state.totalKills, state.level, state.maxCombo);
        setText('result-rank', `RANK: ${rank.rank} — ${rank.label}`);
      }
    }

    // Stats panel
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
          setText('stat-games', `Games: ${s.gamesPlayed || 0}`);
          setText('stat-kills', `Kills: ${s.totalKills || 0}`);
          setText('stat-fuel', `Fuel: ${s.totalFuel || 0}`);
          setText('stat-shots', `Shots: ${s.totalShots || 0}`);
          setText('stat-powerups', `Power-ups: ${s.totalPowerups || 0}`);
          setText('stat-bosses', `Bosses: ${s.bossesDefeated || 0}`);
          setText('stat-combo', `Best Combo: x${s.bestCombo || 0}`);
          setText('stat-distance', `Distance: ${Math.floor(s.totalDistance || 0)}m`);
          setText('stat-missiles', `Missiles: ${s.totalMissiles || 0}`);
          setText('stat-checkpoints', `Checkpoints: ${s.checkpointsReached || 0}`);
          setText('stat-ground', `Ground Tgts: ${s.groundTargetsDestroyed || 0}`);
          setText('stat-formations', `Formations: ${s.formationsDestroyed || 0}`);
          setText('stat-asteroids', `Asteroids: ${s.asteroidsDestroyed || 0}`);
          setText('stat-cloakers', `Cloakers: ${s.cloakersKilled || 0}`);
          setText('stat-bombs', `Smart Bombs: ${s.totalSmartBombs || 0}`);
          setText('stat-distance', `Dist: ${Math.floor(s.totalDistance || 0)}m | Streak: ${s.bestStreak || 0}`);
        } catch {}
      }
    }
  }
}
