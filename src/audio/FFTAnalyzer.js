import { BANDS, sliceBand } from './FrequencyBands.js';

export class FFTAnalyzer {
  constructor(audioContext) {
    this.analyser = audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;
    this._data = new Uint8Array(this.analyser.frequencyBinCount);
    this._timeData = new Uint8Array(this.analyser.fftSize);
  }

  get node() { return this.analyser; }

  getFrequencyData() {
    this.analyser.getByteFrequencyData(this._data);
    return {
      bass:    sliceBand(this._data, BANDS.bass),
      lowMid:  sliceBand(this._data, BANDS.lowMid),
      mid:     sliceBand(this._data, BANDS.mid),
      highMid: sliceBand(this._data, BANDS.highMid),
      treble:  sliceBand(this._data, BANDS.treble),
      air:     sliceBand(this._data, BANDS.air),
      raw:     this._data,
    };
  }

  getTimeDomainData() {
    this.analyser.getByteTimeDomainData(this._timeData);
    return this._timeData;
  }
}
