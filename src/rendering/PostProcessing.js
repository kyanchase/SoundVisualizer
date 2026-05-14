// Simple bloom: bright regions are blurred and additively blended
const BLOOM_VERT = `
attribute vec2 pos;
varying vec2 v_uv;
void main() {
  v_uv = pos * 0.5 + 0.5;
  gl_Position = vec4(pos, 0.0, 1.0);
}`;

const BLOOM_FRAG = `
precision mediump float;
uniform sampler2D u_scene;
uniform vec2 u_res;
uniform float u_strength;
varying vec2 v_uv;

void main() {
  vec2 texel = 1.0 / u_res;
  vec3 col = texture2D(u_scene, v_uv).rgb;

  // Box blur for bloom
  vec3 blur = vec3(0.0);
  float total = 0.0;
  for (int x = -3; x <= 3; x++) {
    for (int y = -3; y <= 3; y++) {
      vec3 s = texture2D(u_scene, v_uv + vec2(float(x), float(y)) * texel * 3.0).rgb;
      float lum = dot(s, vec3(0.299, 0.587, 0.114));
      float w = max(0.0, lum - 0.5);
      blur += s * w;
      total += w;
    }
  }
  if (total > 0.0) blur /= total;

  col += blur * u_strength;

  // Vignette
  vec2 uv = v_uv * 2.0 - 1.0;
  float vig = 1.0 - dot(uv * 0.5, uv * 0.5);
  col *= vig;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

export class PostProcessing {
  constructor(gl, shaderManager) {
    this.gl = gl;
    this.sm = shaderManager;
    this.sm.createProgram('bloom', BLOOM_VERT, BLOOM_FRAG);
    this._setupQuad();
  }

  _setupQuad() {
    const gl = this.gl;
    this._quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this._quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  }

  apply(sourceFB, strength = 0.5) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    const prog = this.sm.use('bloom');
    if (!prog) return;

    gl.bindBuffer(gl.ARRAY_BUFFER, this._quadBuf);
    const posLoc = gl.getAttribLocation(prog.prog, 'pos');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    sourceFB.bindTexture(0);
    gl.uniform1i(prog.uniforms['u_scene'], 0);
    gl.uniform2f(prog.uniforms['u_res'], sourceFB.width, sourceFB.height);
    gl.uniform1f(prog.uniforms['u_strength'], strength);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
