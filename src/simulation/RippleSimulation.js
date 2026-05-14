import { WaveField } from './WaveField.js';

export class RippleSimulation extends WaveField {
  constructor(size = 128) {
    super(size);
    this.time = 0;
    this.sources = [{ x: size / 2, y: size / 2 }];
  }

  addSource(x, y) {
    this.sources.push({ x, y, born: this.time });
    if (this.sources.length > 6) this.sources.shift();
  }

  update(audioState) {
    const { bass, treble, beat } = audioState;
    const s = this.size;
    this.time += 0.05;

    // Add ripple source on beats
    if (beat > 0.8) {
      this.addSource(
        s * (0.3 + Math.random() * 0.4),
        s * (0.3 + Math.random() * 0.4)
      );
    }

    const f = 1.5 + bass * 3.0;
    const omega = this.time * 2.0;

    for (let iy = 0; iy < s; iy++) {
      for (let ix = 0; ix < s; ix++) {
        let z = 0;
        for (const src of this.sources) {
          const dx = ix - src.x;
          const dy = iy - src.y;
          const r = Math.sqrt(dx * dx + dy * dy) * 0.12;
          // z(r,t) = sin(f*r - omega*t)
          const coarse = Math.sin(f * r - omega) * (0.6 / (r + 1));
          const fine = Math.sin(r * (4 + treble * 8) - omega * 2.5) * 0.15;
          z += coarse + fine;
        }
        this.grid[iy * s + ix] = Math.max(-1, Math.min(1, z));
      }
    }
  }
}
