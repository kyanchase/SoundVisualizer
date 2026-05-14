export class ShaderManager {
  constructor(gl) {
    this.gl = gl;
    this._programs = {};
  }

  _compile(type, src) {
    const gl = this.gl;
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(sh));
      console.error('Source:', src.split('\n').map((l, i) => `${i+1}: ${l}`).join('\n'));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  createProgram(name, vertSrc, fragSrc) {
    const gl = this.gl;
    const vert = this._compile(gl.VERTEX_SHADER, vertSrc);
    const frag = this._compile(gl.FRAGMENT_SHADER, fragSrc);
    if (!vert || !frag) return null;

    const prog = gl.createProgram();
    gl.attachShader(prog, vert);
    gl.attachShader(prog, frag);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(prog));
      return null;
    }

    // Cache uniform locations
    const uniforms = {};
    const nUniforms = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < nUniforms; i++) {
      const info = gl.getActiveUniform(prog, i);
      uniforms[info.name] = gl.getUniformLocation(prog, info.name);
    }

    this._programs[name] = { prog, uniforms };
    return this._programs[name];
  }

  use(name) {
    const p = this._programs[name];
    if (p) this.gl.useProgram(p.prog);
    return p;
  }

  setFloat(name, uniName, val) {
    const p = this._programs[name];
    if (p && p.uniforms[uniName] != null)
      this.gl.uniform1f(p.uniforms[uniName], val);
  }

  setInt(name, uniName, val) {
    const p = this._programs[name];
    if (p && p.uniforms[uniName] != null)
      this.gl.uniform1i(p.uniforms[uniName], val);
  }

  setVec2(name, uniName, x, y) {
    const p = this._programs[name];
    if (p && p.uniforms[uniName] != null)
      this.gl.uniform2f(p.uniforms[uniName], x, y);
  }

  getUniform(name, uniName) {
    return this._programs[name]?.uniforms[uniName];
  }
}
