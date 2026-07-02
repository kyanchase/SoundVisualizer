import { GENE_KEYS, VisualGenome } from './VisualGenome.js';
import { noise2 } from '../utils/Noise.js';

const mulberry32 = (seed) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

export class MutationEngine {
  constructor({ seed = 1337 } = {}) {
    this.random = mulberry32(seed);
    this.seedOffsets = GENE_KEYS.reduce((acc, key) => {
      acc[key] = this.random() * 1000;
      return acc;
    }, {});
    this.target = null;
    this.lastStrongMutation = 0;
  }

  update(genome, audioState, time, controls) {
    if (!this.target) this.target = genome.clone();

    const energy = audioState.mood?.energy ?? 0;
    const drop = audioState.dropIntensity ?? 0;
    const beat = audioState.beat ?? 0;
    const intensity = controls.evolutionIntensity * (0.36 + energy * 0.82);
    const speed = controls.mutationSpeed;
    const chaos = controls.chaosAmount;

    if (drop > 0.18 && time - this.lastStrongMutation > 1.25) {
      this._strongMutation(drop * intensity * (0.5 + chaos));
      this.lastStrongMutation = time;
    }

    for (const key of GENE_KEYS) {
      const [min, max] = VisualGenome.ranges[key];
      const span = max - min;
      const drift = noise2(time * 0.08 * (0.35 + speed) + this.seedOffsets[key], this.seedOffsets[key] * 0.17);
      const beatLift = (beat * 0.01 + drop * 0.03) * intensity;
      const target = this.target[key] + drift * span * 0.006 * intensity + beatLift * this._polarity(key);
      this.target[key] = Math.min(max, Math.max(min, target));

      const smoothing = Math.min(0.12, 0.022 + speed * 0.028 + energy * 0.02);
      genome[key] += (this.target[key] - genome[key]) * smoothing;
    }

    genome.hueShift = (genome.hueShift + 0.0012 * (0.35 + speed) * (0.55 + energy) * intensity) % 1;
    return genome;
  }

  nudgeToward(genome, amount = 0.08) {
    this.target = this.target ? this.target.blend(genome, amount) : genome.clone();
  }

  _strongMutation(amount) {
    for (const key of GENE_KEYS) {
      const [min, max] = VisualGenome.ranges[key];
      const span = max - min;
      this.target[key] = Math.min(max, Math.max(min, this.target[key] + (this.random() - 0.5) * span * amount * 0.34));
    }
  }

  _polarity(key) {
    if (key === 'feedbackDecay') return -0.018;
    if (key === 'bloomAmount' || key === 'pulseStrength' || key === 'chromaticAberration') return 0.026;
    return (this.random() > 0.5 ? 1 : -1) * 0.01;
  }
}
