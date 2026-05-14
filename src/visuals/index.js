import { NeuralMode }    from './NeuralMode.js';
import { PlasmaMode }    from './PlasmaMode.js';
import { GeometryMode }  from './GeometryMode.js';
import { WaterMode }     from './WaterMode.js';
import { SandMode }      from './SandMode.js';

// Mode order determines auto-transition sequence
export const VISUAL_MODES = {
  Neural:   NeuralMode,
  Plasma:   PlasmaMode,
  Geometry: GeometryMode,
  Water:    WaterMode,
  Sand:     SandMode,
};
