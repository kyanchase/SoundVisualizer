const PARTICLE_COUNT = 5000;

export class ParticleSystem {
  constructor() {
    this.positions = new Float32Array(PARTICLE_COUNT * 2);
    this.velocities = new Float32Array(PARTICLE_COUNT * 2);
    this._init();
  }

  _init() {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.positions[i * 2]     = (Math.random() * 2 - 1);
      this.positions[i * 2 + 1] = (Math.random() * 2 - 1);
      this.velocities[i * 2]     = 0;
      this.velocities[i * 2 + 1] = 0;
    }
  }

  update(audioState, nodalPoints) {
    const { bass, mid, treble, beat } = audioState;
    const vibration = treble * 0.0025 + bass * 0.0008 + 0.00045;
    const attraction = 0.012 + bass * 0.024 + mid * 0.01;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const px = this.positions[i * 2];
      const py = this.positions[i * 2 + 1];

      // Fine vibration keeps the sand alive without turning the plate into noise.
      this.velocities[i * 2]     += (Math.random() - 0.5) * vibration;
      this.velocities[i * 2 + 1] += (Math.random() - 0.5) * vibration;

      // Beat shockwave — push particles outward
      if (beat > 0.7) {
        const mag = Math.sqrt(px * px + py * py) + 0.001;
        this.velocities[i * 2]     += (px / mag) * beat * 0.006;
        this.velocities[i * 2 + 1] += (py / mag) * beat * 0.006;
      }

      // Attract toward nearest nodal point
      if (nodalPoints && nodalPoints.length > 0) {
        // map particle coords (-1..1) to nodal space (0..1)
        const npx = (px + 1) * 0.5;
        const npy = (py + 1) * 0.5;
        let bestDist = Infinity;
        let bx = 0, by = 0;
        const step = Math.max(1, Math.floor(nodalPoints.length / 36));
        for (let j = 0; j < nodalPoints.length; j += step) {
          const dx = nodalPoints[j][0] - npx;
          const dy = nodalPoints[j][1] - npy;
          const d2 = dx * dx + dy * dy;
          if (d2 < bestDist) { bestDist = d2; bx = dx; by = dy; }
        }
        if (bestDist < 0.09) {
          this.velocities[i * 2]     += bx * attraction;
          this.velocities[i * 2 + 1] += by * attraction;
        }
      }

      // Damping
      this.velocities[i * 2]     *= 0.88;
      this.velocities[i * 2 + 1] *= 0.88;

      // Integrate
      this.positions[i * 2]     += this.velocities[i * 2];
      this.positions[i * 2 + 1] += this.velocities[i * 2 + 1];

      // Wrap at boundaries
      if (this.positions[i * 2]     >  1.1) this.positions[i * 2]     = -1.1;
      if (this.positions[i * 2]     < -1.1) this.positions[i * 2]     =  1.1;
      if (this.positions[i * 2 + 1] >  1.1) this.positions[i * 2 + 1] = -1.1;
      if (this.positions[i * 2 + 1] < -1.1) this.positions[i * 2 + 1] =  1.1;
    }
  }

  get count() { return PARTICLE_COUNT; }
}
