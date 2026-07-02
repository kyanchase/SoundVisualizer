import { NeuralMode }    from './NeuralMode.js';
import { PlasmaMode }    from './PlasmaMode.js';
import { GeometryMode }  from './GeometryMode.js';
import { WaterMode }     from './WaterMode.js';
import { SandMode }      from './SandMode.js';
import { PlasmaOrbMode } from './PlasmaOrbMode.js';
import { WaveTerrainMode } from './WaveTerrainMode.js';
import {
  RadialBarsMode,
  LinearSpectrumMode,
  ParticleFieldMode,
  WaveformRingsMode,
  KaleidoscopeMode,
} from './TwoDModes.js';

// Mode order determines auto-transition sequence
export const VISUAL_MODES = {
  'Evolving Mode':    {
    name: 'Evolving Mode',
    shaderModeIdx: 6,
    feedbackBase: 0.94,
    usesRipple: false,
    usesChladni: false,
    usesParticles: false,
    evolving: true,
  },
  'Wave Terrain':     WaveTerrainMode,
  'Plasma Orb':       PlasmaOrbMode,
  'Prism Void':       NeuralMode,
  'Kinetic Cubes':    PlasmaMode,
  'Spectral Lattice': GeometryMode,
  Water:              WaterMode,
  Sand:               SandMode,
  'Radial Bars':      RadialBarsMode,
  'Linear Spectrum':  LinearSpectrumMode,
  'Particle Field':   ParticleFieldMode,
  'Waveform Rings':   WaveformRingsMode,
  Kaleidoscope:       KaleidoscopeMode,
};
