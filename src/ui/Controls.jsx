import { useState } from 'react';

export function Controls({ trackName, isPaused, onTogglePlayback, currentMode, modeNames, onModeSelect }) {
  const [expanded, setExpanded] = useState(false);
  const [showModes, setShowModes] = useState(false);

  return (
    <div
      id="controller"
      className={expanded ? 'expanded' : ''}
      style={{
        position: 'fixed',
        bottom: 40,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(10,10,10,0.9)',
        border: '1px solid #333',
        borderRadius: 50,
        display: 'flex',
        alignItems: 'center',
        padding: expanded ? '12px 30px' : 0,
        gap: expanded ? 25 : 0,
        transition: 'all 0.6s cubic-bezier(0.19,1,0.22,1)',
        pointerEvents: 'all',
        backdropFilter: 'blur(20px)',
        width: expanded ? 340 : 60,
        height: 60,
        overflow: 'hidden',
        justifyContent: 'center',
        zIndex: 200,
      }}
    >
      {/* Status dot */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          width: 20, height: 20,
          background: '#00f2fe',
          borderRadius: '50%',
          cursor: 'pointer',
          boxShadow: '0 0 20px #00f2fe',
          flexShrink: 0,
        }}
      />

      {expanded && (
        <>
          <span style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 10,
            color: '#888',
            whiteSpace: 'nowrap',
            minWidth: 80,
          }}>
            {trackName}
          </span>

          <button
            onClick={onTogglePlayback}
            style={{
              background: 'white', border: 'none', color: 'black',
              cursor: 'pointer', padding: '8px 18px', borderRadius: 20,
              fontFamily: "'Space Mono', monospace",
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            }}
          >
            {isPaused ? 'Play' : 'Pause'}
          </button>

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowModes(m => !m)}
              style={{
                background: 'transparent', border: '1px solid #444',
                color: '#00f2fe', cursor: 'pointer', padding: '6px 14px',
                borderRadius: 20, fontFamily: "'Space Mono', monospace",
                fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}
            >
              {currentMode}
            </button>
            {showModes && (
              <div style={{
                position: 'absolute', bottom: 44, left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(10,10,10,0.95)',
                border: '1px solid #333', borderRadius: 12,
                padding: '8px 0', minWidth: 120,
              }}>
                {modeNames.map(name => (
                  <div
                    key={name}
                    onClick={() => { onModeSelect(name); setShowModes(false); }}
                    style={{
                      padding: '8px 20px', cursor: 'pointer',
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 10, color: name === currentMode ? '#00f2fe' : '#aaa',
                      textTransform: 'uppercase',
                      background: name === currentMode ? 'rgba(0,242,254,0.1)' : 'transparent',
                    }}
                  >
                    {name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
