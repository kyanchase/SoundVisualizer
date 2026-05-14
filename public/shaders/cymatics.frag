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

float hash31(vec3 p) {
  return fract(sin(dot(p, vec3(12.9, 78.2, 37.7))) * 43758.5);
}

float noise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(
      mix(hash31(i), hash31(i + vec3(1.0, 0.0, 0.0)), f.x),
      mix(hash31(i + vec3(0.0, 1.0, 0.0)), hash31(i + vec3(1.0, 1.0, 0.0)), f.x),
      f.y
    ),
    mix(
      mix(hash31(i + vec3(0.0, 0.0, 1.0)), hash31(i + vec3(1.0, 0.0, 1.0)), f.x),
      mix(hash31(i + vec3(0.0, 1.0, 1.0)), hash31(i + vec3(1.0, 1.0, 1.0)), f.x),
      f.y
    ),
    f.z
  );
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

// --- Mode 5: Plasma Orb ---
float mapPlasmaOrb(vec3 p) {
  p.xy *= rot(u_time * 0.08 + u_camOffset.x * 0.2);
  float n = noise3(p * 1.5 + u_time * 0.25) * 0.5;
  n += noise3(p * 3.2 - u_time * 0.35) * 0.25;
  n += noise3(p * 6.0 + u_mid) * 0.12;
  float radius = 1.0 + u_bass * 0.85 + u_beat * 0.35 + n * (0.25 + u_mid * 0.75);
  return length(p) - radius;
}

// --- Mode 6: Wave Terrain ---
float mapWaveTerrain(vec3 p) {
  vec2 q = p.xz;
  float t = u_time;
  float h = sin(q.x * 0.65 + t) * cos(q.y * 0.45 - t * 0.8) * 0.35;
  h += sin(q.x * 1.4 - t * 1.5) * cos(q.y * 1.0 + t) * 0.18;
  h += sin(length(q) * (1.0 + u_bass * 0.8) - t * 2.0) * (u_bass * 0.5 + u_beat * 0.35);
  h += sin(q.x * 2.2 + t * 2.0) * sin(q.y * 1.8 + t) * u_mid * 0.35;
  return abs(p.y - h) - (0.035 + u_beat * 0.04);
}

float map(vec3 p, int mode) {
  if (mode == 0) return mapPrismVoid(p);
  if (mode == 1) return mapKineticCubes(p);
  if (mode == 2) return mapSpectralLattice(p);
  if (mode == 3) return mapWater(p);
  if (mode == 4) return mapChladni(p);
  if (mode == 5) return mapPlasmaOrb(p);
  return mapWaveTerrain(p);
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_res.xy) / min(u_res.x, u_res.y);
  uv *= 1.0 / (0.8 + u_zoom * 0.4);

  if (u_currMode == 5) {
    float energy = u_bass * 0.65 + u_mid * 0.35 + u_high * 0.2;
    vec3 ro = vec3(0.0, 0.0, -4.0 - u_bass * 0.35);
    vec3 rd = normalize(vec3(uv, 1.35 - u_bass * 0.18));
    float t = 0.0;
    float glow = 0.0;
    for (int i = 0; i < 72; i++) {
      vec3 p = ro + rd * t;
      float d = mapPlasmaOrb(p);
      glow += exp(-abs(d) * (2.6 - u_bass * 0.8)) * (0.01 + u_mid * 0.012);
      if (abs(d) < 0.003 || t > 8.0) break;
      t += d * 0.55;
    }

    vec3 col = vec3(0.0);
    if (t < 8.0) {
      vec3 p = ro + rd * t;
      vec3 n = normalize(vec3(
        mapPlasmaOrb(p + vec3(0.012, 0.0, 0.0)) - mapPlasmaOrb(p - vec3(0.012, 0.0, 0.0)),
        mapPlasmaOrb(p + vec3(0.0, 0.012, 0.0)) - mapPlasmaOrb(p - vec3(0.0, 0.012, 0.0)),
        mapPlasmaOrb(p + vec3(0.0, 0.0, 0.012)) - mapPlasmaOrb(p - vec3(0.0, 0.0, 0.012))
      ));
      float fresnel = pow(1.0 - max(0.0, dot(-rd, n)), 2.4);
      float lava = noise3(p * (4.0 + u_mid * 5.0) + u_time * (0.8 + energy));
      vec3 core = mix(vec3(0.12, 0.35, 1.0), vec3(1.0, 0.12, 0.75), lava);
      vec3 rim = mix(vec3(0.2, 0.95, 1.0), vec3(1.0, 0.85, 0.25), u_beat);
      col = core * (0.18 + energy * 0.9) + rim * fresnel * (1.2 + u_high * 1.3);
      col += spectral(length(p) * 0.3 + u_time * 0.08) * u_beat * 0.55;
    }
    col += mix(vec3(0.15, 0.45, 1.0), vec3(1.0, 0.18, 0.7), 0.55) * glow * (0.75 + energy * 2.2);
    col *= smoothstep(1.75, 0.18, length(uv));
    col = col / (1.0 + col);
    gl_FragColor = vec4(pow(col, vec3(0.82)), 1.0);
    return;
  }

  if (u_currMode == 6) {
    float energy = u_bass * 0.6 + u_mid * 0.35 + u_high * 0.15;
    vec3 ro = vec3(0.0, 2.6 + u_bass * 0.65, -u_time * (1.2 + energy * 2.2));
    vec3 rd = normalize(vec3(uv.x, uv.y - 0.48 + u_bass * 0.08, 1.15));
    float t = 0.0;
    vec3 col = vec3(0.0);
    for (int i = 0; i < 86; i++) {
      vec3 p = ro + rd * t;
      float d = mapWaveTerrain(p);
      if (abs(d) < 0.004 || t > 48.0) {
        float wave = sin(p.x * 0.7 + u_time) + sin(p.z * 0.45 - u_time * 0.7);
        float grid = smoothstep(0.47, 0.5, max(abs(fract(p.x * 0.45) - 0.5), abs(fract(p.z * 0.45) - 0.5)));
        vec3 base = mix(vec3(0.04, 0.35, 0.9), vec3(0.0, 1.0, 0.85), 0.5 + 0.5 * sin(wave + u_mid * 3.0));
        col = base * (0.25 + energy * 1.6) + vec3(0.25, 0.9, 1.0) * grid * (0.7 + u_beat);
        col *= exp(-t * 0.055);
        col += spectral(t * 0.03 + u_time * 0.05) * u_beat * 0.35;
        break;
      }
      t += max(d * 0.72, 0.018);
    }
    float horizon = 1.0 - smoothstep(0.0, 0.35, abs(rd.y + 0.18));
    col += vec3(0.1, 0.65, 1.0) * horizon * (0.18 + energy);
    col *= smoothstep(1.7, 0.25, length(uv));
    col = col / (1.0 + col);
    gl_FragColor = vec4(pow(col, vec3(0.85)), 1.0);
    return;
  }

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

    if (u_currMode == 5 && u_nextMode == 5) {
      vec3 p = ro + rd * t;
      vec3 n = normalize(vec3(
        mapPlasmaOrb(p + vec3(0.01, 0.0, 0.0)) - mapPlasmaOrb(p - vec3(0.01, 0.0, 0.0)),
        mapPlasmaOrb(p + vec3(0.0, 0.01, 0.0)) - mapPlasmaOrb(p - vec3(0.0, 0.01, 0.0)),
        mapPlasmaOrb(p + vec3(0.0, 0.0, 0.01)) - mapPlasmaOrb(p - vec3(0.0, 0.0, 0.01))
      ));
      float fresnel = pow(1.0 - max(0.0, dot(-rd, n)), 2.0);
      col = mix(vec3(0.15, 0.45, 1.0), vec3(1.0, 0.25, 0.85), 0.5 + 0.5 * sin(length(p) * 1.7 + u_time));
      col *= 0.25 + fresnel * (1.4 + u_high * 0.9);
    }

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
