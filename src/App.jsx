import { useEffect, useRef, useState, useCallback } from 'react';
import { Renderer } from './rendering/Renderer.js';
import { AudioManager } from './audio/AudioManager.js';
import { Controls } from './ui/Controls.jsx';
import { DebugPanel } from './ui/DebugPanel.jsx';
import { PresetSelector } from './ui/Presets.jsx';
import Loader from './ui/Loader.jsx';
import Card from './ui/Card.jsx';

export default function App() {
  const canvasRef   = useRef(null);
  const rendererRef = useRef(null);
  const audioRef    = useRef(null);
  const rafRef      = useRef(null);

  const [landed, setLanded]         = useState(true);
  const [landingFade, setFade]      = useState(false);
  const [isPaused, setIsPaused]     = useState(false);
  const [trackName, setTrackName]   = useState('OFFLINE');
  const [currentMode, setMode]      = useState('Neural');
  const [audioState, setAudioState] = useState(null);
  const [fps, setFps]               = useState(0);
  const [preset, setPreset]         = useState(null);
  const [rendererInfo, setRendInfo] = useState({});
  const [loading, setLoading]       = useState(false); // New loading state
  const [loaderText, setLoaderText] = useState("PROCESSING AUDIO"); // New loader text state

  const fpsRef = useRef({ frames: 0, last: performance.now() });

  const tick = useCallback(() => {
    fpsRef.current.frames++;
    const now = performance.now();
    if (now - fpsRef.current.last >= 1000) {
      setFps(fpsRef.current.frames);
      fpsRef.current = { frames: 0, last: now };
    }
    if (rendererRef.current && audioRef.current) {
      const state = audioRef.current.getAudioState();
      rendererRef.current.setAudioState(state);
      setAudioState(state);
      setRendInfo(rendererRef.current.getDebugInfo());
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width  = canvas.clientWidth  * window.devicePixelRatio;
    canvas.height = canvas.clientHeight * window.devicePixelRatio;

    const renderer = new Renderer(canvas);
    rendererRef.current = renderer;
    audioRef.current = new AudioManager();

    renderer.onModeChange = (name) => setMode(name);

    renderer.init().then(() => {
      setMode(renderer.currentModeName);
      rafRef.current = requestAnimationFrame(tick);
    });

    const onResize = () => {
      canvas.width  = canvas.clientWidth  * window.devicePixelRatio;
      canvas.height = canvas.clientHeight * window.devicePixelRatio;
      renderer.onResize();
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      renderer.destroy();
    };
  }, [tick]);

  const dismissLanding = useCallback(() => {
    setFade(true);
    setTimeout(() => setLanded(false), 1500);
  }, []);

  const handleMic = useCallback(async () => {
    try {
      setLoading(true); // Show loader
      audioRef.current.resume();
      await audioRef.current.initMic();
      setTrackName(audioRef.current.trackName);
      dismissLanding();
      setLoading(false); // Hide loader
    } catch {
      setLoading(false); // Hide loader on error
      alert("Microphone access denied. Please allow microphone access and try again.");
    }
  }, [dismissLanding]);

  const handleFile = useCallback((file) => {
    if (!file) return;
    setLoading(true); // Show loader
    audioRef.current.resume();
    audioRef.current.initFile(file);
    setTrackName(audioRef.current.trackName);
    dismissLanding();
    setLoading(false); // Hide loader
  }, [dismissLanding]);

  const handleTogglePlayback = useCallback(() => {
    audioRef.current.togglePlayback();
    setIsPaused(p => !p);
  }, []);

  const handleModeSelect = useCallback((name) => {
    const idx = rendererRef.current.modeNames.indexOf(name);
    if (idx >= 0) rendererRef.current.setModeByIndex(idx);
    setMode(name);
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed', inset: 0,
          width: '100vw', height: '100vh',
          display: 'block', zIndex: 1,
        }}
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
          <PresetSelector onSelect={setPreset} current={preset} />
          <Controls
            trackName={trackName}
            isPaused={isPaused}
            onTogglePlayback={handleTogglePlayback}
            currentMode={currentMode}
            modeNames={rendererRef.current?.modeNames || []}
            onModeSelect={handleModeSelect}
          />
        </>
      )}

      <Loader active={loading} text={loaderText} />
      <DebugPanel audioState={audioState} rendererInfo={rendererInfo} fps={fps} />
    </>
  );
}


