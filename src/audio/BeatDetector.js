export class BeatDetector {
  constructor() {
    this.beatValue = 0;
    this.avgBass = 0;
    this.kickTimes = [];
    this.bpm = 0;
    this.dropIntensity = 0;
    this._prevEnergy = 0;
    this._result = { beat: 0, isKick: false, bpm: 0, dropIntensity: 0 };
  }

  update(freqData) {
    const { bass } = freqData;

    // Running average for kick threshold
    this.avgBass = this.avgBass * 0.95 + bass * 0.05;

    const isKick = bass > this.avgBass * 1.15 && bass > 0.1;
    if (isKick) {
      const now = performance.now();
      this.kickTimes.push(now);
      if (this.kickTimes.length > 8) this.kickTimes.shift();

      // Estimate BPM from inter-kick intervals
      if (this.kickTimes.length >= 2) {
        let intervalSum = 0;
        for (let i = 1; i < this.kickTimes.length; i++)
          intervalSum += this.kickTimes[i] - this.kickTimes[i - 1];
        const avg = intervalSum / (this.kickTimes.length - 1);
        this.bpm = Math.round(60000 / avg);
      }

      this.beatValue = 1.0;
    }

    // Decay beat value each frame
    this.beatValue *= 0.94;

    // Drop detection: sudden large energy increase
    const energyDelta = bass - this._prevEnergy;
    this.dropIntensity = energyDelta > 0.2 ? energyDelta : this.dropIntensity * 0.9;
    this._prevEnergy = bass;

    this._result.beat = this.beatValue;
    this._result.isKick = isKick;
    this._result.bpm = this.bpm;
    this._result.dropIntensity = this.dropIntensity;
    return this._result;
  }
}
