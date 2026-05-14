precision highp float;

uniform float u_bass;
uniform float u_mid;
uniform float u_high;
uniform float u_beat;
uniform float u_time;

void main() {
  // Soft circular point sprite
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);
  if (dist > 0.5) discard;

  float alpha = 1.0 - smoothstep(0.3, 0.5, dist);

  // Color: spectral based on bass/mid
  float hue = u_mid * 0.6 + u_time * 0.02;
  vec3 a = vec3(0.5);
  vec3 b = vec3(0.5);
  vec3 c = vec3(1.0);
  vec3 d = vec3(0.0, 0.33, 0.67);
  vec3 color = a + b * cos(6.28318 * (c * hue + d));

  // Brighten on beat
  color += u_beat * 0.3;

  // Inner glow
  color += (1.0 - dist * 2.0) * u_high * 0.4;

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), alpha * (0.6 + u_bass * 0.4));
}
