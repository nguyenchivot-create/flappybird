/**
 * @fileoverview Sound Engine - synthesizes all game sound effects at runtime with
 * the Web Audio API (no audio files needed). Handles autoplay unlocking on the
 * first user gesture and a persistent mute toggle.
 */

class SoundManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muteKey = 'flappy_bird_muted';
    this.muted = false;
    try {
      this.muted = localStorage.getItem(this.muteKey) === '1';
    } catch (e) {}

    // Browsers only allow audio after a user gesture, so unlock on the first one.
    const unlock = () => this.unlock();
    ['pointerdown', 'touchend', 'keydown'].forEach((evt) =>
      window.addEventListener(evt, unlock, { capture: true, passive: true })
    );
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(muted) {
    this.muted = muted;
    try {
      localStorage.setItem(this.muteKey, muted ? '1' : '0');
    } catch (e) {}
    if (this.master) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.5, this.ctx.currentTime, 0.01);
    }
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  ready() {
    if (!this.ctx) this.unlock();
    return this.ctx && !this.muted;
  }

  /** Single oscillator note with a pitch sweep and a quick volume envelope. */
  tone({ type = 'square', from, to = from, start = 0, duration, volume = 0.3 }) {
    const t0 = this.ctx.currentTime + start;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, t0 + duration);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  /** Filtered white-noise burst, used for impacts and whooshes. */
  noise({ start = 0, duration, volume = 0.3, filter = 'lowpass', from = 2000, to = from }) {
    const t0 = this.ctx.currentTime + start;
    const length = Math.ceil(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const biquad = this.ctx.createBiquadFilter();
    biquad.type = filter;
    biquad.frequency.setValueAtTime(from, t0);
    if (to !== from) biquad.frequency.exponentialRampToValueAtTime(to, t0 + duration);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(biquad).connect(gain).connect(this.master);
    src.start(t0);
  }

  flap() {
    if (!this.ready()) return;
    this.noise({ duration: 0.12, volume: 0.25, filter: 'bandpass', from: 800, to: 2400 });
    this.tone({ type: 'triangle', from: 380, to: 720, duration: 0.09, volume: 0.18 });
  }

  point() {
    if (!this.ready()) return;
    this.tone({ type: 'square', from: 988, duration: 0.08, volume: 0.12 });
    this.tone({ type: 'square', from: 1319, start: 0.08, duration: 0.22, volume: 0.12 });
  }

  hit() {
    if (!this.ready()) return;
    this.noise({ duration: 0.18, volume: 0.5, filter: 'lowpass', from: 1800, to: 200 });
    this.tone({ type: 'square', from: 220, to: 70, duration: 0.18, volume: 0.25 });
  }

  fall() {
    if (!this.ready()) return;
    this.tone({ type: 'sawtooth', from: 700, to: 120, start: 0.2, duration: 0.45, volume: 0.1 });
  }

  swoosh() {
    if (!this.ready()) return;
    this.noise({ duration: 0.25, volume: 0.2, filter: 'bandpass', from: 400, to: 3000 });
  }

  medal() {
    if (!this.ready()) return;
    [784, 988, 1175, 1568].forEach((f, i) =>
      this.tone({ type: 'triangle', from: f, start: 0.5 + i * 0.09, duration: 0.18, volume: 0.15 })
    );
  }
}
