import { safeGet, safeSet } from './storage';

/** Tiny synthesized sound effects (WebAudio) — no audio files to download. */
export class Sound {
  private ctx: AudioContext | null = null;
  muted: boolean;

  constructor() {
    this.muted = safeGet('muted') === '1';
  }

  toggle(): boolean {
    this.muted = !this.muted;
    safeSet('muted', this.muted ? '1' : '0');
    return this.muted;
  }

  private ensure(): AudioContext | null {
    if (this.muted) return null;
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx ??= new AC();
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, delay = 0, slideTo?: number) {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  move() { this.tone(220, 0.06, 'triangle', 0.05, 0, 180); }
  merge(value: number) {
    const base = 300 + Math.min(Math.log2(value), 14) * 38;
    this.tone(base, 0.14, 'sine', 0.09);
    this.tone(base * 1.5, 0.18, 'triangle', 0.05, 0.05);
  }
  evolve() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.09, i * 0.09));
  }
  victory() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.3, 'sawtooth', 0.06, i * 0.1));
  }
  over() { this.tone(300, 0.6, 'sawtooth', 0.07, 0, 70); }
}
