export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const map = (v, inLo, inHi, outLo, outHi) => outLo + (v - inLo) / (inHi - inLo) * (outHi - outLo);
export const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};
export const toPolar = (x, y) => ({ r: Math.sqrt(x*x + y*y), theta: Math.atan2(y, x) });
export const fromPolar = (r, theta) => ({ x: r * Math.cos(theta), y: r * Math.sin(theta) });
