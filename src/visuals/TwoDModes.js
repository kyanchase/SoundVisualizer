const makeMode = (name) => ({
  name,
  type: '2d',
  feedbackBase: 0.9,
  usesRipple: false,
  usesChladni: false,
  usesParticles: false,
});

export const RadialBarsMode = makeMode('Radial Bars');
export const LinearSpectrumMode = makeMode('Linear Spectrum');
export const ParticleFieldMode = makeMode('Particle Field');
export const WaveformRingsMode = makeMode('Waveform Rings');
export const KaleidoscopeMode = makeMode('Kaleidoscope');
