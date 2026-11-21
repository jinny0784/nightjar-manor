// Nightjar — every sound is synthesized with WebAudio. No audio files.
//
// A low ambient drone runs under play; footsteps, coin clinks, camera
// beeps, the alarm, the shutter and the floor-clear sting are all short
// oscillator/noise envelopes built on the fly.

const SoundSynth = {
  ctx: null,
  master: null,
  muted: false,
  droneNodes: null,
  stepAlt: false,

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
  },

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  },

  // A short tone with an exponential decay envelope.
  tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  },

  // Filtered noise burst — footsteps, cloth, the shutter.
  noise(dur, filterFreq, vol, type) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type || 'lowpass';
    filter.frequency.value = filterFreq || 800;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol || 0.15, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t);
  },

  footstep(sneaking, dist) {
    // Quieter with distance; the player hears their own feet too.
    const vol = sneaking ? 0.05 : Math.max(0.03, 0.16 - dist / 1400);
    if (vol <= 0.03 && dist > 10) return;
    this.stepAlt = !this.stepAlt;
    this.noise(0.07, this.stepAlt ? 500 : 380, vol);
  },

  guardStep(dist) {
    const vol = Math.max(0.02, 0.13 - dist / 1600);
    if (vol <= 0.02) return;
    this.noise(0.08, 300, vol);
  },

  coinClink() {
    this.tone(2093, 0.12, 'sine', 0.22);
    setTimeout(() => this.tone(2637, 0.18, 'sine', 0.16), 70);
  },

  coinThrow() {
    this.noise(0.12, 2400, 0.08, 'highpass');
  },

  suspicious() {
    this.tone(392, 0.14, 'triangle', 0.16);
    setTimeout(() => this.tone(330, 0.2, 'triangle', 0.14), 120);
  },

  spotted() {
    this.tone(220, 0.28, 'sawtooth', 0.18, 440);
    setTimeout(() => this.tone(440, 0.22, 'sawtooth', 0.14, 220), 200);
  },

  cameraBeep() {
    this.tone(1568, 0.09, 'square', 0.07);
  },

  alarmLoop(on) {
    if (!this.ctx) return;
    if (on && !this._alarmTimer) {
      this._alarmTimer = setInterval(() => {
        this.tone(660, 0.16, 'square', 0.08);
        setTimeout(() => this.tone(520, 0.16, 'square', 0.08), 180);
      }, 420);
    } else if (!on && this._alarmTimer) {
      clearInterval(this._alarmTimer);
      this._alarmTimer = null;
    }
  },

  shutter() {
    this.noise(0.05, 3200, 0.3, 'highpass');
    setTimeout(() => this.tone(1800, 0.08, 'sine', 0.12), 40);
  },

  floorClear() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => setTimeout(() => this.tone(n, 0.35, 'triangle', 0.16), i * 110));
  },

  caught() {
    this.tone(196, 0.5, 'sawtooth', 0.2, 98);
    setTimeout(() => this.tone(147, 0.6, 'sawtooth', 0.16, 73), 300);
  },

  startDrone() {
    if (!this.ctx || this.droneNodes) return;
    const g = this.ctx.createGain();
    g.gain.value = 0.035;
    g.connect(this.master);
    const o1 = this.ctx.createOscillator();
    o1.type = 'sine';
    o1.frequency.value = 55;
    const o2 = this.ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = 55.7;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.015;
    lfo.connect(lfoGain);
    lfoGain.connect(g.gain);
    o1.connect(g);
    o2.connect(g);
    o1.start();
    o2.start();
    lfo.start();
    this.droneNodes = { g, o1, o2, lfo };
  },

  stopDrone() {
    if (!this.droneNodes) return;
    try {
      this.droneNodes.o1.stop();
      this.droneNodes.o2.stop();
      this.droneNodes.lfo.stop();
      this.droneNodes.g.disconnect();
    } catch (e) { /* already stopped */ }
    this.droneNodes = null;
  },
};
