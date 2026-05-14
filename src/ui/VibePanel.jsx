import { VIBES } from '../audio/vibes.js';

export function VibePanel({
  open,
  currentVibe,
  pitchLock,
  onClose,
  onSelect,
  onTogglePitchLock,
}) {
  const selected = VIBES[currentVibe] || VIBES.neutral;

  return (
    <div id="vibe-panel" className={['side-panel', open ? 'open' : ''].join(' ')}>
      <button className="close-btn" onClick={onClose} aria-label="Close vibes">x</button>
      <h3>Vibe <span>Transform</span></h3>

      <div className="vibe-list">
        {Object.entries(VIBES).map(([key, vibe]) => (
          <button
            key={key}
            className={['vibe-item', currentVibe === key ? 'active' : ''].join(' ')}
            onClick={() => onSelect(key)}
            type="button"
          >
            <span className="emoji">{vibe.mark}</span>
            <span className="meta">
              <span>{vibe.label}</span>
              <span className="sub">{vibe.sub}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="pitch-box">
        <div className="recommend-tag">
          Recommended: {selected.pitchLock ? 'on' : 'off'}
        </div>
        <div className="pitch-row">
          <div className="pitch-label">Preserve pitch</div>
          <button
            type="button"
            aria-label="Toggle pitch preservation"
            className={['toggle-switch', pitchLock ? 'on' : ''].join(' ')}
            onClick={() => onTogglePitchLock(!pitchLock)}
          />
        </div>
        <div className="pitch-reason">{selected.pitchReason}</div>
      </div>
    </div>
  );
}
