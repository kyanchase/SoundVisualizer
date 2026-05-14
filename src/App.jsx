import { useEffect, useRef, useState, useCallback } from 'react';
import { Renderer } from './rendering/Renderer.js';
import { AudioManager } from './audio/AudioManager.js';
import { Controls } from './ui/Controls.jsx';
import { DebugPanel } from './ui/DebugPanel.jsx';
import { PresetSelector } from './ui/Presets.jsx';

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
      audioRef.current.resume();
      await audioRef.current.initMic();
      setTrackName(audioRef.current.trackName);
      dismissLanding();
    } catch {
      alert('Microphone access denied. Please allow microphone access and try again.');
    }
  }, [dismissLanding]);

  const handleFile = useCallback((file) => {
    if (!file) return;
    audioRef.current.resume();
    audioRef.current.initFile(file);
    setTrackName(audioRef.current.trackName);
    dismissLanding();
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
        <div style={{
          position: 'fixed', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(-45deg, #050505, #1a0a1a, #0a1a1a, #050505)',
          backgroundSize: '400% 400%',
          animation: 'gradientBG 15s ease infinite',
          zIndex: 100,
          opacity: landingFade ? 0 : 1,
          transition: 'opacity 1.5s ease',
          pointerEvents: landingFade ? 'none' : 'all',
        }}>
          <div style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 'clamp(28px, 4.5vw, 64px)',
            letterSpacing: '0.3em',
            marginBottom: 50,
            textTransform: 'uppercase',
            fontWeight: 700,
            color: 'white',
            textShadow: '0 0 20px rgba(255,255,255,0.2)',
          }}>
            Synesthesia
          </div>

          <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', justifyContent: 'center', padding: '0 20px' }}>
            <Card icon="🎙️" label="Microphone" onClick={handleMic} />
            <label style={{ cursor: 'pointer' }}>
              <Card icon="🎵" label="Upload Track" />
              <input
                type="file"
                accept="audio/*"
                style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files[0])}
              />
            </label>
          </div>

          <p style={{
            marginTop: 40,
            fontFamily: "'Space Mono', monospace",
            fontSize: 10,
            color: '#444',
            letterSpacing: '0.2em',
          }}>
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

      <DebugPanel audioState={audioState} rendererInfo={rendererInfo} fps={fps} />
    </>
  );
}

function Card({ icon, label, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 220, height: 140,
        borderRadius: 12,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        background: 'linear-gradient(135deg, #e0e0e0 0%, #ffffff 50%, #d1d1d1 100%)',
        boxShadow: hovered
          ? '0 20px 40px rgba(0,242,254,0.3)'
          : '0 10px 30px rgba(0,0,0,0.5), inset 0 0 15px rgba(255,255,255,0.5)',
        color: '#333',
        fontFamily: "'Space Mono', monospace",
        fontWeight: 700,
        fontSize: '0.9rem',
        textTransform: 'uppercase',
        letterSpacing: 2,
        transform: hovered ? 'translateY(-10px) scale(1.05)' : 'none',
        filter: hovered ? 'brightness(1.1)' : 'none',
        transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        userSelect: 'none',
      }}
    >
      <span style={{ fontSize: '2.5rem', marginBottom: 10 }}>{icon}</span>
      {label}
    </div>
  );
}
