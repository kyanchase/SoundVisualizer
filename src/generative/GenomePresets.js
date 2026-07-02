import { VisualGenome } from './VisualGenome.js';

export const GENOME_PRESETS = {
  'Wave Terrain': new VisualGenome({
    hueShift: 0.56, saturation: 1.18, bloomAmount: 0.55, turbulence: 0.42,
    particleChaos: 0.25, symmetry: 3, noiseScale: 1.1, feedbackDecay: 0.94,
    rotationSpeed: 0.16, geometryDensity: 0.72, pulseStrength: 0.75,
    distortionAmount: 0.22, chromaticAberration: 0.18, waveComplexity: 1.9,
    fractalInfluence: 0.25,
  }),
  'Plasma Orb': new VisualGenome({
    hueShift: 0.88, saturation: 1.45, bloomAmount: 1.15, turbulence: 0.72,
    particleChaos: 0.42, symmetry: 5, noiseScale: 2.8, feedbackDecay: 0.91,
    rotationSpeed: 0.24, geometryDensity: 0.82, pulseStrength: 1.25,
    distortionAmount: 0.42, chromaticAberration: 0.36, waveComplexity: 1.25,
    fractalInfluence: 0.52,
  }),
  'Prism Void': new VisualGenome({
    hueShift: 0.72, saturation: 1.35, bloomAmount: 0.75, turbulence: 0.64,
    particleChaos: 0.5, symmetry: 8, noiseScale: 1.9, feedbackDecay: 0.95,
    rotationSpeed: -0.18, geometryDensity: 1.35, pulseStrength: 0.8,
    distortionAmount: 0.36, chromaticAberration: 0.42, waveComplexity: 1.05,
    fractalInfluence: 0.9,
  }),
  'Kinetic Cubes': new VisualGenome({
    hueShift: 0.08, saturation: 1.25, bloomAmount: 0.75, turbulence: 0.38,
    particleChaos: 0.55, symmetry: 4, noiseScale: 1.35, feedbackDecay: 0.88,
    rotationSpeed: 0.62, geometryDensity: 1.65, pulseStrength: 1.05,
    distortionAmount: 0.22, chromaticAberration: 0.28, waveComplexity: 0.8,
    fractalInfluence: 0.2,
  }),
  'Spectral Lattice': new VisualGenome({
    hueShift: 0.38, saturation: 1.08, bloomAmount: 0.58, turbulence: 0.28,
    particleChaos: 0.34, symmetry: 10, noiseScale: 0.85, feedbackDecay: 0.925,
    rotationSpeed: 0.2, geometryDensity: 1.95, pulseStrength: 0.72,
    distortionAmount: 0.18, chromaticAberration: 0.26, waveComplexity: 1.1,
    fractalInfluence: 0.58,
  }),
  Water: new VisualGenome({
    hueShift: 0.52, saturation: 0.95, bloomAmount: 0.5, turbulence: 0.56,
    particleChaos: 0.18, symmetry: 2, noiseScale: 1.55, feedbackDecay: 0.935,
    rotationSpeed: 0.08, geometryDensity: 0.45, pulseStrength: 0.98,
    distortionAmount: 0.32, chromaticAberration: 0.16, waveComplexity: 2.25,
    fractalInfluence: 0.16,
  }),
  Sand: new VisualGenome({
    hueShift: 0.13, saturation: 0.82, bloomAmount: 0.38, turbulence: 0.34,
    particleChaos: 0.84, symmetry: 9, noiseScale: 0.75, feedbackDecay: 0.9,
    rotationSpeed: 0.12, geometryDensity: 1.45, pulseStrength: 0.62,
    distortionAmount: 0.12, chromaticAberration: 0.08, waveComplexity: 0.95,
    fractalInfluence: 0.42,
  }),
};

export function blendedGenomeFromWeights(weightsByName) {
  let genome = null;
  let total = 0;
  for (const [name, weight] of Object.entries(weightsByName)) {
    const preset = GENOME_PRESETS[name];
    if (!preset || weight <= 0) continue;
    genome = genome ? genome.blend(preset, weight / (total + weight)) : preset.clone();
    total += weight;
  }
  return genome || GENOME_PRESETS['Wave Terrain'].clone();
}
