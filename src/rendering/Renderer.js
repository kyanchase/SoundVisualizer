import { ShaderManager } from './ShaderManager.js';
import { Framebuffer } from './Framebuffer.js';
import { CameraController } from './CameraController.js';
import { PostProcessing } from './PostProcessing.js';
import { StandingWaveSim } from '../simulation/StandingWaveSim.js';
import { RippleSimulation } from '../simulation/RippleSimulation.js';
import { ChladniPatterns } from '../simulation/ChladniPatterns.js';
import { ParticleSystem } from '../simulation/ParticleSystem.js';
import { FluidFeedback } from '../simulation/FluidFeedback.js';
import { VISUAL_MODES } from '../visuals/index.js';

// Passthrough vertex shader for full-screen quad
const QUAD_VERT = `attribute vec2 pos; void main() { gl_Position = vec4(pos, 0.0, 1.0); }`;

// Feedback (blend) fragment shader
const FEEDBACK_FRAG = `
precision highp float;
uniform sampler2D u_prevFrame;
uniform float u_alpha;
uniform vec2 u_res;
void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  vec4 prev = texture2D(u_prevFrame, uv);
  gl_FragColor = vec4(prev.rgb * u_alpha, 1.0);
}`;

// Particles vertex shader
const PARTICLE_VERT = `
attribute vec2 pos;
uniform vec2 u_res;
void main() {
  gl_Position = vec4(pos, 0.0, 1.0);
  gl_PointSize = 2.5;
}`;

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl', { antialias: false, alpha: false });
    if (!this.gl) throw new Error('WebGL not supported');

    this.sm = new ShaderManager(this.gl);
    this.camera = new CameraController();
    this.feedback = new FluidFeedback(0.92);

    this._elapsedTime = 0;
    this._lastTime = 0;
    this._currModeIdx = 0;
    this._nextModeIdx = 1;
    this._transition = 1.0;
    this._modeNames = Object.keys(VISUAL_MODES);
    this._transitionInterval = null;

    this._standingWave = new StandingWaveSim(128);
    this._ripple = new RippleSimulation(128);
    this._chladni = new ChladniPatterns(this._standingWave);
    this._particles = new ParticleSystem();

    this._quadBuf = null;
    this._particleBuf = null;
    this._sceneFB = null;
    this._prevFB = null;
    this._postProc = null;
    this._cymaticsShaderSrc = null;

    this._onModeChange = null;
    this._animFrame = null;
  }

  async init() {
    // Load shaders from public/shaders/
    const [vertSrc, cymatFrag, particlesFrag] = await Promise.all([
      fetch('/shaders/vertex.glsl').then(r => r.text()),
      fetch('/shaders/cymatics.frag').then(r => r.text()),
      fetch('/shaders/particles.frag').then(r => r.text()),
    ]);

    this.sm.createProgram('cymatics', vertSrc, cymatFrag);
    this.sm.createProgram('feedback', QUAD_VERT, FEEDBACK_FRAG);
    this.sm.createProgram('particles', PARTICLE_VERT, particlesFrag);

    this._postProc = new PostProcessing(this.gl, this.sm);

    this._setupQuad();
    this._setupParticleBuffer();
    this._resize();

    // Auto-transition between modes every 12 seconds
    this._transitionInterval = setInterval(() => this._triggerTransition(), 12000);

    this._lastTime = performance.now();
    this._loop();
  }

  _setupQuad() {
    const gl = this.gl;
    this._quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this._quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  }

  _setupParticleBuffer() {
    const gl = this.gl;
    this._particleBuf = gl.createBuffer();
  }

  _resize() {
    const gl = this.gl;
    const w = this.canvas.width;
    const h = this.canvas.height;
    gl.viewport(0, 0, w, h);

    if (this._sceneFB) {
      this._sceneFB.resize(w, h);
      this._prevFB.resize(w, h);
    } else {
      this._sceneFB = new Framebuffer(gl, w, h);
      this._prevFB  = new Framebuffer(gl, w, h);
    }
  }

  onResize() {
    this.canvas.width  = this.canvas.clientWidth  * window.devicePixelRatio;
    this.canvas.height = this.canvas.clientHeight * window.devicePixelRatio;
    this._resize();
  }

  _triggerTransition() {
    this._currModeIdx = this._nextModeIdx;
    this._nextModeIdx = (this._currModeIdx + 1) % this._modeNames.length;
    this._transition = 0.0;
    if (this._onModeChange) this._onModeChange(this._modeNames[this._currModeIdx]);
  }

  _setMode(idx) {
    this._currModeIdx = idx;
    this._nextModeIdx = (idx + 1) % this._modeNames.length;
    this._transition = 1.0;
    if (this._onModeChange) this._onModeChange(this._modeNames[idx]);
  }

  _loop() {
    this._animFrame = requestAnimationFrame(() => this._loop());
    const now = performance.now();
    const delta = (now - this._lastTime) * 0.001;
    this._lastTime = now;
    this._elapsedTime += delta;
    this._tick();
  }

  _tick() {
    const gl = this.gl;
    const audioState = this._audioState || {
      bass:0, lowMid:0, mid:0, highMid:0, treble:0, air:0,
      beat:0, bpm:0, dropIntensity:0,
      mood:{ energy:0, tension:0, smoothness:1, chaos:0 },
      raw: new Uint8Array(1024), active:false,
    };

    // Update simulations
    const currModeName = this._modeNames[this._currModeIdx];
    const currMode = VISUAL_MODES[currModeName];

    if (currMode?.usesRipple) this._ripple.update(audioState);
    if (currMode?.usesChladni || currMode?.usesParticles) {
      this._chladni.update(audioState);
    }
    if (currMode?.usesParticles) {
      const nodalPoints = this._chladni.getNodalPoints(150);
      this._particles.update(audioState, nodalPoints);
    }

    const cam = this.camera.update(audioState);
    const feedbackAlpha = this.feedback.update(audioState);

    if (this._transition < 1.0) this._transition = Math.min(1.0, this._transition + 0.006);

    // --- Render scene to offscreen FB ---
    this._sceneFB.bind();
    gl.viewport(0, 0, this._sceneFB.width, this._sceneFB.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Feedback layer first (trails from previous frame)
    {
      const prog = this.sm.use('feedback');
      if (prog) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this._quadBuf);
        const posLoc = gl.getAttribLocation(prog.prog, 'pos');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        this._prevFB.bindTexture(0);
        gl.uniform1i(prog.uniforms['u_prevFrame'], 0);
        gl.uniform1f(prog.uniforms['u_alpha'], feedbackAlpha);
        gl.uniform2f(prog.uniforms['u_res'], this._sceneFB.width, this._sceneFB.height);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    }

    // Cymatics main scene (blended on top with additive-ish blend)
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    {
      const prog = this.sm.use('cymatics');
      if (prog) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this._quadBuf);
        const posLoc = gl.getAttribLocation(prog.prog, 'pos');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        const u = prog.uniforms;
        const s = audioState;
        gl.uniform1f(u['u_time'],            this._elapsedTime);
        gl.uniform1f(u['u_bass'],            s.bass);
        gl.uniform1f(u['u_mid'],             s.mid);
        gl.uniform1f(u['u_high'],            s.air);
        gl.uniform1f(u['u_lowMid'],          s.lowMid);
        gl.uniform1f(u['u_highMid'],         s.highMid);
        gl.uniform1f(u['u_treble'],          s.treble);
        gl.uniform1f(u['u_beat'],            s.beat);
        gl.uniform1f(u['u_mood_energy'],     s.mood.energy);
        gl.uniform1f(u['u_mood_tension'],    s.mood.tension);
        gl.uniform1f(u['u_mood_smoothness'], s.mood.smoothness);
        gl.uniform1f(u['u_transition'],      this._transition);
        gl.uniform1i(u['u_currMode'],        this._currModeIdx);
        gl.uniform1i(u['u_nextMode'],        this._nextModeIdx);
        gl.uniform2f(u['u_res'],             this._sceneFB.width, this._sceneFB.height);
        gl.uniform2f(u['u_camOffset'],       cam.offsetX, cam.offsetY);
        gl.uniform1f(u['u_zoom'],            cam.zoom);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    }

    // Particles (Sand mode only)
    if (currMode?.usesParticles) {
      const prog = this.sm.use('particles');
      if (prog) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this._particleBuf);
        gl.bufferData(gl.ARRAY_BUFFER, this._particles.positions, gl.DYNAMIC_DRAW);
        const posLoc = gl.getAttribLocation(prog.prog, 'pos');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        const u = prog.uniforms;
        const s = audioState;
        gl.uniform1f(u['u_bass'],  s.bass);
        gl.uniform1f(u['u_mid'],   s.mid);
        gl.uniform1f(u['u_high'],  s.air);
        gl.uniform1f(u['u_beat'],  s.beat);
        gl.uniform1f(u['u_time'],  this._elapsedTime);
        gl.uniform2f(u['u_res'],   this._sceneFB.width, this._sceneFB.height);

        gl.drawArrays(gl.POINTS, 0, this._particles.count);
      }
    }

    gl.disable(gl.BLEND);
    this._sceneFB.unbind();

    // Copy sceneFB → prevFB for next frame's feedback
    this._copyFB(this._sceneFB, this._prevFB);

    // Post-process to screen
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    const bloomStrength = 0.4 + audioState.mood.energy * 0.4;
    this._postProc.apply(this._sceneFB, bloomStrength);
  }

  _copyFB(src, dst) {
    const gl = this.gl;
    dst.bind();
    gl.viewport(0, 0, dst.width, dst.height);

    const prog = this.sm.use('feedback');
    if (!prog) { dst.unbind(); return; }

    gl.bindBuffer(gl.ARRAY_BUFFER, this._quadBuf);
    const posLoc = gl.getAttribLocation(prog.prog, 'pos');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    src.bindTexture(0);
    gl.uniform1i(prog.uniforms['u_prevFrame'], 0);
    gl.uniform1f(prog.uniforms['u_alpha'], 1.0);
    gl.uniform2f(prog.uniforms['u_res'], dst.width, dst.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    dst.unbind();
  }

  setAudioState(state) {
    this._audioState = state;
  }

  setModeByIndex(idx) {
    this._setMode(idx % this._modeNames.length);
  }

  applyVisualPreset(preset) {
    if (!preset) return;

    if (Array.isArray(preset.modeOrder)) {
      const nextNames = preset.modeOrder.filter((name) => VISUAL_MODES[name]);
      if (nextNames.length) {
        const currentName = this.currentModeName;
        this._modeNames = [
          ...nextNames,
          ...Object.keys(VISUAL_MODES).filter((name) => !nextNames.includes(name)),
        ];
        const idx = Math.max(0, this._modeNames.indexOf(currentName));
        this._currModeIdx = idx;
        this._nextModeIdx = (idx + 1) % this._modeNames.length;
      }
    }

    if (typeof preset.feedbackAlpha === 'number') {
      this.feedback.baseAlpha = preset.feedbackAlpha;
    }
  }

  get currentModeName() { return this._modeNames[this._currModeIdx]; }
  get modeNames() { return this._modeNames; }

  set onModeChange(fn) { this._onModeChange = fn; }

  getDebugInfo() {
    return {
      mode: this._modeNames[this._currModeIdx],
      transition: this._transition,
      time: this._elapsedTime,
    };
  }

  destroy() {
    if (this._animFrame) cancelAnimationFrame(this._animFrame);
    if (this._transitionInterval) clearInterval(this._transitionInterval);
  }
}
