import { settings, type Settings } from '../storage/settings';
import { BARS_PER_LOOP, buildBar, midiToHz, THEMES, type MusicTheme, type NoteEvent } from './music';

/** Efeitos sonoros disponíveis (sintetizados, sem ficheiros). */
export type Sfx =
  | 'tap'
  | 'select'
  | 'swap'
  | 'invalid'
  | 'match'
  | 'wet'
  | 'steam'
  | 'zap'
  | 'shuffle'
  | 'star'
  | 'sparkle'
  | 'win'
  | 'lose'
  | 'collect';

type Ctx = AudioContext;

/**
 * Motor de áudio com Web Audio API.
 * - O contexto só é criado/retomado depois de um gesto do utilizador (regras do iOS/Safari).
 * - Música e efeitos têm ganhos separados, ligados às preferências guardadas.
 * - Suspende quando a página fica escondida.
 * Se o browser não suportar Web Audio, todas as chamadas são ignoradas.
 */
export class AudioEngine {
  private ctx: Ctx | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private theme: MusicTheme | null = null;
  private nextBarTime = 0;
  private bar = 0;
  private timer: number | null = null;
  private unlocked = false;

  /** Instala os ouvintes de desbloqueio e de visibilidade. Chamar uma vez no arranque. */
  install(): void {
    const unlock = () => {
      this.ensure();
      if (this.ctx && this.ctx.state !== 'running') void this.ctx.resume();
      if (this.ctx?.state === 'running' || this.ctx) this.unlocked = true;
      if (this.theme) this.startScheduler();
    };
    for (const ev of ['pointerdown', 'touchend', 'click', 'keydown']) document.addEventListener(ev, unlock, { capture: true, passive: true });
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) void this.ctx.suspend();
      else if (this.unlocked) void this.ctx.resume();
    });
    settings.onChange((s) => this.applyVolumes(s));
  }

  private ensure(): void {
    if (this.ctx) return;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
    } catch {
      return;
    }
    const ctx = this.ctx;
    this.master = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    this.master.connect(comp).connect(ctx.destination);
    this.musicGain = ctx.createGain();
    this.sfxGain = ctx.createGain();
    this.musicGain.connect(this.master);
    this.sfxGain.connect(this.master);
    this.applyVolumes(settings.value);
    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    let seed = 7;
    for (let i = 0; i < len; i++) {
      seed = (seed * 16807) % 2147483647;
      data[i] = (seed / 2147483647) * 2 - 1;
    }
  }

  private applyVolumes(s: Settings): void {
    if (!this.ctx || !this.musicGain || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    // A música fica por baixo dos efeitos.
    this.musicGain.gain.setTargetAtTime(s.musicVolume * 0.22, t, 0.05);
    this.sfxGain.gain.setTargetAtTime(s.sfxVolume * 0.6, t, 0.02);
  }

  private get ready(): boolean {
    return !!this.ctx && this.ctx.state === 'running' && !!this.sfxGain;
  }

  // ---------- Música ----------

  setMusic(theme: MusicTheme | null): void {
    if (theme === this.theme) return;
    this.theme = theme;
    this.bar = 0;
    if (this.ctx) this.nextBarTime = this.ctx.currentTime + 0.15;
    if (theme) this.startScheduler();
    else this.stopScheduler();
  }

  private startScheduler(): void {
    if (this.timer !== null || !this.ctx) return;
    this.nextBarTime = Math.max(this.nextBarTime, this.ctx.currentTime + 0.15);
    this.timer = window.setInterval(() => this.schedule(), 120);
  }

  private stopScheduler(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
  }

  /** Agenda compassos com ~0,6 s de antecedência (robusto a engasgos do ciclo principal). */
  private schedule(): void {
    if (!this.ready || !this.theme || !this.ctx) return;
    const ctx = this.ctx;
    const spec = THEMES[this.theme];
    const beat = 60 / spec.bpm;
    if (this.nextBarTime < ctx.currentTime) this.nextBarTime = ctx.currentTime + 0.05;
    while (this.nextBarTime < ctx.currentTime + 0.6) {
      for (const n of buildBar(this.theme, this.bar)) this.playNote(n, this.nextBarTime + n.beat * beat, n.dur * beat);
      this.nextBarTime += 4 * beat;
      this.bar = (this.bar + 1) % BARS_PER_LOOP;
    }
  }

  private playNote(n: NoteEvent, when: number, dur: number): void {
    const ctx = this.ctx as Ctx;
    const out = this.musicGain as GainNode;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const f = midiToHz(n.midi);
    osc.frequency.value = f;
    let attack = 0.01;
    let release = 0.2;
    let peak = n.vel * 0.3;
    switch (n.voice) {
      case 'pad':
        osc.type = 'triangle';
        attack = Math.min(0.6, dur * 0.3);
        release = 0.6;
        peak = n.vel * 0.12;
        break;
      case 'bass':
        osc.type = 'triangle';
        peak = n.vel * 0.35;
        release = 0.15;
        break;
      case 'arp':
        osc.type = 'sine';
        peak = n.vel * 0.18;
        release = 0.25;
        dur = Math.min(dur, 0.12);
        break;
      case 'bell':
        osc.type = 'sine';
        peak = n.vel * 0.2;
        release = 1.2;
        dur = 0.05;
        break;
    }
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(peak, when + attack);
    g.gain.setValueAtTime(peak, when + Math.max(attack, dur));
    g.gain.exponentialRampToValueAtTime(0.0001, when + Math.max(attack, dur) + release);
    osc.connect(g).connect(out);
    osc.start(when);
    osc.stop(when + Math.max(attack, dur) + release + 0.05);
    if (n.voice === 'bell') {
      // Harmónico para o timbre de sino.
      const o2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      o2.frequency.value = f * 2.76;
      g2.gain.setValueAtTime(peak * 0.4, when);
      g2.gain.exponentialRampToValueAtTime(0.0001, when + 0.6);
      o2.connect(g2).connect(out);
      o2.start(when);
      o2.stop(when + 0.7);
    }
  }

  // ---------- Efeitos ----------

  /** Toca um efeito. `level` varia o tom (ex.: índice da cascata). */
  play(sfx: Sfx, level = 0): void {
    if (!this.ready) return;
    const ctx = this.ctx as Ctx;
    const t = ctx.currentTime + 0.005;
    switch (sfx) {
      case 'tap':
        this.tone('sine', 880, 1320, t, 0.06, 0.25);
        break;
      case 'select':
        this.tone('sine', 660, 990, t, 0.07, 0.2);
        break;
      case 'swap':
        this.noiseSweep(t, 0.14, 1200, 3500, 0.18, 'bandpass');
        break;
      case 'invalid':
        this.tone('square', 220, 160, t, 0.12, 0.12);
        this.tone('square', 200, 140, t + 0.1, 0.12, 0.1);
        break;
      case 'match': {
        // Acorde maior que sobe de tom em cada cascata.
        const base = 523.25 * Math.pow(2, Math.min(level, 8) / 12 * 2);
        [1, 1.25, 1.5].forEach((k, i) => this.tone('triangle', base * k, base * k * 1.01, t + i * 0.035, 0.22, 0.22));
        this.tone('sine', base * 2, base * 2, t + 0.08, 0.3, 0.12);
        break;
      }
      case 'collect':
        this.tone('sine', 1046, 1568, t, 0.08, 0.12);
        break;
      case 'wet':
        // "Bloop" de água: seno com descida rápida de tom.
        this.tone('sine', 900, 300, t, 0.12, 0.35);
        this.tone('sine', 1200, 500, t + 0.06, 0.1, 0.2);
        break;
      case 'steam':
        this.noiseSweep(t, 0.7, 4000, 400, 0.55, 'lowpass');
        this.tone('sine', 120, 50, t, 0.35, 0.5);
        break;
      case 'zap':
        for (let i = 0; i < 5; i++) this.tone('sawtooth', 300 + Math.random() * 900, 80 + Math.random() * 200, t + i * 0.045, 0.06, 0.16);
        this.noiseSweep(t, 0.3, 6000, 2000, 0.25, 'highpass');
        break;
      case 'shuffle':
        this.noiseSweep(t, 0.4, 500, 3000, 0.2, 'bandpass');
        break;
      case 'star':
        this.tone('triangle', 1318, 1318, t, 0.25, 0.25);
        this.tone('sine', 2637, 2637, t + 0.02, 0.3, 0.1);
        break;
      case 'sparkle':
        [1568, 2093, 2637, 3136].forEach((f, i) => this.tone('sine', f, f, t + i * 0.05, 0.15, 0.12));
        break;
      case 'win':
        [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone('triangle', f, f, t + i * 0.1, i === 4 ? 0.6 : 0.18, 0.28));
        break;
      case 'lose':
        [392, 349, 311, 262].forEach((f, i) => this.tone('triangle', f, f * 0.98, t + i * 0.16, 0.3, 0.22));
        break;
    }
  }

  private tone(type: OscillatorType, from: number, to: number, when: number, dur: number, vol: number): void {
    const ctx = this.ctx as Ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, when);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), when + dur);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(g).connect(this.sfxGain as GainNode);
    osc.start(when);
    osc.stop(when + dur + 0.02);
  }

  private noiseSweep(when: number, dur: number, fromHz: number, toHz: number, vol: number, type: BiquadFilterType): void {
    const ctx = this.ctx as Ctx;
    if (!this.noise) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = type === 'bandpass' ? 1.2 : 0.7;
    filter.frequency.setValueAtTime(fromHz, when);
    filter.frequency.exponentialRampToValueAtTime(toHz, when + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(filter).connect(g).connect(this.sfxGain as GainNode);
    src.start(when, Math.random() * 0.5);
    src.stop(when + dur + 0.02);
  }
}

export const audio = new AudioEngine();
