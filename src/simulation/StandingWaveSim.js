import { WaveField } from './WaveField.js';

export class StandingWaveSim extends WaveField {
  constructor(size = 128) {
    super(size);
    this.phase = 0;
  }

  update(audioState) {
    const { bass, mid } = audioState;
    const s = this.size;
    // a driven by bass, b driven by mid — map to resonant integers
    const a = 1 + Math.round(bass * 6);
    const b = 1 + Math.round(mid * 6);
    this.phase += 0.02;

    for (let iy = 0; iy < s; iy++) {
      for (let ix = 0; ix < s; ix++) {
        const x = (ix / s) * Math.PI * 2;
        const y = (iy / s) * Math.PI * 2;
        this.grid[iy * s + ix] = Math.sin(a * x + this.phase) * Math.sin(b * y + this.phase * 0.7);
      }
    }
  }
}
