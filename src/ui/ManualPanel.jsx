const SLIDERS = [
  { key: 'tempo', section: 'Tempo', label: 'Playback speed', min: 0.5, max: 1.5, step: 0.01, format: (v) => `${Math.round(v * 100)}%` },
  { key: 'highpass', section: 'Filters', label: 'Highpass', min: 20, max: 500, step: 5, format: (v) => `${Math.round(v)} Hz` },
  { key: 'lowpass', label: 'Lowpass', min: 500, max: 20000, step: 100, format: (v) => (v >= 20000 ? '20 kHz' : `${Math.round(v)} Hz`) },
  { key: 'bassGain', section: 'EQ', label: 'Bass', min: -12, max: 12, step: 0.5, format: (v) => `${v > 0 ? '+' : ''}${v} dB` },
  { key: 'midGain', label: 'Mid', min: -12, max: 12, step: 0.5, format: (v) => `${v > 0 ? '+' : ''}${v} dB` },
  { key: 'highGain', label: 'Treble', min: -12, max: 12, step: 0.5, format: (v) => `${v > 0 ? '+' : ''}${v} dB` },
  { key: 'reverbWet', section: 'Effects', label: 'Reverb', min: 0, max: 1, step: 0.01, format: (v) => `${Math.round(v * 100)}%` },
  { key: 'distortion', label: 'Distortion', min: 0, max: 1, step: 0.01, format: (v) => `${Math.round(v * 100)}%` },
  { key: 'vinyl', label: 'Vinyl crackle', min: 0, max: 0.3, step: 0.005, format: (v) => `${Math.round((v / 0.3) * 100)}%` },
  { key: 'compression', label: 'Compression', min: 0, max: 1, step: 0.01, format: (v) => `${Math.round(v * 100)}%` },
];

const SLIDER_ROWS = SLIDERS.map((slider, index) => ({
  ...slider,
  showSection: Boolean(slider.section && slider.section !== SLIDERS[index - 1]?.section),
}));

export function ManualPanel({ open, params, onClose, onChange, onReset }) {
  return (
    <div id="manual-panel" className={['side-panel', open ? 'open' : ''].join(' ')}>
      <button className="close-btn" onClick={onClose} aria-label="Close manual controls">x</button>
      <h3>Manual <span>Controls</span></h3>

      {SLIDER_ROWS.map((slider) => {
        const value = params[slider.key];

        return (
          <div key={slider.key}>
            {slider.showSection && <div className="section-divider">{slider.section}</div>}
            <label className="slider-group">
              <span className="slider-header">
                <span className="name">{slider.label}</span>
                <span className="value">{slider.format(value)}</span>
              </span>
              <input
                type="range"
                min={slider.min}
                max={slider.max}
                step={slider.step}
                value={value}
                onChange={(event) => onChange(slider.key, Number(event.target.value))}
              />
            </label>
          </div>
        );
      })}

      <button className="reset-btn" onClick={onReset} type="button">
        Reset to vibe default
      </button>
    </div>
  );
}
