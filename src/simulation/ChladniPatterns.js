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
    for (let iy = 0; iy < s && points.length < maxPoints; iy += 2) {
      for (let ix = 0; ix < s && points.length < maxPoints; ix += 2) {
        if (this.grid[iy * s + ix] > 0.5) {
          points.push([ix / s, iy / s]);
        }
      }
    }
    return points;
  }
}
