/**
 * Archon NEO – audio engine (Web Audio API only, no sample files).
 *
 * Sound design follows the spirit of the 1983 original – pulse waves, filter
 * sweeps and noise like a SID chip – but with modern production: a mix bus with
 * compressor, a generated reverb, stereo panning and layered, detuned voices.
 * The music is an original composition (no melodies of the original game).
 */

const midi = (n) => 440 * 2 ** ((n - 69) / 12);

export const Sound = {
  ac: null,
  sfxOn: true,
  musicOn: true,
  last: {},
  track: null,
  _wanted: null,

  /** Must be called from a user gesture (iOS: touchend, Chrome: pointerup/click). */
  unlock() {
    try {
      if (!this.ac) this._init();
      if (this.ac && this.ac.state !== 'running') this.ac.resume().then(() => this._syncMusic()).catch(() => {});
      else this._syncMusic();
    } catch { /* audio unavailable */ }
  },

  _init() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ac = new AC({ latencyHint: 'interactive' });
    this.ac = ac;
    // iOS: play one silent buffer inside the gesture
    const s = ac.createBufferSource();
    s.buffer = ac.createBuffer(1, 1, 22050);
    s.connect(ac.destination);
    s.start(0);

    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 4;
    comp.attack.value = 0.004; comp.release.value = 0.18;
    this.master = ac.createGain();
    this.master.gain.value = 0.85;
    this.master.connect(comp);
    comp.connect(ac.destination);

    this.sfx = ac.createGain();
    this.sfx.gain.value = 0.42;
    this.sfx.connect(this.master);
    this.music = ac.createGain();
    this.music.gain.value = 0;
    this.music.connect(this.master);

    // generated stereo reverb (exponentially decaying noise)
    this.reverb = ac.createConvolver();
    const len = Math.floor(ac.sampleRate * 2.2);
    const ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3.2;
    }
    this.reverb.buffer = ir;
    this.wet = ac.createGain();
    this.wet.gain.value = 0.26;
    this.reverb.connect(this.wet);
    this.wet.connect(this.master);

    const nlen = ac.sampleRate;
    this.noiseBuf = ac.createBuffer(1, nlen, ac.sampleRate);
    const nd = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < nlen; i++) nd[i] = Math.random() * 2 - 1;

    // a slightly hollow pulse wave (25 % duty) – the classic SID lead colour
    const N = 32, re = new Float32Array(N), im = new Float32Array(N);
    for (let k = 1; k < N; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * 0.25);
    this.pulse = ac.createPeriodicWave(re, im);

    this._sched = setInterval(() => this._tick(), 40);
  },

  ready() { return !!(this.ac && this.ac.state === 'running'); },
  canPlay() { return this.sfxOn && this.ready(); },

  _out(bus, pan, send) {
    const ac = this.ac;
    let node = bus;
    if (pan && ac.createStereoPanner) {
      const p = ac.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      p.connect(bus);
      node = p;
    }
    if (send > 0) {
      const g = ac.createGain();
      g.gain.value = send;
      g.connect(this.reverb);
      return [node, g];
    }
    return [node];
  },

  /**
   * One synth voice. f → f2 pitch glide, optional filter sweep, vibrato,
   * a detuned second oscillator and an attack/decay envelope.
   */
  voice(o) {
    const ac = this.ac;
    const t0 = ac.currentTime + (o.delay || 0) + (o.at || 0);
    const dur = o.dur || 0.1;
    const vol = o.vol == null ? 0.3 : o.vol;
    const g = ac.createGain();
    const atk = o.attack || 0.006;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + atk);
    if (o.sustain) g.gain.setValueAtTime(vol, t0 + Math.max(atk, dur - o.sustain));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let head = g;
    if (o.filter) {
      const f = ac.createBiquadFilter();
      f.type = o.filter;
      f.Q.value = o.q || 1;
      f.frequency.setValueAtTime(o.ff || 2000, t0);
      if (o.ff2) f.frequency.exponentialRampToValueAtTime(o.ff2, t0 + dur);
      f.connect(g);
      head = f;
    }
    for (const out of this._out(o.bus || this.sfx, o.pan, o.send == null ? 0.2 : o.send)) g.connect(out);
    const oscs = o.detune ? [0, o.detune] : [0];
    for (const cents of oscs) {
      const osc = ac.createOscillator();
      if (o.type === 'pulse') osc.setPeriodicWave(this.pulse); else osc.type = o.type || 'square';
      osc.frequency.setValueAtTime(o.f, t0);
      if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + (o.glide || dur));
      osc.detune.value = cents;
      if (o.vib) {
        const lfo = ac.createOscillator();
        const lg = ac.createGain();
        lfo.frequency.value = o.vibRate || 6;
        lg.gain.value = o.vib;
        lfo.connect(lg); lg.connect(osc.frequency);
        lfo.start(t0); lfo.stop(t0 + dur + 0.05);
      }
      const og = oscs.length > 1 ? ac.createGain() : null;
      if (og) { og.gain.value = 0.6; osc.connect(og); og.connect(head); } else osc.connect(head);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    }
  },

  noise(o) {
    const ac = this.ac;
    const t0 = ac.currentTime + (o.delay || 0) + (o.at || 0);
    const dur = o.dur || 0.1;
    const src = ac.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = ac.createBiquadFilter();
    f.type = o.filter || 'lowpass';
    f.Q.value = o.q || 0.8;
    f.frequency.setValueAtTime(o.ff || 2000, t0);
    if (o.ff2) f.frequency.exponentialRampToValueAtTime(o.ff2, t0 + dur);
    const g = ac.createGain();
    const vol = o.vol == null ? 0.3 : o.vol;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + (o.attack || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g);
    for (const out of this._out(o.bus || this.sfx, o.pan, o.send == null ? 0.15 : o.send)) g.connect(out);
    src.start(t0, Math.random() * 0.8);
    src.stop(t0 + dur + 0.05);
  },

  throttle(name, ms) {
    const now = performance.now();
    if (now - (this.last[name] || 0) < ms) return false;
    this.last[name] = now;
    return true;
  },

  /** Plays a named effect. `pan` is -1 … 1 (arena position), `opt` tweaks some effects. */
  play(name, pan = 0, opt = 0) {
    if (!this.canPlay()) return;
    try { this._play(name, pan, opt); } catch { /* never let audio break the game */ }
  },

  _play(name, pan, opt) {
    const v = (o) => this.voice({ pan, ...o });
    const n = (o) => this.noise({ pan, ...o });
    switch (name) {
      // ---------- interface
      case 'tap': if (this.throttle('tap', 40)) v({ f: 1400, f2: 900, dur: 0.05, type: 'triangle', vol: 0.12, send: 0.05 }); break;
      case 'page': n({ dur: 0.35, vol: 0.09, filter: 'bandpass', ff: 600, ff2: 3200, q: 1.2, send: 0.3 }); v({ f: midi(81), dur: 0.5, type: 'sine', vol: 0.05, send: 0.6, delay: 0.05 }); break;
      case 'select': v({ f: 880, dur: 0.05, type: 'pulse', vol: 0.14, filter: 'lowpass', ff: 4000, send: 0.12 }); v({ f: 1320, dur: 0.07, type: 'pulse', vol: 0.12, filter: 'lowpass', ff: 4000, delay: 0.045, send: 0.12 }); break;
      case 'invalid': v({ f: 150, f2: 95, dur: 0.18, type: 'sawtooth', vol: 0.16, filter: 'lowpass', ff: 900, send: 0.05 }); break;
      case 'turn': {
        const light = opt === 'light';
        const notes = light ? [76, 81, 88] : [69, 65, 62];
        notes.forEach((m, i) => v({ f: midi(m), dur: 0.5, type: 'triangle', vol: 0.11, delay: i * 0.08, send: 0.45 }));
        break;
      }
      case 'step': // board walking: one soft knock per square, like the original
        if (this.throttle('step', 50)) {
          const hi = opt === 'light' ? 1 : 0.8;
          v({ f: 520 * hi, f2: 300 * hi, dur: 0.06, type: 'triangle', vol: 0.18, send: 0.08 });
          n({ dur: 0.03, vol: 0.06, filter: 'highpass', ff: 3000, send: 0 });
        }
        break;
      case 'fly': if (this.throttle('fly', 120)) n({ dur: 0.18, vol: 0.06, filter: 'bandpass', ff: 700, ff2: 1600, q: 2, send: 0.1 }); break;
      case 'power': [62, 69, 74, 81].forEach((m, i) => v({ f: midi(m), dur: 0.9, type: 'sine', vol: 0.07, delay: i * 0.05, send: 0.7 })); break;
      case 'combat': // the board dissolves into the arena: rising sweep, impact, chord
        v({ f: 110, f2: 880, dur: 0.75, type: 'sawtooth', vol: 0.14, filter: 'lowpass', ff: 300, ff2: 5000, q: 6, send: 0.3, glide: 0.75 });
        n({ dur: 0.7, vol: 0.12, filter: 'bandpass', ff: 300, ff2: 6000, q: 1.5, send: 0.3 });
        v({ f: 55, f2: 30, dur: 0.9, type: 'sine', vol: 0.5, delay: 0.72, send: 0.2 });
        n({ dur: 0.6, vol: 0.22, ff: 1200, ff2: 100, delay: 0.72, send: 0.4 });
        [50, 57, 62, 65].forEach((m) => v({ f: midi(m), dur: 1.1, type: 'sawtooth', vol: 0.06, filter: 'lowpass', ff: 2400, ff2: 500, detune: 9, delay: 0.72, send: 0.5 }));
        break;
      case 'go': v({ f: midi(74), dur: 0.12, type: 'pulse', vol: 0.18, send: 0.2 }); v({ f: midi(86), dur: 0.3, type: 'pulse', vol: 0.16, detune: 8, delay: 0.1, send: 0.35 }); break;

      // ---------- weapons
      case 'arrow': if (this.throttle('arrow', 40)) { n({ dur: 0.12, vol: 0.14, filter: 'bandpass', ff: 5000, ff2: 1500, q: 2 }); v({ f: 1800, f2: 700, dur: 0.08, type: 'triangle', vol: 0.08 }); } break;
      case 'spear': n({ dur: 0.22, vol: 0.16, filter: 'bandpass', ff: 2500, ff2: 700, q: 1.5 }); v({ f: 980, f2: 420, dur: 0.16, type: 'pulse', vol: 0.08, filter: 'lowpass', ff: 3000 }); break;
      case 'spikes': for (let i = 0; i < 3; i++) v({ f: 2200 - i * 300, f2: 900, dur: 0.05, type: 'pulse', vol: 0.08, delay: i * 0.035 }); break;
      case 'bolt': v({ f: 2400, f2: 300, dur: 0.16, type: 'pulse', vol: 0.12, filter: 'lowpass', ff: 6000, ff2: 1200, send: 0.25 }); v({ f: 3600, f2: 600, dur: 0.12, type: 'sine', vol: 0.06 }); break;
      case 'beam': v({ f: 1200, f2: 2600, dur: 0.22, type: 'sawtooth', vol: 0.08, filter: 'bandpass', ff: 2000, q: 4, vib: 120, vibRate: 30, send: 0.25 }); break;
      case 'lightning': n({ dur: 0.25, vol: 0.2, filter: 'highpass', ff: 2500, send: 0.3 }); v({ f: 900, f2: 200, dur: 0.2, type: 'square', vol: 0.07, vib: 300, vibRate: 45 }); break;
      case 'fireball': n({ dur: 0.4, vol: 0.2, ff: 3000, ff2: 300, send: 0.25 }); v({ f: 180, f2: 70, dur: 0.3, type: 'sawtooth', vol: 0.09, filter: 'lowpass', ff: 900 }); break;
      case 'fire': n({ dur: 0.45, vol: 0.24, ff: 1800, ff2: 250, q: 2, send: 0.2 }); n({ dur: 0.3, vol: 0.1, filter: 'bandpass', ff: 600, q: 3 }); break;
      case 'boulder': v({ f: 95, f2: 45, dur: 0.35, type: 'triangle', vol: 0.35 }); n({ dur: 0.3, vol: 0.2, ff: 700, ff2: 120 }); break;
      case 'whirl': n({ dur: 0.7, vol: 0.16, filter: 'bandpass', ff: 400, ff2: 2200, q: 5, send: 0.3 }); break;
      case 'ice': [2637, 3136, 3951].forEach((f, i) => v({ f, dur: 0.25, type: 'sine', vol: 0.05, delay: i * 0.03, send: 0.5 })); n({ dur: 0.12, vol: 0.08, filter: 'highpass', ff: 5000 }); break;
      case 'swing': n({ dur: 0.12, vol: 0.2, filter: 'bandpass', ff: 1200, ff2: 4500, q: 1.2 }); break;
      case 'scream': v({ f: 1250, f2: 700, dur: 0.95, type: 'sawtooth', vol: 0.07, filter: 'bandpass', ff: 1800, q: 3, vib: 90, vibRate: 9, detune: 25, send: 0.6 }); break;
      case 'explode': n({ dur: 1.0, vol: 0.32, ff: 2600, ff2: 120, send: 0.4 }); v({ f: 140, f2: 40, dur: 0.9, type: 'sawtooth', vol: 0.12, filter: 'lowpass', ff: 800 }); break;

      // ---------- impacts
      case 'tick': if (this.throttle('tick', 110)) v({ f: 340, f2: 200, dur: 0.05, type: 'pulse', vol: 0.08 }); break;
      case 'hit':
        v({ f: 160, f2: 55, dur: 0.16, type: 'sine', vol: 0.5, send: 0.05 });
        n({ dur: 0.14, vol: 0.28, ff: 3500, ff2: 400, send: 0.1 });
        v({ f: 640, f2: 220, dur: 0.08, type: 'pulse', vol: 0.09 });
        break;
      case 'block': if (this.throttle('block', 60)) { n({ dur: 0.07, vol: 0.14, filter: 'bandpass', ff: 1800, q: 4 }); v({ f: 1250, f2: 900, dur: 0.06, type: 'triangle', vol: 0.06 }); } break;
      case 'death': // the long, wavering fall of the original – smoothed and reverberated
        v({ f: 520, f2: 45, dur: 1.4, type: 'sawtooth', vol: 0.16, filter: 'lowpass', ff: 3000, ff2: 300, vib: 40, vibRate: 11, send: 0.5, glide: 1.4 });
        n({ dur: 1.1, vol: 0.2, ff: 1600, ff2: 90, delay: 0.05, send: 0.5 });
        break;
      case 'spell':
        [72, 76, 79, 84, 88, 91].forEach((m, i) => v({ f: midi(m), dur: 0.7, type: 'triangle', vol: 0.09, delay: i * 0.06, send: 0.8 }));
        n({ dur: 1.2, vol: 0.06, filter: 'highpass', ff: 6000, send: 0.8 });
        break;
      case 'heal': [69, 73, 76, 81].forEach((m, i) => v({ f: midi(m), dur: 0.6, type: 'sine', vol: 0.12, delay: i * 0.07, send: 0.6 })); break;
      case 'win': {
        const seq = [[62, 0], [66, 0.16], [69, 0.32], [74, 0.48], [69, 0.72], [74, 0.88], [78, 1.04]];
        seq.forEach(([m, d]) => v({ f: midi(m), dur: 0.38, type: 'pulse', vol: 0.12, detune: 7, delay: d, send: 0.4 }));
        [50, 57, 62, 66].forEach((m) => v({ f: midi(m), dur: 1.8, type: 'sawtooth', vol: 0.05, filter: 'lowpass', ff: 2200, detune: 10, delay: 1.04, send: 0.6, attack: 0.05 }));
        break;
      }
      case 'lose': [[69, 0], [65, 0.3], [62, 0.6], [61, 0.9]].forEach(([m, d]) => v({ f: midi(m), dur: 0.7, type: 'triangle', vol: 0.15, delay: d, send: 0.6 })); break;
      default: break;
    }
  },

  // ============================================================ music (original compositions)
  /** Select the background track: 'theme' (title/menu), 'board', 'arena' or null. */
  setTrack(name) {
    this._wanted = name;
    this._syncMusic();
  },
  setMusic(on) { this.musicOn = on; this._syncMusic(); },

  _syncMusic() {
    if (!this.ac) return;
    const want = this.musicOn ? this._wanted : null;
    const now = this.ac.currentTime;
    if (want !== this.track) {
      this.track = want;
      this.music.gain.cancelScheduledValues(now);
      this.music.gain.setValueAtTime(0, now);
      if (want) {
        this.step = 0;
        this.nextTime = now + 0.12;
        this.music.gain.linearRampToValueAtTime(TRACKS[want].vol, now + 1.2);
      }
    }
  },

  _tick() {
    if (!this.track || !this.ready()) return;
    const T = TRACKS[this.track];
    const sixteenth = 60 / T.bpm / 4;
    const ahead = this.ac.currentTime + 0.25;
    if (this.nextTime < this.ac.currentTime - 0.5) this.nextTime = this.ac.currentTime + 0.05; // resumed after a pause
    while (this.nextTime < ahead) {
      try { T.play(this, this.step, this.nextTime - this.ac.currentTime, sixteenth); } catch { /* ignore */ }
      this.step++;
      this.nextTime += sixteenth;
    }
  },

  /** A music note (scheduled `at` seconds from now). */
  note(m, at, dur, o = {}) {
    this.voice({ f: midi(m), at, dur, bus: this.music, send: 0.35, vol: 0.1, ...o });
  },
};

// Chords as MIDI notes. D minor – an original progression.
const PROG_THEME = [[50, 57, 62, 65], [46, 53, 58, 62], [41, 48, 57, 60], [48, 55, 60, 64], [50, 57, 62, 65], [43, 50, 58, 62], [46, 53, 58, 65], [45, 52, 57, 61]];
// [step, note, length in 16ths] per bar – a slow, heroic melody
const MELODY = [
  [[0, 69, 4], [4, 74, 4], [8, 77, 6], [14, 76, 2]],
  [[0, 74, 6], [6, 72, 2], [8, 70, 8]],
  [[0, 69, 4], [4, 72, 4], [8, 77, 8]],
  [[0, 79, 6], [6, 77, 2], [8, 76, 8]],
  [[0, 77, 4], [4, 76, 2], [6, 74, 2], [8, 81, 8]],
  [[0, 79, 4], [4, 77, 4], [8, 74, 8]],
  [[0, 77, 4], [4, 74, 4], [8, 70, 6], [14, 72, 2]],
  [[0, 73, 8], [8, 76, 8]],
];
const ARP = [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 2, 3, 2, 1];

const TRACKS = {
  theme: {
    bpm: 84, vol: 0.55,
    play(S, step, at, s16) {
      const bar = Math.floor(step / 16) % 8;
      const pass = Math.floor(step / 128) % 2; // the melody joins on every second pass
      const i = step % 16;
      const ch = PROG_THEME[bar];
      if (i === 0) {
        for (const m of ch.slice(1)) S.note(m, at, s16 * 16, { type: 'sawtooth', vol: 0.035, filter: 'lowpass', ff: 1400, detune: 12, attack: 0.4, sustain: s16 * 6, send: 0.6 });
        S.note(ch[0] - 12, at, s16 * 7, { type: 'triangle', vol: 0.22, send: 0.1 });
      }
      if (i === 8) S.note(ch[0] - 5, at, s16 * 7, { type: 'triangle', vol: 0.16, send: 0.1 });
      S.note(ch[ARP[i]] + 12, at, s16 * 1.6, { type: 'pulse', vol: 0.045, filter: 'lowpass', ff: 2600, send: 0.3 });
      if (pass === 1) {
        for (const [st, m, len] of MELODY[bar]) {
          if (st === i) S.note(m, at, s16 * len, { type: 'pulse', vol: 0.07, filter: 'lowpass', ff: 3200, detune: 6, vib: 4, vibRate: 5, attack: 0.02, sustain: s16 * len * 0.5, send: 0.45 });
        }
      }
    },
  },
  board: {
    bpm: 66, vol: 0.4,
    play(S, step, at, s16) {
      const bar = Math.floor(step / 32) % 4; // two bars per chord
      const ch = [PROG_THEME[0], PROG_THEME[2], PROG_THEME[5], PROG_THEME[7]][bar];
      const i = step % 32;
      if (i === 0) {
        for (const m of ch) S.note(m, at, s16 * 32, { type: 'sine', vol: 0.05, attack: 1.2, sustain: s16 * 16, send: 0.7 });
        S.note(ch[0] - 12, at, s16 * 30, { type: 'triangle', vol: 0.12, attack: 0.6, sustain: s16 * 12, send: 0.2 });
      }
      // sparse bells – a slow, thinking pulse
      if (i % 6 === 0 && Math.random() < 0.55) {
        const m = ch[1 + Math.floor(Math.random() * 3)] + 24;
        S.note(m, at, 1.6, { type: 'sine', vol: 0.035, send: 0.85 });
      }
    },
  },
  arena: {
    bpm: 138, vol: 0.32,
    play(S, step, at, s16) {
      const bar = Math.floor(step / 32) % 4;
      const root = [38, 34, 36, 33][bar];
      const i = step % 16;
      if (i % 2 === 0) S.note(root + (i === 6 || i === 14 ? 12 : 0), at, s16 * 1.5, { type: 'pulse', vol: 0.13, filter: 'lowpass', ff: 900, send: 0.05 });
      if (i % 4 === 2) S.noise({ at, dur: 0.05, vol: 0.05, filter: 'highpass', ff: 7000, bus: S.music, send: 0.05 });
      if (i === 0 || i === 10) S.voice({ f: 70, f2: 40, at, dur: 0.18, type: 'sine', vol: 0.3, bus: S.music, send: 0 });
    },
  },
};
