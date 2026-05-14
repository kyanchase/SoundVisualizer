import { FFTAnalyzer } from './FFTAnalyzer.js';
import { BeatDetector } from './BeatDetector.js';
import { MoodAnalyzer } from './MoodAnalyzer.js';

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.analyzerModule = null;
    this.beatDetector = new BeatDetector();
    this.moodAnalyzer = new MoodAnalyzer();
    this.audioElement = null;
    this.isPaused = false;
    this.trackName = 'OFFLINE';
    this._state = this._emptyState();
  }

  _emptyState() {
    return {
      bass: 0, lowMid: 0, mid: 0, highMid: 0, treble: 0, air: 0,
      beat: 0, bpm: 0, dropIntensity: 0,
      mood: { energy: 0, tension: 0, smoothness: 1, chaos: 0 },
      raw: new Uint8Array(1024),
      active: false,
    };
  }

  _setup(sourceNode) {
    this.analyzerModule = new FFTAnalyzer(this.ctx);
    sourceNode.connect(this.analyzerModule.node);
    this._state.active = true;
  }

  async initMic() {
    this.ctx = new AudioContext();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = this.ctx.createMediaStreamSource(stream);
    this._setup(source);
    this.trackName = 'LIVE MIC';
  }

  initFile(file) {
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.ctx = new AudioContext();
    this.audioElement = new Audio(URL.createObjectURL(file));
    this.audioElement.loop = false;
    const source = this.ctx.createMediaElementSource(this.audioElement);
    this._setup(source);
    this.analyzerModule.node.connect(this.ctx.destination);
    this.audioElement.play();
    this.trackName = file.name.slice(0, 14).toUpperCase();
    this.isPaused = false;
  }

  togglePlayback() {
    this.isPaused = !this.isPaused;
    if (this.audioElement) {
      this.isPaused ? this.audioElement.pause() : this.audioElement.play();
    }
  }

  getAudioState() {
    if (!this.analyzerModule || this.isPaused) return this._state;

    const freqData = this.analyzerModule.getFrequencyData();
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
      active:       true,
    };
    return this._state;
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }
}
