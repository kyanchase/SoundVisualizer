import { useEffect, useRef, useState, useCallback } from 'react';
import './App.css';
import { Renderer } from './rendering/Renderer.js';
import { AudioManager } from './audio/AudioManager.js';
import { DEFAULT_AUDIO_PARAMS, VIBES } from './audio/vibes.js';
import { Controls } from './ui/Controls.jsx';
import { DebugPanel } from './ui/DebugPanel.jsx';
import { ManualPanel } from './ui/ManualPanel.jsx';
import { VibePanel } from './ui/VibePanel.jsx';
import { GenerativePanel } from './ui/GenerativePanel.jsx';
import { createDefaultEvolutionControls } from './generative/EvolutionEngine.js';
import Loader from './ui/Loader.jsx';
import Card from './ui/Card.jsx';

const getViewportSize = () => {
  const viewport = window.visualViewport;
  return {
    width: Math.max(1, Math.round(viewport?.width ?? window.innerWidth)),
    height: Math.max(1, Math.round(viewport?.height ?? window.innerHeight)),
  };
};

const sizeCanvasToViewport = (canvas) => {
  if (!canvas) return;
  const { width, height } = getViewportSize();
  const dpr = Math.min(window.devicePixelRatio || 1, 1.25);

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));
};

const UI_STATE_INTERVAL_MS = 125;

export default function App() {
  const canvasRef   = useRef(null);
  const canvas2dRef = useRef(null);
  const rendererRef = useRef(null);
  const audioRef    = useRef(null);
  const rafRef      = useRef(null);

  const [landed, setLanded]         = useState(true);
  const [landingFade, setFade]      = useState(false);
  const [isPaused, setIsPaused]     = useState(false);
  const [trackName, setTrackName]   = useState('OFFLINE');
  const [currentMode, setMode]      = useState('Wave Terrain');
  const [modeNames, setModeNames]   = useState([]);
  const [audioState, setAudioState] = useState(null);
  const [fps, setFps]               = useState(0);
  const [rendererInfo, setRendInfo] = useState({});
  const [loading, setLoading]       = useState(false); // New loading state
  const [loaderText] = useState("PROCESSING AUDIO"); // New loader text state
  const [currentVibe, setCurrentVibe] = useState('neutral');
  const [audioParams, setAudioParams] = useState(DEFAULT_AUDIO_PARAMS);
  const [pitchLock, setPitchLock] = useState(VIBES.neutral.pitchLock);
  const [manualOpen, setManualOpen] = useState(false);
  const [vibeOpen, setVibeOpen] = useState(false);
  const [generativeOpen, setGenerativeOpen] = useState(false);
  const [evolutionControls, setEvolutionControls] = useState(createDefaultEvolutionControls);

  const fpsRef = useRef({ frames: 0, last: 0 });
  const uiStateRef = useRef({ last: 0 });

  useEffect(() => {
    rendererRef.current?.setLandingActive(landed);
  }, [landed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const canvas2d = canvas2dRef.current;
    const syncCanvasSizes = () => {
      sizeCanvasToViewport(canvas);
      sizeCanvasToViewport(canvas2d);
    };

    syncCanvasSizes();

    const renderer = new Renderer(canvas, canvas2d);
    rendererRef.current = renderer;
    audioRef.current = new AudioManager();

    renderer.onModeChange = (name) => setMode(name);

    renderer.init().then(() => {
      setMode(renderer.currentModeName);
      setModeNames(renderer.modeNames);
      fpsRef.current = { frames: 0, last: performance.now() };

      const tick = () => {
        fpsRef.current.frames++;
        const now = performance.now();
        if (now - fpsRef.current.last >= 1000) {
          setFps(fpsRef.current.frames);
          fpsRef.current = { frames: 0, last: now };
        }
        if (rendererRef.current && audioRef.current) {
          const state = audioRef.current.getAudioState();
          rendererRef.current.setAudioState(state);
          if (now - uiStateRef.current.last >= UI_STATE_INTERVAL_MS) {
            uiStateRef.current.last = now;
            setAudioState({ ...state, mood: { ...state.mood } });
            setRendInfo(rendererRef.current.getDebugInfo());
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    });

    const onResize = () => {
      syncCanvasSizes();
      renderer.onResize();
    };
    window.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('scroll', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('scroll', onResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      audioRef.current?.destroy();
      renderer.destroy();
    };
  }, []);

  const dismissLanding = useCallback(() => {
    setFade(true);
    setTimeout(() => setLanded(false), 1500);
  }, []);

  const handleMic = useCallback(async () => {
    try {
      setLoading(true); // Show loader
      audioRef.current.resume();
      await audioRef.current.initMic();
      audioRef.current.applyVibe(currentVibe);
      audioRef.current.setPitchLock(pitchLock);
      setTrackName(audioRef.current.trackName);
      dismissLanding();
      setLoading(false); // Hide loader
    } catch {
      setLoading(false); // Hide loader on error
      alert("Microphone access denied. Please allow microphone access and try again.");
    }
  }, [currentVibe, dismissLanding, pitchLock]);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    try {
      setLoading(true); // Show loader
      audioRef.current.resume();
      await audioRef.current.initFile(file);
      audioRef.current.applyVibe(currentVibe);
      audioRef.current.setPitchLock(pitchLock);
      setTrackName(audioRef.current.trackName);
      dismissLanding();
      setLoading(false); // Hide loader
    } catch {
      setLoading(false);
      alert("Couldn't load that audio file. Please try another track.");
    }
  }, [currentVibe, dismissLanding, pitchLock]);

  const handleTogglePlayback = useCallback(() => {
    const paused = audioRef.current.togglePlayback();
    setIsPaused(paused);
  }, []);

  const handleModeSelect = useCallback((name) => {
    const idx = rendererRef.current.modeNames.indexOf(name);
    if (idx >= 0) rendererRef.current.setModeByIndex(idx);
    setMode(name);
  }, []);

  const handleVibeSelect = useCallback((key) => {
    const vibe = VIBES[key] || VIBES.neutral;
    setCurrentVibe(key);
    setAudioParams({ ...vibe.audio });
    setPitchLock(vibe.pitchLock);
    audioRef.current?.applyVibe(key);
    rendererRef.current?.applyVisualPreset(vibe.visual);
    if (rendererRef.current) {
      setMode(rendererRef.current.currentModeName);
      setModeNames(rendererRef.current.modeNames);
    }
  }, []);

  const handleParamChange = useCallback((key, value) => {
    setAudioParams((params) => ({ ...params, [key]: value }));
    audioRef.current?.setParam(key, value);
  }, []);

  const handlePitchLock = useCallback((locked) => {
    setPitchLock(locked);
    audioRef.current?.setPitchLock(locked);
  }, []);

  const handleEvolutionChange = useCallback((key, value) => {
    setEvolutionControls((controls) => {
      const next = { ...controls, [key]: value };
      rendererRef.current?.setEvolutionControls(next);
      return next;
    });
  }, []);

  const handleModeWeightChange = useCallback((name, value) => {
    setEvolutionControls((controls) => {
      const next = {
        ...controls,
        modeWeights: { ...controls.modeWeights, [name]: value },
      };
      rendererRef.current?.setEvolutionControls(next);
      return next;
    });
  }, []);

  const handleEvolutionReset = useCallback(() => {
    const next = createDefaultEvolutionControls();
    setEvolutionControls(next);
    rendererRef.current?.setEvolutionControls(next);
  }, []);

  const handleResetToVibe = useCallback(() => {
    handleVibeSelect(currentVibe);
  }, [currentVibe, handleVibeSelect]);

  const scenes = modeNames.map((name) => ({
    id: name,
    name,
    emoji: name.slice(0, 2).toUpperCase(),
  }));

  return (
    <>
      <canvas
        ref={canvasRef}
        className="visual-canvas visual-canvas-webgl"
      />
      <canvas
        ref={canvas2dRef}
        className="visual-canvas visual-canvas-2d"
      />

      {landed && (
        <div id="landing" className={landingFade ? "fade-out" : ""}>
          <div className="title">
            Synesthesia
          </div>

          <div className="cards">
            <Card icon="🎙️" label="Microphone" onClick={handleMic} />
            <label>
              <Card icon="🎵" label="Upload Track" />
              <input
                type="file"
                accept="audio/*"
                id="fileInput"
                onChange={e => handleFile(e.target.files[0])}
              />
            </label>
          </div>

          <p className="debug-hint">
            PRESS D FOR DEBUG PANEL
          </p>
        </div>
      )}

      {!landed && (
        <>
          <Controls
            trackName={trackName}
            isPaused={isPaused}
            onTogglePlayback={handleTogglePlayback}
            currentMode={currentMode}
            modeNames={modeNames}
            onModeSelect={handleModeSelect}
            onToggleManualPanel={() => setManualOpen((open) => !open)}
            onToggleVibePanel={() => setVibeOpen((open) => !open)}
            onToggleGenerativePanel={() => setGenerativeOpen((open) => !open)}
            onSceneSelect={handleModeSelect}
            currentSceneName={currentMode}
            sceneNames={scenes}
            currentVibe={VIBES[currentVibe]}
          />
          <ManualPanel
            open={manualOpen}
            params={audioParams}
            onClose={() => setManualOpen(false)}
            onChange={handleParamChange}
            onReset={handleResetToVibe}
          />
          <VibePanel
            open={vibeOpen}
            currentVibe={currentVibe}
            pitchLock={pitchLock}
            onClose={() => setVibeOpen(false)}
            onSelect={handleVibeSelect}
            onTogglePitchLock={handlePitchLock}
          />
          <GenerativePanel
            open={generativeOpen}
            controls={evolutionControls}
            onClose={() => setGenerativeOpen(false)}
            onChange={handleEvolutionChange}
            onModeWeightChange={handleModeWeightChange}
            onReset={handleEvolutionReset}
          />
        </>
      )}

      <Loader active={loading} text={loaderText} />
      <DebugPanel audioState={audioState} rendererInfo={rendererInfo} fps={fps} />
    </>
  );
}
