/**
 * @fileoverview Sound Engine - plays the game's sound files from public/sounds/
 * through the Web Audio API.
 *
 * - Separate gain channels for background music and sound effects.
 * - Mute state and both volumes persist in localStorage.
 * - Audio is unlocked on the first user gesture (required by iOS Safari and
 *   Chrome autoplay rules); background music starts at that moment.
 * - Per-sound rate limiting and voice caps prevent pile-ups on rapid taps.
 * - If a file cannot be loaded (missing, or the page is opened via file://),
 *   that effect falls back to a synthesized version so the game is never silent.
 *
 * Web Audio is used instead of <audio> elements because iOS ignores
 * HTMLMediaElement.volume, so per-channel volume would not work on iPhone.
 */

// Updated by tools/bump_version.py so browsers fetch new sound files after a release.
const ASSET_VERSION = '20261106193645';

const SOUND_FILES = {
  flap: 'public/sounds/flap.wav',
  score: 'public/sounds/score.wav',
  hit: 'public/sounds/hit.wav',
  die: 'public/sounds/die.wav',
  background: 'public/sounds/background.mp3'
};

// minGap: seconds that must pass before the same effect can start again.
// maxVoices: how many copies of the effect may sound at the same time.
const SFX_LIMITS = {
  flap: { minGap: 0.07, maxVoices: 2 },
  score: { minGap: 0.05, maxVoices: 2 },
  hit: { minGap: 0.3, maxVoices: 1 },
  die: { minGap: 0.5, maxVoices: 1 }
};

class SoundManager {
  constructor() {
    this.ctx = null;
    this.buffers = {};
    this.rawData = {};
    this.lastPlayed = {};
    this.voices = {};
    this.music = null;
    this.unlocked = false;

    this.storageKey = 'flappy_bird_audio';
    const saved = this.loadSettings();
    this.muted = saved.muted;
    this.musicVolume = saved.musicVolume;
    this.sfxVolume = saved.sfxVolume;

    // Download files right away; decoding waits for the AudioContext.
    this.loading = Promise.all(Object.keys(SOUND_FILES).map((name) => this.fetchSound(name)));

    this._unlock = this.unlock.bind(this);
    ['touchend', 'pointerdown', 'mousedown', 'keydown'].forEach((evt) =>
      window.addEventListener(evt, this._unlock, { capture: true, passive: true })
    );

    // Pause everything while the tab is hidden; resume when it comes back.
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend();
      else if (this.unlocked) this.ctx.resume();
    });
  }

  // ---------- settings ----------

  loadSettings() {
    const defaults = { muted: false, musicVolume: 0.4, sfxVolume: 0.8 };
    try {
      const raw = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
      return {
        muted: typeof raw.muted === 'boolean' ? raw.muted : defaults.muted,
        musicVolume: this.clamp(raw.musicVolume, defaults.musicVolume),
        sfxVolume: this.clamp(raw.sfxVolume, defaults.sfxVolume)
      };
    } catch (e) {
      return defaults;
    }
  }

  saveSettings() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({
        muted: this.muted,
        musicVolume: this.musicVolume,
        sfxVolume: this.sfxVolume
      }));
    } catch (e) {}
  }

  clamp(v, fallback) {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : fallback;
  }

  setMuted(muted) {
    this.muted = !!muted;
    this.saveSettings();
    this.applyGains();
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  setMusicVolume(v) {
    this.musicVolume = this.clamp(v, this.musicVolume);
    this.saveSettings();
    this.applyGains();
  }

  setSfxVolume(v) {
    this.sfxVolume = this.clamp(v, this.sfxVolume);
    this.saveSettings();
    this.applyGains();
  }

  applyGains() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 1, t, 0.02);
    this.musicGain.gain.setTargetAtTime(this.musicVolume, t, 0.02);
    this.sfxGain.gain.setTargetAtTime(this.sfxVolume, t, 0.02);
  }

  // ---------- loading ----------

  fetchSound(name) {
    if (!window.fetch) return Promise.resolve();
    return fetch(SOUND_FILES[name] + '?v=' + ASSET_VERSION)
      .then((res) => {
        if (!res.ok) throw new Error(res.status);
        return res.arrayBuffer();
      })
      .then((data) => {
        this.rawData[name] = data;
        if (this.ctx) return this.decode(name);
      })
      .catch(() => {
        // Missing file or file:// page: the synthesized fallback is used instead.
      });
  }

  decode(name) {
    const data = this.rawData[name];
    if (!data || this.buffers[name]) return Promise.resolve();
    delete this.rawData[name];
    // Older Safari only supports the callback form of decodeAudioData.
    return new Promise((resolve) => {
      const done = (buffer) => {
        this.buffers[name] = buffer;
        if (name === 'background') this.startMusic();
        resolve();
      };
      const p = this.ctx.decodeAudioData(data, done, () => resolve());
      if (p && p.catch) p.catch(() => resolve());
    });
  }

  // ---------- unlock (first user gesture) ----------

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.gain.value = this.muted ? 0 : 1;
      this.musicGain.gain.value = this.musicVolume;
      this.sfxGain.gain.value = this.sfxVolume;

      // iOS: playing a silent buffer inside the gesture fully unlocks output.
      const silent = this.ctx.createBufferSource();
      silent.buffer = this.ctx.createBuffer(1, 1, 22050);
      silent.connect(this.ctx.destination);
      silent.start(0);

      Object.keys(this.rawData).forEach((name) => this.decode(name));
    }
    if (this.ctx.state !== 'running') {
      const p = this.ctx.resume();
      if (p && p.catch) p.catch(() => {});
    }
    this.unlocked = true;
    this.startMusic();
  }

  // ---------- music ----------

  startMusic() {
    const buffer = this.buffers.background;
    if (!this.ctx || !this.unlocked || !buffer || this.music) return;

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    // Some decoders keep the MP3 encoder's leading silence; skip it so the loop is seamless.
    const { start, end } = this.findLoopPoints(buffer);
    src.loopStart = start;
    src.loopEnd = end;
    src.connect(this.musicGain);
    src.start(0, start);
    this.music = src;
  }

  findLoopPoints(buffer) {
    // Only the leading encoder padding is trimmed (at most 100 ms). The tail is
    // left alone: trimming quiet-but-real audio there would shift the beat.
    const data = buffer.getChannelData(0);
    const maxTrim = Math.min(data.length, Math.floor(buffer.sampleRate * 0.1));
    let s = 0;
    while (s < maxTrim && Math.abs(data[s]) < 0.0005) s++;
    if (s >= maxTrim) s = 0; // a quiet intro, not padding
    return { start: s / buffer.sampleRate, end: buffer.duration };
  }

  // ---------- sound effects ----------

  play(name, delay = 0) {
    if (!this.ctx || this.muted || this.sfxVolume <= 0) return;

    const now = this.ctx.currentTime;
    const limit = SFX_LIMITS[name] || { minGap: 0, maxVoices: 4 };
    if (now - (this.lastPlayed[name] || -Infinity) < limit.minGap) return;
    if ((this.voices[name] || 0) >= limit.maxVoices) return;
    this.lastPlayed[name] = now;

    const buffer = this.buffers[name];
    if (!buffer) {
      this.synth(name, delay);
      return;
    }

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.sfxGain);
    this.voices[name] = (this.voices[name] || 0) + 1;
    src.onended = () => { this.voices[name]--; };
    src.start(now + delay);
  }

  flap() { this.play('flap'); }
  score() { this.play('score'); }
  hit() { this.play('hit'); }
  die() { this.play('die', 0.25); }

  // ---------- synthesized fallbacks ----------

  synth(name, delay) {
    const recipes = {
      flap: () => {
        this.noise({ start: delay, duration: 0.12, volume: 0.25, from: 800, to: 2400, filter: 'bandpass' });
        this.tone({ type: 'triangle', from: 380, to: 720, start: delay, duration: 0.09, volume: 0.18 });
      },
      score: () => {
        this.tone({ type: 'square', from: 988, start: delay, duration: 0.08, volume: 0.12 });
        this.tone({ type: 'square', from: 1319, start: delay + 0.08, duration: 0.22, volume: 0.12 });
      },
      hit: () => {
        this.noise({ start: delay, duration: 0.18, volume: 0.5, from: 1800, to: 200, filter: 'lowpass' });
        this.tone({ type: 'square', from: 220, to: 70, start: delay, duration: 0.18, volume: 0.25 });
      },
      die: () => {
        this.tone({ type: 'sawtooth', from: 700, to: 110, start: delay, duration: 0.6, volume: 0.1 });
      }
    };
    if (recipes[name]) recipes[name]();
  }

  tone({ type, from, to = from, start, duration, volume }) {
    const t0 = this.ctx.currentTime + start;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, t0 + duration);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  noise({ start, duration, volume, filter, from, to = from }) {
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
    src.connect(biquad);
    biquad.connect(gain);
    gain.connect(this.sfxGain);
    src.start(t0);
  }
}
