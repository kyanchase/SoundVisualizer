export class WaveField {
  constructor(size = 128) {
    this.size = size;
    this.grid = new Float32Array(size * size);
  }

  update(_audioState) {
    // Override in subclasses
  }

  getHeightAt(x, y) {
    const s = this.size;
    const ix = Math.floor(x) & (s - 1);
    const iy = Math.floor(y) & (s - 1);
    return this.grid[iy * s + ix];
  }

  // Returns grid as Uint8 for texture upload
  toTexture() {
    const out = new Uint8Array(this.size * this.size);
    for (let i = 0; i < this.grid.length; i++) {
      out[i] = Math.floor((this.grid[i] * 0.5 + 0.5) * 255);
    }
    return out;
  }
}
