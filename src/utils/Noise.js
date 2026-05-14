// Simplex-like 2D noise for organic drift in CameraController and NeuralMode
const perm = new Uint8Array(512);
const grad2 = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];

// Initialize permutation table once
(function init() {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
})();

function dot2(g, x, y) { return g[0]*x + g[1]*y; }

export function noise2(x, y) {
  const F = (Math.sqrt(3) - 1) / 2;
  const G = (3 - Math.sqrt(3)) / 6;
  const s = (x + y) * F;
  const i = Math.floor(x + s);
  const j = Math.floor(y + s);
  const t = (i + j) * G;
  const X0 = i - t, Y0 = j - t;
  const x0 = x - X0, y0 = y - Y0;
  const i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
  const x1 = x0 - i1 + G, y1 = y0 - j1 + G;
  const x2 = x0 - 1 + 2*G, y2 = y0 - 1 + 2*G;
  const ii = i & 255, jj = j & 255;
  const gi0 = perm[ii + perm[jj]] % 8;
  const gi1 = perm[ii + i1 + perm[jj + j1]] % 8;
  const gi2 = perm[ii + 1 + perm[jj + 1]] % 8;
  let n0 = 0, n1 = 0, n2 = 0;
  let t0 = 0.5 - x0*x0 - y0*y0;
  if (t0 >= 0) { t0 *= t0; n0 = t0*t0*dot2(grad2[gi0], x0, y0); }
  let t1 = 0.5 - x1*x1 - y1*y1;
  if (t1 >= 0) { t1 *= t1; n1 = t1*t1*dot2(grad2[gi1], x1, y1); }
  let t2 = 0.5 - x2*x2 - y2*y2;
  if (t2 >= 0) { t2 *= t2; n2 = t2*t2*dot2(grad2[gi2], x2, y2); }
  return 70 * (n0 + n1 + n2); // returns -1..1
}
