import { createDefaultEvolutionControls } from '../generative/EvolutionEngine.js';
import { THREE_D_PARENT_NAMES } from '../generative/ModeMixer.js';

const SLIDERS = [
  { key: 'evolutionIntensity', label: 'Evolution intensity' },
  { key: 'mutationSpeed', label: 'Mutation speed' },
  { key: 'chaosAmount', label: 'Chaos amount' },
  { key: 'memoryInfluence', label: 'Memory influence' },
];

const formatPercent = (value) => `${Math.round(value * 100)}%`;

export function GenerativePanel({ open, controls, onClose, onChange, onModeWeightChange, onReset }) {
  const values = controls || createDefaultEvolutionControls();

  return (
    <div id="generative-panel" className={['side-panel', open ? 'open' : ''].join(' ')}>
      <button className="close-btn" onClick={onClose} aria-label="Close evolution controls">x</button>
      <h3>Evolving <span>Mode</span></h3>

      <label className="pitch-box evolution-toggle">
        <span className="pitch-row">
          <span className="pitch-label">Autonomous evolution</span>
          <span
            className={['toggle-switch', values.autonomousEvolution ? 'on' : ''].join(' ')}
            onClick={() => onChange('autonomousEvolution', !values.autonomousEvolution)}
          />
        </span>
      </label>

      {SLIDERS.map((slider) => (
        <label key={slider.key} className="slider-group">
          <span className="slider-header">
            <span className="name">{slider.label}</span>
            <span className="value">{formatPercent(values[slider.key])}</span>
          </span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={values[slider.key]}
            onChange={(event) => onChange(slider.key, Number(event.target.value))}
          />
        </label>
      ))}

      <div className="section-divider">Mode blending weights</div>
      {THREE_D_PARENT_NAMES.map((name) => (
        <label key={name} className="slider-group">
          <span className="slider-header">
            <span className="name">{name}</span>
            <span className="value">{formatPercent(values.modeWeights?.[name] ?? 0)}</span>
          </span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={values.modeWeights?.[name] ?? 0}
            onChange={(event) => onModeWeightChange(name, Number(event.target.value))}
          />
        </label>
      ))}

      <button className="reset-btn" onClick={onReset} type="button">
        Reset evolution
      </button>
    </div>
  );
}
