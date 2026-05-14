// JS mirror of the spectral() GLSL palette function
export function spectral(t) {
  const a = 0.5, b = 0.5, c = 1.0;
  const dr = 0.0, dg = 0.33, db = 0.67;
  const r = a + b * Math.cos(6.28318 * (c * t + dr));
  const g = a + b * Math.cos(6.28318 * (c * t + dg));
  const bl = a + b * Math.cos(6.28318 * (c * t + db));
  return [r, g, bl];
}

// Returns css rgb string from spectral palette
export function spectralCss(t) {
  const [r, g, b] = spectral(t);
  return `rgb(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)})`;
}

// Maps an audio feature (0..1) to a hue via palette
export function audioToColor(bass, mid) {
  return spectralCss(mid * 0.6 + bass * 0.2);
}
