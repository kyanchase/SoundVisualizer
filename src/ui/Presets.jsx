export const PRESETS = {
  EDM: {
    feedbackAlpha: 0.88,
    modeOrder: ['Plasma', 'Neural', 'Geometry', 'Water', 'Sand'],
    colorSeed: 0.0,
  },
  Ambient: {
    feedbackAlpha: 0.94,
    modeOrder: ['Water', 'Sand', 'Geometry', 'Neural', 'Plasma'],
    colorSeed: 0.3,
  },
  Classical: {
    feedbackAlpha: 0.92,
    modeOrder: ['Geometry', 'Water', 'Sand', 'Neural', 'Plasma'],
    colorSeed: 0.6,
  },
};

export function PresetSelector({ onSelect, current }) {
  return (
    <div style={{
      position: 'fixed', top: 20, left: 20, zIndex: 200,
      display: 'flex', gap: 8,
    }}>
      {Object.keys(PRESETS).map(name => (
        <button
          key={name}
          onClick={() => onSelect(name)}
          style={{
            background: current === name ? 'rgba(0,242,254,0.2)' : 'rgba(10,10,10,0.8)',
            border: `1px solid ${current === name ? '#00f2fe' : '#444'}`,
            color: current === name ? '#00f2fe' : '#666',
            padding: '6px 14px',
            borderRadius: 20,
            fontFamily: "'Space Mono', monospace",
            fontSize: 9,
            fontWeight: 700,
            textTransform: 'uppercase',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s',
          }}
        >
          {name}
        </button>
      ))}
    </div>
  );
}
