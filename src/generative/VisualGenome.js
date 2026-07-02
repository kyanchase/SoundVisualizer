const GENES = {
  hueShift: [0, 1],
  saturation: [0.35, 1.75],
  bloomAmount: [0, 1.8],
  turbulence: [0, 1],
  particleChaos: [0, 1],
  symmetry: [1, 12],
  noiseScale: [0.25, 5],
  feedbackDecay: [0.82, 0.985],
  rotationSpeed: [-1.5, 1.5],
  geometryDensity: [0.2, 2.2],
  pulseStrength: [0, 1.8],
  distortionAmount: [0, 1],
  chromaticAberration: [0, 1],
  waveComplexity: [0.2, 2.6],
  fractalInfluence: [0, 1],
};

export const GENE_KEYS = Object.keys(GENES);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerp = (a, b, t) => a + (b - a) * t;

export class VisualGenome {
  constructor(values = {}) {
    for (const key of GENE_KEYS) {
      const [min, max] = GENES[key];
      this[key] = clamp(values[key] ?? (min + max) * 0.5, min, max);
    }
  }

  static get ranges() {
    return GENES;
  }

  static random(random = Math.random) {
    const values = {};
    for (const key of GENE_KEYS) {
      const [min, max] = GENES[key];
      values[key] = lerp(min, max, random());
    }
    return new VisualGenome(values);
  }

  static fromJSON(json) {
    return new VisualGenome(typeof json === 'string' ? JSON.parse(json) : json);
  }

  clone() {
    return new VisualGenome(this.toObject());
  }

  toObject() {
    return GENE_KEYS.reduce((acc, key) => {
      acc[key] = this[key];
      return acc;
    }, {});
  }

  toJSON() {
    return this.toObject();
  }

  mutate(deltas = {}, amount = 1) {
    for (const key of GENE_KEYS) {
      if (typeof deltas[key] !== 'number') continue;
      const [min, max] = GENES[key];
      this[key] = clamp(this[key] + deltas[key] * amount * (max - min), min, max);
    }
    return this;
  }

  blend(other, t = 0.5) {
    const values = {};
    for (const key of GENE_KEYS) values[key] = lerp(this[key], other[key], t);
    return new VisualGenome(values);
  }

  static interpolate(a, b, t = 0.5) {
    return a.blend(b, t);
  }

  toUniformArray(target = new Float32Array(GENE_KEYS.length)) {
    for (let i = 0; i < GENE_KEYS.length; i++) {
      target[i] = this[GENE_KEYS[i]];
    }
    return target;
  }
}
