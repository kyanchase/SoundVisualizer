import { useState } from 'react';

export function Controls({
  trackName,
  isPaused,
  onTogglePlayback,
  currentMode,
  modeNames,
  onModeSelect,
  onToggleManualPanel,
  onToggleVibePanel,
  onToggleGenerativePanel,
  onSceneSelect,
  currentSceneName,
  sceneNames = [],
  currentVibe,
}) {
  const [expanded, setExpanded] = useState(true); // Always start expanded for now
  const [showSceneDropdown, setShowSceneDropdown] = useState(false);

  const toggleSceneDropdown = () => setShowSceneDropdown((prev) => !prev);
  const vibeLabel = typeof currentVibe === 'string' ? currentVibe : currentVibe?.label;

  return (
    <div id="controller" className={expanded ? 'expanded' : ''}>
      <div className="status-dot" onClick={() => setExpanded((e) => !e)}></div>
      <div className="hide-on-min info-text" id="track-display">
        {trackName}
      </div>

      {sceneNames.length === 0 && (
      <div className="hide-on-min mode-toggle">
        {modeNames.map((name) => (
          <button
            key={name}
            className={currentMode === name ? 'active' : ''}
            onClick={() => onModeSelect(name)}
          >
            {name.replace('Mode', '')}
          </button>
        ))}
      </div>
      )}

      {sceneNames.length > 0 && (
      <div className="hide-on-min scene-picker">
        <button className="scene-btn" onClick={toggleSceneDropdown}>
          <span id="scene-label">{currentSceneName || currentMode}</span>
          <span className="arrow">▲</span>
        </button>
        <div className={["scene-dropdown", showSceneDropdown ? "open" : ""].join(" ")}>
          {sceneNames.map((scene) => (
            <div
              key={scene.id}
              className={["scene-option", currentSceneName === scene.name ? "active" : ""].join(" ")}
              onClick={() => {
                onSceneSelect(scene.id);
                setShowSceneDropdown(false);
              }}
            >
              <span className="emoji">{scene.emoji}</span>
              {scene.name}
            </div>
          ))}
        </div>
      </div>
      )}

      <div className="hide-on-min vibe-label" id="vibe-display">
        ◆ {vibeLabel ? vibeLabel.toUpperCase() : 'NEUTRAL'}
      </div>
      <button
        className="hide-on-min icon-btn"
        onClick={onToggleManualPanel}
        title="Manual controls"
      >
        ⚙
      </button>
      <button
        className="hide-on-min icon-btn"
        onClick={onToggleGenerativePanel}
        title="Evolution controls"
      >
        ∞
      </button>
      <button
        className="hide-on-min icon-btn"
        onClick={onToggleVibePanel}
        title="Vibes"
      >
        ✦
      </button>
      <button
        className="hide-on-min icon-btn primary"
        id="pause-btn"
        onClick={onTogglePlayback}
      >
        {isPaused ? '▶' : '❚❚'}
      </button>
    </div>
  );
}
