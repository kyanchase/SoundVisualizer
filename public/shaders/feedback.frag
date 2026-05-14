precision highp float;

uniform sampler2D u_prevFrame;
uniform float u_alpha;
uniform vec2 u_res;

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  vec4 prev = texture2D(u_prevFrame, uv);
  // Decay previous frame — creates fluid trails
  gl_FragColor = vec4(prev.rgb * u_alpha, 1.0);
}
