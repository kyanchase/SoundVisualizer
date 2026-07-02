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
  p.z += u_time * 0.48;
  p.xy *= rot(p.z * 0.075 + u_time * 0.035 + u_camOffset.x * 0.6);
  vec3 q = mod(p, 9.0) - 4.5;
  for (int i = 0; i < 4; i++) {
    q = abs(q) - (1.25 + u_mid * 0.12);
    q.xz *= rot(u_time * 0.12 + u_bass * 0.08);
    q *= 1.18;
  }
  return sdOctahedron(q, 1.25 + u_bass * 0.45) * 0.12;
}

// --- Mode 1: Kinetic Cubes (Plasma) ---
float mapKineticCubes(vec3 p) {
  p.xz *= rot(u_time * 0.24 + u_camOffset.x);
  p.yz *= rot(u_time * 0.16 + u_camOffset.y);
  vec3 q = mod(p, 8.0) - 4.0;
  vec3 id = floor(p / 8.0);
  q.xy *= rot(u_time * 0.42 + length(id) * 0.18 + u_beat * 0.26);
  float cube = length(max(abs(q) - vec3(0.68 + u_bass * 0.42), 0.0));
  float orbit = length(q.xy) - (1.35 + u_mid * 0.45);
  return min(cube, abs(orbit) - 0.035);
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
  vec2 q = p.xy;
  float r = length(q);
  float t = u_time * (0.55 + u_mood_smoothness * 0.25);
  float wave = sin(q.x * (1.6 + u_lowMid * 2.4) - t * 1.7) * 0.18;
  wave += sin(q.y * (1.25 + u_mid * 2.0) + t * 1.35) * 0.14;
  wave += sin(r * (4.5 + u_bass * 4.0) - t * 2.8) * (0.18 + u_bass * 0.34);
  wave += noise3(vec3(q * (1.3 + u_treble * 1.8), t * 0.55)) * 0.12;
  p.z -= wave;
  return abs(p.z) - (0.05 + u_beat * 0.055);
}

// --- Mode 4: Chladni / Geometry ---
float mapChladni(vec3 p) {
  vec2 q = p.xy;
  float a = 2.0 + floor(u_bass * 5.0);
  float b = 3.0 + floor(u_mid * 5.0);
  float plate = max(abs(q.x), abs(q.y)) - 3.4;
  float nodal = sin(a * q.x + u_time * 0.16) * sin(b * q.y - u_time * 0.11);
  nodal += 0.45 * sin((a + b) * (q.x + q.y) * 0.45 + u_mood_tension);
  float ridge = abs(nodal);
  float dust = noise3(vec3(q * 4.0, u_time * 0.25)) * 0.05;
  p.z -= (0.08 - ridge * 0.2 + dust) * (0.9 + u_beat * 1.2);
  return max(abs(p.z) - (0.025 + u_bass * 0.015), plate);
}

// --- Mode 5: Plasma Orb ---
float mapPlasmaOrb(vec3 p) {
  p.xy *= rot(u_time * 0.08 + u_camOffset.x * 0.2);
  float n = noise3(p * 1.3 + u_time * 0.22) * 0.46;
  n += noise3(p * 3.0 - u_time * 0.32) * 0.28;
  n += noise3(p * 7.0 + vec3(u_mid, u_highMid, u_time * 0.18)) * 0.14;
  float bands = sin(atan(p.y, p.x) * (5.0 + floor(u_mid * 5.0)) + p.z * 3.0 + u_time * (0.8 + u_high)) * 0.06;
  float radius = 1.08 + u_bass * 0.72 + u_beat * 0.28 + (n + bands) * (0.36 + u_mid * 0.84);
  return length(p) - radius;
}

// --- Mode 6: Wave Terrain ---
float mapWaveTerrain(vec3 p) {
  vec2 q = p.xz;
  float t = u_time * 0.42;
  float h = sin(q.x * 0.48 + t) * cos(q.y * 0.36 - t * 0.65) * 0.32;
  h += sin(q.x * 0.95 - t * 1.15) * cos(q.y * 0.82 + t * 0.78) * 0.16;
  h += sin(length(q) * (0.75 + u_bass * 0.7) - t * 1.65) * (0.12 + u_bass * 0.38 + u_beat * 0.18);
  h += sin(q.x * 1.55 + t * 1.2) * sin(q.y * 1.25 + t * 0.85) * u_mid * 0.26;
  return abs(p.y - h) - (0.04 + u_beat * 0.025);
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
    vec3 ro = vec3(0.0, 0.0, -3.65 - u_bass * 0.3);
    vec3 rd = normalize(vec3(uv * 0.92, 1.32 - u_bass * 0.16));
    float t = 0.0;
    float glow = 0.0;
    for (int i = 0; i < 56; i++) {
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
      float vein = smoothstep(0.48, 0.9, lava) * smoothstep(1.45, 0.45, length(p));
      vec3 core = spectral(u_time * 0.035 + lava * 0.28 + u_mid * 0.25);
      vec3 rim = mix(vec3(0.24, 0.92, 1.0), vec3(1.0, 0.55, 0.22), 0.35 + u_highMid * 0.4 + u_beat * 0.18);
      col = core * (0.22 + energy * 0.95) + rim * fresnel * (1.05 + u_high * 1.1);
      col += spectral(length(p) * 0.5 + u_time * 0.06) * vein * (0.28 + u_mid * 0.45);
      col += spectral(length(p.xy) * 0.34 + u_time * 0.04) * u_beat * 0.42;
    }
    col += spectral(u_time * 0.03 + u_mid * 0.3) * glow * (0.85 + energy * 2.35);
    col *= smoothstep(1.95, 0.2, length(uv));
    col = col / (1.0 + col);
    gl_FragColor = vec4(pow(col, vec3(0.82)), 1.0);
    return;
  }

  if (u_currMode == 6) {
    float energy = u_bass * 0.6 + u_mid * 0.35 + u_high * 0.15;
    vec3 ro = vec3(0.0, 2.25 + u_bass * 0.5, -u_time * (0.38 + energy * 0.75));
    vec3 rd = normalize(vec3(uv.x * 1.12, uv.y - 0.32 + u_bass * 0.05, 1.28));
    float t = 0.0;
    vec3 col = vec3(0.0);
    for (int i = 0; i < 64; i++) {
      vec3 p = ro + rd * t;
      float d = mapWaveTerrain(p);
      if (abs(d) < 0.004 || t > 48.0) {
        float wave = sin(p.x * 0.44 + u_time * 0.45) + sin(p.z * 0.36 - u_time * 0.32);
        float grid = 1.0 - smoothstep(0.035, 0.085, min(abs(fract(p.x * 0.34) - 0.5), abs(fract(p.z * 0.34) - 0.5)));
        float crest = smoothstep(0.52, 1.0, sin(p.y * 2.2 + wave + u_mid * 2.5) * 0.5 + 0.5);
        vec3 base = spectral(0.58 + wave * 0.08 + u_time * 0.018 + u_mid * 0.18);
        vec3 low = vec3(0.03, 0.18, 0.28);
        col = mix(low, base, 0.48 + energy * 0.42) + vec3(0.25, 0.8, 0.95) * grid * (0.16 + u_beat * 0.35);
        col += spectral(0.12 + p.y * 0.12 + u_time * 0.03) * crest * (0.12 + u_highMid * 0.28);
        col *= exp(-t * 0.035);
        break;
      }
      t += max(d * 0.62, 0.018);
    }
    float horizon = 1.0 - smoothstep(0.0, 0.32, abs(rd.y + 0.1));
    col += spectral(0.52 + u_time * 0.015) * horizon * (0.12 + energy * 0.45);
    col *= smoothstep(1.9, 0.25, length(uv));
    col = col / (1.0 + col);
    gl_FragColor = vec4(pow(col, vec3(0.85)), 1.0);
    return;
  }

  vec3 ro = vec3(u_camOffset * 0.5, -7.0);
  vec3 rd = normalize(vec3(uv, 1.2));

  float t = 0.0;
  for (int i = 0; i < 72; i++) {
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
  col *= 1.55;

  // Vignette
  float vig = 1.0 - dot(uv * 0.5, uv * 0.5);
  col *= vig;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
