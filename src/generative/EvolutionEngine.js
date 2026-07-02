import { MutationEngine } from './MutationEngine.js';
import { ModeMixer, THREE_D_PARENT_NAMES } from './ModeMixer.js';
import { blendedGenomeFromWeights, GENOME_PRESETS } from './GenomePresets.js';

export const DEFAULT_EVOLUTION_CONTROLS = {
  enabled: true,
  autonomousEvolution: true,
  evolutionIntensity: 0.72,
  mutationSpeed: 0.55,
  chaosAmount: 0.44,
  memoryInfluence: 0.28,
  modeWeights: {
    'Wave Terrain': 0.7,
    'Plasma Orb': 0.35,
    'Prism Void': 0.32,
    'Kinetic Cubes': 0.22,
    'Spectral Lattice': 0.3,
    Water: 0.2,
    Sand: 0.16,
  },
};

export function createDefaultEvolutionControls() {
  return {
    ...DEFAULT_EVOLUTION_CONTROLS,
    modeWeights: { ...DEFAULT_EVOLUTION_CONTROLS.modeWeights },
  };
}

export class EvolutionEngine {
  constructor({ seed = 424242 } = {}) {
    this.controls = createDefaultEvolutionControls();
    this.mutation = new MutationEngine({ seed });
    this.mixer = new ModeMixer(THREE_D_PARENT_NAMES);
    this.mixer.setManualWeights(this.controls.modeWeights);
    this.genome = blendedGenomeFromWeights(this.controls.modeWeights);
    this.memory = [this.genome.clone()];
    this.lastMemoryCapture = 0;
    this.lastRemix = 0;
    this.eventBloom = 0;
  }

  setControls(nextControls = {}) {
    this.controls = {
      ...this.controls,
      ...nextControls,
      modeWeights: {
        ...this.controls.modeWeights,
        ...(nextControls.modeWeights || {}),
      },
    };
    this.mixer.setManualWeights(this.controls.modeWeights);
  }

  update(audioState, time) {
    const mix = this.mixer.update(audioState, time, this.controls);
    const parentGenome = blendedGenomeFromWeights(mix.byName);
    this.genome = this.genome.blend(parentGenome, 0.002 + this.controls.memoryInfluence * 0.003);
    this.genome = this.mutation.update(this.genome, audioState, time, this.controls);

    const drop = audioState.dropIntensity ?? 0;
    if (drop > 0.2) this.eventBloom = Math.min(1, this.eventBloom + drop * 1.35);
    this.eventBloom *= 0.93;

    this._updateMemory(audioState, time);

    return {
      genome: this.genome,
      modeMix: mix,
      eventBloom: this.eventBloom,
      controls: this.controls,
      memorySize: this.memory.length,
    };
  }

  _updateMemory(audioState, time) {
    if (time - this.lastMemoryCapture > 18) {
      this.memory.push(this.genome.clone());
      if (this.memory.length > 18) this.memory.shift();
      this.lastMemoryCapture = time;
    }

    const shouldRemix = this.controls.memoryInfluence > 0.02
      && time - this.lastRemix > 32
      && (audioState.beat ?? 0) > 0.62
      && this.memory.length > 2;

    if (shouldRemix) {
      const remembered = this.memory[Math.floor(Math.random() * this.memory.length)] ?? GENOME_PRESETS['Wave Terrain'];
      this.mutation.nudgeToward(remembered, this.controls.memoryInfluence * 0.35);
      this.lastRemix = time;
    }
  }
}
