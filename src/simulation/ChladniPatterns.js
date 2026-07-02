import { WaveField } from './WaveField.js';

// Identifies nodal regions (near zero) from a standing wave — sand collects there
export class ChladniPatterns extends WaveField {
  constructor(standingWaveSim, threshold = 0.12) {
    super(standingWaveSim.size);
    this.source = standingWaveSim;
    this.threshold = threshold;
  }

  update(audioState) {
    const { bass } = audioState;
    const thresh = this.threshold + bass * 0.05;
    this.source.update(audioState);

    for (let i = 0; i < this.grid.length; i++) {
      // 1.0 = nodal (sand collects), 0.0 = antinode (sand blown away)
      this.grid[i] = Math.abs(this.source.grid[i]) < thresh ? 1.0 : 0.0;
    }
  }

  // Returns list of nodal [x,y] positions (normalized 0..1) for particle attraction
  getNodalPoints(maxPoints = 200) {
    const points = [];
    const s = this.size;
    const stride = Math.max(2, Math.floor(Math.sqrt((s * s) / Math.max(1, maxPoints * 4))));
    const offset = Math.floor((this.source.phase * 17) % stride);
    for (let iy = offset; iy < s; iy += stride) {
      for (let ix = offset; ix < s; ix += stride) {
        if (this.grid[iy * s + ix] > 0.5) {
          points.push([ix / s, iy / s]);
          if (points.length >= maxPoints) return points;
        }
      }
    }
    return points;
  }
}
