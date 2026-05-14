import { FFTAnalyzer } from './FFTAnalyzer.js';
import { BeatDetector } from './BeatDetector.js';
import { MoodAnalyzer } from './MoodAnalyzer.js';
import { DEFAULT_AUDIO_PARAMS, VIBES } from './vibes.js';

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.analyzerModule = null;
    this.beatDetector = new BeatDetector();
    this.moodAnalyzer = new MoodAnalyzer();
    this.audioElement = null;
    this.sourceNode = null;
    this.effectNodes = {};
    this.mediaStream = null;
    this.isPaused = false;
    this.trackName = 'OFFLINE';
    this.live = { ...DEFAULT_AUDIO_PARAMS };
    this.pitchLock = false;
    this._state = this._emptyState();
  }

  _emptyState() {
    return {
      bass: 0, lowMid: 0, mid: 0, highMid: 0, treble: 0, air: 0,
      beat: 0, bpm: 0, dropIntensity: 0,
      mood: { energy: 0, tension: 0, smoothness: 1, chaos: 0 },
      raw: new Uint8Array(1024),
      timeRaw: new Uint8Array(2048),
      active: false,
    };
  }

  _setup(sourceNode, { monitor = true } = {}) {
    this.analyzerModule = new FFTAnalyzer(this.ctx);
    this.sourceNode = sourceNode;
    this._buildEffectsGraph(monitor);
    sourceNode.connect(this.effectNodes.highpass);
    this._state.active = true;
  }

  _buildEffectsGraph(monitor) {
    const ctx = this.ctx;

    this.effectNodes.highpass = ctx.createBiquadFilter();
    this.effectNodes.highpass.type = 'highpass';

    this.effectNodes.lowpass = ctx.createBiquadFilter();
    this.effectNodes.lowpass.type = 'lowpass';

    this.effectNodes.bassEQ = ctx.createBiquadFilter();
    this.effectNodes.bassEQ.type = 'lowshelf';
    this.effectNodes.bassEQ.frequency.value = 200;

    this.effectNodes.midEQ = ctx.createBiquadFilter();
    this.effectNodes.midEQ.type = 'peaking';
    this.effectNodes.midEQ.frequency.value = 1000;
    this.effectNodes.midEQ.Q.value = 1;

    this.effectNodes.highEQ = ctx.createBiquadFilter();
    this.effectNodes.highEQ.type = 'highshelf';
    this.effectNodes.highEQ.frequency.value = 4000;

    this.effectNodes.distortion = ctx.createWaveShaper();
    this.effectNodes.distortion.oversample = '4x';

    this.effectNodes.compressor = ctx.createDynamicsCompressor();
    this.effectNodes.compressor.threshold.value = -24;
    this.effectNodes.compressor.ratio.value = 1;
    this.effectNodes.compressor.attack.value = 0.003;
    this.effectNodes.compressor.release.value = 0.25;

    this.effectNodes.reverb = ctx.createConvolver();
    this.effectNodes.reverb.buffer = this._makeImpulseResponse(3, 2.5);

    this.effectNodes.reverbWet = ctx.createGain();
    this.effectNodes.reverbDry = ctx.createGain();
    this.effectNodes.vinylGain = ctx.createGain();
    this.effectNodes.master = ctx.createGain();
    this.effectNodes.master.gain.value = monitor ? 0.9 : 0;

    this.effectNodes.vinylNoise = this._createVinylNoise();

    this.effectNodes.highpass.connect(this.effectNodes.lowpass);
    this.effectNodes.lowpass.connect(this.effectNodes.bassEQ);
    this.effectNodes.bassEQ.connect(this.effectNodes.midEQ);
    this.effectNodes.midEQ.connect(this.effectNodes.highEQ);
    this.effectNodes.highEQ.connect(this.effectNodes.distortion);
    this.effectNodes.distortion.connect(this.effectNodes.compressor);
    this.effectNodes.compressor.connect(this.effectNodes.reverbDry);
    this.effectNodes.compressor.connect(this.effectNodes.reverb);
    this.effectNodes.reverb.connect(this.effectNodes.reverbWet);
    this.effectNodes.reverbDry.connect(this.effectNodes.master);
    this.effectNodes.reverbWet.connect(this.effectNodes.master);
    this.effectNodes.vinylNoise.connect(this.effectNodes.vinylGain);
    this.effectNodes.vinylGain.connect(this.effectNodes.master);
    this.effectNodes.master.connect(this.analyzerModule.node);
    if (monitor) this.analyzerModule.node.connect(ctx.destination);

    this._applyLive();
  }

  _makeImpulseResponse(duration, decay) {
    const rate = this.ctx.sampleRate;
    const length = Math.floor(rate * duration);
    const impulse = this.ctx.createBuffer(2, length, rate);

    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }

    return impulse;
  }

  _createVinylNoise() {
    const size = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;

    for (let i = 0; i < size; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.099046;
      b1 = 0.963 * b1 + white * 0.2965164;
      b2 = 0.57 * b2 + white * 1.0526913;
      let pink = b0 + b1 + b2 + white * 0.1848;
      if (Math.random() < 0.0008) pink += (Math.random() - 0.5) * 4;
      data[i] = pink * 0.08;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    noise.start();
    return noise;
  }

  _distortionCurve(amount) {
    const samples = 2048;
    const curve = new Float32Array(samples);
    const k = amount * 100;

    if (amount < 0.001) {
      for (let i = 0; i < samples; i++) curve[i] = (i * 2) / samples - 1;
      return curve;
    }

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + k) * x * 20 * Math.PI / 180) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  _applyLive() {
    if (!this.ctx || !this.effectNodes.highpass) return;

    const params = this.live;
    const now = this.ctx.currentTime;
    const ramp = 0.15;

    this.effectNodes.highpass.frequency.setTargetAtTime(params.highpass, now, ramp);
    this.effectNodes.lowpass.frequency.setTargetAtTime(params.lowpass, now, ramp);
    this.effectNodes.bassEQ.gain.setTargetAtTime(params.bassGain, now, ramp);
    this.effectNodes.midEQ.gain.setTargetAtTime(params.midGain, now, ramp);
    this.effectNodes.highEQ.gain.setTargetAtTime(params.highGain, now, ramp);
    this.effectNodes.reverbWet.gain.setTargetAtTime(params.reverbWet, now, ramp);
    this.effectNodes.reverbDry.gain.setTargetAtTime(1 - params.reverbWet * 0.5, now, ramp);
    this.effectNodes.vinylGain.gain.setTargetAtTime(params.vinyl, now, ramp);
    this.effectNodes.distortion.curve = this._distortionCurve(params.distortion);
    this.effectNodes.compressor.threshold.setTargetAtTime(-24 - params.compression * 20, now, ramp);
    this.effectNodes.compressor.ratio.setTargetAtTime(1 + params.compression * 10, now, ramp);

    if (this.audioElement) {
      this.audioElement.playbackRate = params.tempo;
      this.audioElement.preservesPitch = this.pitchLock;
      this.audioElement.mozPreservesPitch = this.pitchLock;
      this.audioElement.webkitPreservesPitch = this.pitchLock;
    }
  }

  async initMic() {
    await this._resetContext();
    this.ctx = new AudioContext();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaStream = stream;
    const source = this.ctx.createMediaStreamSource(stream);
    this._setup(source, { monitor: false });
    this.trackName = 'LIVE MIC';
  }

  async initFile(file) {
    await this._resetContext();
    this.ctx = new AudioContext();
    this.audioElement = new Audio(URL.createObjectURL(file));
    this.audioElement.loop = false;
    const source = this.ctx.createMediaElementSource(this.audioElement);
    this._setup(source);
    this._applyLive();
    await this.audioElement.play();
    this.trackName = file.name.slice(0, 14).toUpperCase();
    this.isPaused = false;
  }

  async _resetContext() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioElement?.src) URL.revokeObjectURL(this.audioElement.src);
    if (this.ctx) await this.ctx.close();
    this.ctx = null;
    this.audioElement = null;
    this.sourceNode = null;
    this.effectNodes = {};
    this.analyzerModule = null;
    this._state = this._emptyState();
  }

  togglePlayback() {
    if (!this.audioElement) return this.isPaused;
    this.isPaused = !this.isPaused;
    this.isPaused ? this.audioElement.pause() : this.audioElement.play();
    return this.isPaused;
  }

  applyVibe(name) {
    const vibe = VIBES[name];
    if (!vibe) return this.live;
    this.live = { ...vibe.audio };
    this.pitchLock = vibe.pitchLock;
    this._applyLive();
    return this.live;
  }

  setParam(key, value) {
    if (!(key in this.live)) return this.live;
    this.live = { ...this.live, [key]: value };
    this._applyLive();
    return this.live;
  }

  setPitchLock(locked) {
    this.pitchLock = locked;
    this._applyLive();
    return this.pitchLock;
  }

  getAudioState() {
    if (!this.analyzerModule || this.isPaused) return this._state;

    const freqData = this.analyzerModule.getFrequencyData();
    const timeRaw = this.analyzerModule.getTimeDomainData();
    const beatData = this.beatDetector.update(freqData);
    const mood = this.moodAnalyzer.update(freqData);

    this._state = {
      bass:         freqData.bass,
      lowMid:       freqData.lowMid,
      mid:          freqData.mid,
      highMid:      freqData.highMid,
      treble:       freqData.treble,
      air:          freqData.air,
      beat:         beatData.beat,
      bpm:          beatData.bpm,
      dropIntensity: beatData.dropIntensity,
      mood,
      raw:          freqData.raw,
      timeRaw,
      active:       true,
    };
    return this._state;
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  destroy() {
    return this._resetContext();
  }
}
