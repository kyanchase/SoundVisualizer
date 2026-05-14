import { useEffect, useState } from 'react';

export function DebugPanel({ audioState, rendererInfo, fps }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'd' || e.key === 'D') setVisible(v => !v);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!visible) return null;

  const s = audioState || {};
  const mood = s.mood || {};

  return (
    <div style={{
      position: 'fixed', top: 20, right: 20, zIndex: 999,
      background: 'rgba(0,0,0,0.85)',
      border: '1px solid #333',
      borderRadius: 8,
      padding: '12px 16px',
      fontFamily: "'Space Mono', monospace",
      fontSize: 10,
      color: '#00f2fe',
      lineHeight: 1.8,
      minWidth: 200,
      backdropFilter: 'blur(10px)',
    }}>
      <div style={{ color: '#fff', marginBottom: 6, fontSize: 11 }}>DEBUG [D]</div>
      <div>FPS: {fps}</div>
      <div>Mode: {rendererInfo?.mode || '—'}</div>
      <div>BPM: {s.bpm || 0}</div>
      <div>────────────</div>
      <div>Bass:   {pct(s.bass)}</div>
      <div>Mid:    {pct(s.mid)}</div>
      <div>Treble: {pct(s.treble)}</div>
      <div>Beat:   {pct(s.beat)}</div>
      <div>────────────</div>
      <div>Energy:     {pct(mood.energy)}</div>
      <div>Tension:    {pct(mood.tension)}</div>
      <div>Smoothness: {pct(mood.smoothness)}</div>
      <div>Chaos:      {pct(mood.chaos)}</div>
    </div>
  );
}

function pct(v) {
  return v != null ? (v * 100).toFixed(1) + '%' : '—';
}
