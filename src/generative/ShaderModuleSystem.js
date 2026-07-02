const MODULE_UNIFORMS = `
uniform float u_isEvolving;
uniform float u_genome[15];
uniform float u_modeWeights[7];
uniform float u_eventBloom;
`;

const MODULES = `
float gene(int index) {
  if (index == 0) return u_genome[0];
  if (index == 1) return u_genome[1];
  if (index == 2) return u_genome[2];
  if (index == 3) return u_genome[3];
  if (index == 4) return u_genome[4];
  if (index == 5) return u_genome[5];
  if (index == 6) return u_genome[6];
  if (index == 7) return u_genome[7];
  if (index == 8) return u_genome[8];
  if (index == 9) return u_genome[9];
  if (index == 10) return u_genome[10];
  if (index == 11) return u_genome[11];
  if (index == 12) return u_genome[12];
  if (index == 13) return u_genome[13];
  return u_genome[14];
}

float fbm(vec3 p) {
  float value = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    value += noise3(p) * amp;
    p = p * 2.03 + vec3(7.1, 3.7, 5.3);
    amp *= 0.5;
  }
  return value;
}

vec2 kaleido(vec2 p, float segments) {
  float a = atan(p.y, p.x);
  float r = length(p);
  float tau = 6.28318530718;
  float slice = tau / max(1.0, segments);
  a = abs(mod(a + slice * 0.5, slice) - slice * 0.5);
  return vec2(cos(a), sin(a)) * r;
}

vec3 evolveDomain(vec3 p) {
  float turbulence = gene(3);
  float symmetry = gene(5);
  float noiseScale = gene(6);
  float rotationSpeed = gene(8);
  float distortion = gene(11);
  p.xy = kaleido(p.xy, symmetry);
  p.xy *= rot(u_time * rotationSpeed * 0.22 + u_bass * 0.18);
  float warp = fbm(p * noiseScale + vec3(u_time * 0.12, -u_time * 0.08, u_mid));
  p += vec3(sin(p.yzx * (1.4 + turbulence * 3.0) + warp * 4.0)) * distortion * 0.42;
  return p;
}

float evolvingMap(vec3 p) {
  vec3 q = evolveDomain(p);
  float d = 0.0;
  d += mapPrismVoid(q)       * u_modeWeights[0];
  d += mapKineticCubes(q)    * u_modeWeights[1];
  d += mapSpectralLattice(q) * u_modeWeights[2];
  d += mapWater(q)           * u_modeWeights[3];
  d += mapChladni(q)         * u_modeWeights[4];
  d += mapPlasmaOrb(q)       * u_modeWeights[5];
  d += mapWaveTerrain(q)     * u_modeWeights[6];
  return d;
}

vec3 hueShiftColor(vec3 color, float shift) {
  vec3 k = vec3(0.57735);
  float angle = shift * 6.28318530718;
  return color * cos(angle) + cross(k, color) * sin(angle) + k * dot(k, color) * (1.0 - cos(angle));
}

vec3 evolvingColor(vec3 p, float travel, vec2 uv) {
  float hue = gene(0);
  float saturation = gene(1);
  float bloom = gene(2);
  float pulse = gene(10);
  float chroma = gene(12);
  float waves = gene(13);
  float fractal = gene(14);
  float field = fbm(p * (1.2 + waves * 1.6) + u_time * 0.16);
  vec3 col = spectral(hue + field * 0.25 + travel * 0.026 + u_mid * 0.35);
  col = mix(vec3(dot(col, vec3(0.299, 0.587, 0.114))), col, saturation);
  col += spectral(hue + 0.33 + length(p.xy) * 0.12) * fractal * 0.28;
  col += vec3(0.9, 0.35, 1.0) * chroma * u_high * (0.18 / (0.08 + abs(evolvingMap(p))));
  float edgeLift = 0.55 + 0.45 * smoothstep(1.65, 0.35, length(uv));
  col *= 0.78 + u_mood_energy * 0.62 + u_beat * pulse * 0.38 + u_eventBloom * bloom;
  col *= edgeLift;
  return hueShiftColor(col, hue * 0.18 + u_time * 0.01);
}

vec4 renderEvolving(vec2 uv) {
  float density = gene(9);
  float feedback = gene(7);
  float chroma = gene(12);
  float pulse = gene(10);
  vec3 ro = vec3(u_camOffset * (0.32 + u_bass * 0.55), -5.15 + u_bass * 0.65);
  ro.xy *= rot(u_time * gene(8) * 0.08);
  vec3 rd = normalize(vec3(uv * 0.72, 1.2 + density * 0.08));
  float t = 0.0;
  float glow = 0.0;
  vec3 col = vec3(0.0);
  for (int i = 0; i < 76; i++) {
    vec3 p = ro + rd * t;
    float d = evolvingMap(p);
    float field = fbm(evolveDomain(p) * (0.55 + gene(6) * 0.32) + vec3(0.0, 0.0, u_time * 0.08));
    float organism = exp(-abs(d) * (2.75 + density * 1.55));
    float filaments = 1.0 - smoothstep(0.025, 0.18, abs(d));
    float veins = smoothstep(0.62, 1.0, field) * (0.32 + gene(14));
    float breath = 0.72 + 0.28 * sin(u_time * (0.55 + gene(13) * 0.35) + field * 5.0);
    vec3 sampleCol = evolvingColor(p, t, uv);
    col += sampleCol * (organism * 0.028 + veins * 0.024 + filaments * 0.018) * breath;
    glow += organism * 0.008 * (1.0 + gene(2) + u_eventBloom);
    if (abs(d) < 0.0035) {
      col += sampleCol * (0.38 + u_beat * pulse * 0.22);
      break;
    }
    if (t > 42.0) break;
    t += max(abs(d) * (0.34 + density * 0.06), 0.035);
  }
  float aura = smoothstep(2.05, 0.0, length(uv));
  float quietFloor = 0.16 + max(u_mood_energy, u_bass + u_mid * 0.5) * 0.12;
  float net = abs(sin(uv.x * (5.0 + gene(5)) + fbm(vec3(uv * 1.4, u_time * 0.04)) * 3.0));
  net *= abs(sin(uv.y * (4.0 + gene(6) * 2.0) - u_time * 0.18));
  vec3 livingMist = spectral(gene(0) + u_time * 0.022 + fbm(vec3(uv * 1.8, u_time * 0.055)) * 0.28);
  col += livingMist * aura * (quietFloor + u_beat * 0.05);
  col += spectral(gene(0) + 0.22 + length(uv) * 0.1) * smoothstep(0.68, 0.96, net) * aura * (0.035 + u_mid * 0.08);
  col += spectral(gene(0) + u_time * 0.035) * glow * (1.3 + feedback * 2.4);
  col.r += chroma * u_high * 0.035 * aura;
  col.b += chroma * (0.02 + u_treble * 0.04) * aura;
  col = col / (1.0 + col);
  return vec4(pow(clamp(col, 0.0, 1.0), vec3(0.86)), 1.0);
}
`;

export class ShaderModuleSystem {
  constructor() {
    this.cache = new Map();
  }

  compose(fragmentSource, key = 'evolving-v1') {
    if (this.cache.has(key)) return this.cache.get(key);
    let source = fragmentSource.replace('uniform float u_zoom;', `uniform float u_zoom;\n${MODULE_UNIFORMS}`);
    source = source.replace('float map(vec3 p, int mode) {', `${MODULES}\nfloat map(vec3 p, int mode) {`);
    source = source.replace(
      '  uv *= 1.0 / (0.8 + u_zoom * 0.4);\n',
      '  uv *= 1.0 / (0.8 + u_zoom * 0.4);\n\n  if (u_isEvolving > 0.5) {\n    gl_FragColor = renderEvolving(uv);\n    return;\n  }\n'
    );
    this.cache.set(key, source);
    return source;
  }
}
