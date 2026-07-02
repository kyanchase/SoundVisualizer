const THREE_D_PARENT_NAMES = [
  'Wave Terrain',
  'Plasma Orb',
  'Prism Void',
  'Kinetic Cubes',
  'Spectral Lattice',
  'Water',
  'Sand',
];

const SHADER_MODE_BY_NAME = {
  'Prism Void': 0,
  'Kinetic Cubes': 1,
  'Spectral Lattice': 2,
  Water: 3,
  Sand: 4,
  'Plasma Orb': 5,
  'Wave Terrain': 6,
};

const normalize = (weights) => {
  const sum = weights.reduce((acc, value) => acc + Math.max(0, value), 0) || 1;
  return weights.map((value) => Math.max(0, value) / sum);
};

export class ModeMixer {
  constructor(parentNames = THREE_D_PARENT_NAMES) {
    this.parentNames = parentNames.filter((name) => SHADER_MODE_BY_NAME[name] != null);
    this.weights = normalize(this.parentNames.map((_, index) => (index === 0 ? 1 : 0.18)));
    this.targetWeights = [...this.weights];
  }

  setManualWeights(weightsByName = {}) {
    this.targetWeights = normalize(this.parentNames.map((name) => weightsByName[name] ?? this.targetWeights[this.parentNames.indexOf(name)] ?? 0));
  }

  update(audioState, time, controls) {
    if (controls.autonomousEvolution) {
      const energy = audioState.mood?.energy ?? 0;
      const chaos = controls.chaosAmount;
      for (let i = 0; i < this.parentNames.length; i++) {
        const phase = time * (0.025 + chaos * 0.03) + i * 1.83;
        this.targetWeights[i] = 0.08 + Math.pow(0.5 + 0.5 * Math.sin(phase + Math.sin(phase * 0.37)), 1.6) * (0.72 + energy * 0.45);
      }
      this.targetWeights = normalize(this.targetWeights);
    }

    const rate = 0.008 + controls.mutationSpeed * 0.012 + (audioState.dropIntensity ?? 0) * 0.035;
    for (let i = 0; i < this.weights.length; i++) {
      this.weights[i] += (this.targetWeights[i] - this.weights[i]) * rate;
    }
    this.weights = normalize(this.weights);
    return this.getState();
  }

  getState() {
    const byName = {};
    this.parentNames.forEach((name, index) => {
      byName[name] = this.weights[index];
    });
    return {
      parentNames: this.parentNames,
      byName,
      shaderWeights: this.toShaderWeights(),
    };
  }

  toShaderWeights() {
    const values = new Float32Array(7);
    this.parentNames.forEach((name, index) => {
      values[SHADER_MODE_BY_NAME[name]] += this.weights[index];
    });
    return values;
  }
}

export { THREE_D_PARENT_NAMES };
