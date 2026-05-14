precision highp float;

uniform float u_time;
uniform float u_bass;
uniform float u_mid;
uniform float u_high;
uniform float u_beat;
uniform float u_lowMid;
uniform float u_highMid;
uniform float u_treble;
uniform float u_mood_energy;
uniform float u_mood_tension;
uniform float u_mood_smoothness;
uniform float u_transition;
uniform int   u_currMode;
uniform int   u_nextMode;
uniform vec2  u_res;
uniform vec2  u_camOffset;
uniform float u_zoom;

mat2 rot(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

// Spectral color palette
vec3 spectral(float t) {
  vec3 a = vec3(0.5);
  vec3 b = vec3(0.5);
  vec3 c = vec3(1.0);
  vec3 d = vec3(0.0, 0.33, 0.67);
  return a + b * cos(6.28318 * (c * t + d));
}

float sdOctahedron(vec3 p, float s) {
  p = abs(p);
  return (p.x + p.y + p.z - s) * 0.57735027;
}

// --- Mode 0: Prism Void (Neural/Fractal) ---
float mapPrismVoid(vec3 p) {
  p.z += u_time * 0.8;
  p.xy *= rot(p.z * 0.1 + u_time * 0.05 + u_camOffset.x);
  vec3 q = mod(p, 10.0) - 5.0;
  for (int i = 0; i < 4; i++) {
    q = abs(q) - 1.5;
    q.xz *= rot(u_time * 0.2 + u_bass * 0.1);
    q *= 1.25;
  }
  return sdOctahedron(q, 1.2 + u_bass) * 0.1;
}

// --- Mode 1: Kinetic Cubes (Plasma) ---
float mapKineticCubes(vec3 p) {
  p.xz *= rot(u_time * 0.3 + u_camOffset.x);
  p.yz *= rot(u_time * 0.2 + u_camOffset.y);
  vec3 q = mod(p, 8.0) - 4.0;
  vec3 id = floor(p / 8.0);
  q.xy *= rot(u_time * 0.5 + length(id) * 0.1 + u_beat * 0.3);
  return length(max(abs(q) - vec3(0.7 + u_bass * 0.5), 0.0));
}

// --- Mode 2: Spectral Lattice (Geometry) ---
float mapSpectralLattice(vec3 p) {
  p.z += u_time * 0.6;
  p.xy *= rot(sin(u_time * 0.1) + u_camOffset.x);
  vec3 q = abs(mod(p, 4.0) - 2.0);
  for (int i = 0; i < 3; i++) {
    q = abs(q) - 0.5;
    q.xy *= rot(u_time * 0.3 + u_mood_tension * 0.5);
    q *= 1.5 + u_bass * 0.1;
  }
  return length(q.xz) - (0.15 + u_mid * 0.5);
}

// --- Mode 3: Water / Ripples ---
float mapWater(vec3 p) {
  // Radial ripple: z(r,t) = sin(f*r - omega*t)
  float r = length(p.xy);
  float f = 1.5 + u_bass * 3.0;
  float omega = u_time * 2.0;
  float fine = sin(r * (8.0 + u_treble * 12.0) - omega * 3.0) * 0.05;
  float coarse = sin(r * f - omega) * (0.2 + u_bass * 0.4);
  float wave = coarse + fine;
  // Convert to SDF: thin sheet at wave height
  p.z -= wave;
  return abs(p.z) - 0.06 - u_beat * 0.1;
}

// --- Mode 4: Chladni / Geometry ---
float mapChladni(vec3 p) {
  float a = 1.0 + u_bass * 3.0;
  float b = 1.0 + u_mid * 3.0;
  // z(x,y) = sin(a*x)*sin(b*y)
  float nodal = sin(a * p.x) * sin(b * p.y);
  // Symmetry breakdown from mood tension
  float sym = sin(a * p.x + u_mood_tension) * sin(b * p.y + u_mood_tension * 0.7);
  float z = mix(nodal, sym, u_mood_tension * 0.5);
  p.z -= z * (0.3 + u_beat * 0.2);
  return abs(p.z) - 0.04;
}

float map(vec3 p, int mode) {
  if (mode == 0) return mapPrismVoid(p);
  if (mode == 1) return mapKineticCubes(p);
  if (mode == 2) return mapSpectralLattice(p);
  if (mode == 3) return mapWater(p);
  return mapChladni(p);
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_res.xy) / min(u_res.x, u_res.y);
  uv *= 1.0 / (0.8 + u_zoom * 0.4);

  vec3 ro = vec3(u_camOffset * 0.5, -7.0);
  vec3 rd = normalize(vec3(uv, 1.2));

  float t = 0.0;
  for (int i = 0; i < 100; i++) {
    vec3 p = ro + rd * t;
    float dA = map(p, u_currMode);
    float dB = map(p, u_nextMode);
    float dist = mix(dA, dB, u_transition);
    if (abs(dist) < 0.002 || t > 50.0) break;
    t += dist;
  }

  vec3 col = vec3(0.0);
  if (t < 50.0) {
    // Color from spectral palette driven by mid (melody)
    float grad = t * 0.04 + u_time * 0.05 + u_mid * 0.8;
    col = spectral(grad);

    // Depth falloff
    col *= exp(-t * 0.12);

    // Treble glimmer
    col += (u_high * 0.15) / (t * 0.5 + 0.001);

    // Beat pulse brightening
    col += u_beat * 0.2 * spectral(grad + 0.3);

    // Energy-based brightness
    col *= 0.8 + u_mood_energy * 0.6;
  }

  // Contrast
  col = pow(col, vec3(1.2));
  col *= 1.2;

  // Vignette
  float vig = 1.0 - dot(uv * 0.5, uv * 0.5);
  col *= vig;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
