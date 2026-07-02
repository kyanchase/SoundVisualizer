export class MoodAnalyzer {
  constructor() {
    this._prevCentroid = 0;
    this._centroidHistory = [];
    this._energyHistory = [];
    this.mood = { energy: 0, tension: 0, smoothness: 1, chaos: 0 };
  }

  update(freqData) {
    const { bass, lowMid, mid, highMid, treble, air, raw } = freqData;

    // RMS energy
    let rms = 0;
    for (let i = 0; i < raw.length; i++) rms += (raw[i] / 255) ** 2;
    const energy = Math.sqrt(rms / raw.length);

    // Spectral centroid (weighted mean frequency index)
    let weightedSum = 0, totalAmp = 0;
    for (let i = 0; i < raw.length; i++) {
      weightedSum += i * raw[i];
      totalAmp += raw[i];
    }
    const centroid = totalAmp > 0 ? weightedSum / totalAmp / raw.length : 0;

    // Tension: ratio of high-freq energy vs total
    const tension = (highMid + treble + air) / (bass + lowMid + mid + highMid + treble + air + 0.001);

    // Smoothness: inverse of frame-to-frame energy variance
    this._energyHistory.push(energy);
    if (this._energyHistory.length > 30) this._energyHistory.shift();
    const avgE = this._energyHistory.reduce((a, b) => a + b, 0) / this._energyHistory.length;
    const variance = this._energyHistory.reduce((a, b) => a + (b - avgE) ** 2, 0) / this._energyHistory.length;
    const smoothness = Math.max(0, 1 - variance * 20);

    // Chaos: rate of spectral centroid change
    this._centroidHistory.push(centroid);
    if (this._centroidHistory.length > 10) this._centroidHistory.shift();
    const centroidDelta = Math.abs(centroid - this._prevCentroid);
    const chaos = Math.min(1, centroidDelta * 30);
    this._prevCentroid = centroid;

    this.mood.energy = energy;
    this.mood.tension = tension;
    this.mood.smoothness = smoothness;
    this.mood.chaos = chaos;
    return this.mood;
  }
}
