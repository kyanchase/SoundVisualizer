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
  constructor(canvas, canvas2d = null) {
    this.canvas = canvas;
    this.canvas2d = canvas2d;
    this.ctx2d = canvas2d?.getContext('2d') || null;
    this.gl = canvas.getContext('webgl', { antialias: false, alpha: false });
    if (!this.gl) throw new Error('WebGL not supported');

    this.sm = new ShaderManager(this.gl);
    this.camera = new CameraController();
    this.feedback = new FluidFeedback(0.92);

    this._elapsedTime = 0;
    this._lastTime = 0;
    this._currModeIdx = 0;
    this._nextModeIdx = 0;
    this._transition = 0.0;
    this._modeNames = Object.keys(VISUAL_MODES);
    this._transitionInterval = null;

    this._standingWave = new StandingWaveSim(128);
    this._ripple = new RippleSimulation(128);
    this._chladni = new ChladniPatterns(this._standingWave);
    this._particles = new ParticleSystem();
    this._bars2d = new Array(96).fill(0);
    this._particles2d = [];

    this._quadBuf = null;
    this._particleBuf = null;
    this._sceneFB = null;
    this._prevFB = null;
    this._postProc = null;
    this._cymaticsShaderSrc = null;

    this._onModeChange = null;
    this._animFrame = null;
    this._init2dParticles();
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

    if (this.canvas2d) {
      this.canvas2d.width = this.canvas2d.clientWidth * window.devicePixelRatio;
      this.canvas2d.height = this.canvas2d.clientHeight * window.devicePixelRatio;
    }
  }

  onResize() {
    this.canvas.width  = this.canvas.clientWidth  * window.devicePixelRatio;
    this.canvas.height = this.canvas.clientHeight * window.devicePixelRatio;
    this._resize();
  }

  _triggerTransition() {
    this._setMode((this._currModeIdx + 1) % this._modeNames.length);
  }

  _setMode(idx) {
    this._currModeIdx = idx;
    this._nextModeIdx = idx;
    this._transition = 0.0;
    const mode = VISUAL_MODES[this._modeNames[idx]];
    if (typeof mode?.feedbackBase === 'number') this.feedback.baseAlpha = mode.feedbackBase;
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
    const nextModeName = this._modeNames[this._nextModeIdx];
    const currMode = VISUAL_MODES[currModeName];
    const nextMode = VISUAL_MODES[nextModeName];

    if (currMode?.type === '2d') {
      this._render2d(currModeName, audioState);
      this._clearWebGL();
      return;
    }

    this._clear2d();

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
        gl.uniform1i(u['u_currMode'],        currMode?.shaderModeIdx ?? 0);
        gl.uniform1i(u['u_nextMode'],        nextMode?.shaderModeIdx ?? 0);
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

  _clearWebGL() {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  _clear2d() {
    if (!this.ctx2d || !this.canvas2d) return;
    this.ctx2d.clearRect(0, 0, this.canvas2d.width, this.canvas2d.height);
  }

  _init2dParticles() {
    this._particles2d = [];
    for (let i = 0; i < 140; i++) {
      const angle = Math.random() * Math.PI * 2;
      const orbit = 0.08 + Math.pow(Math.random(), 0.75) * 0.48;
      this._particles2d.push({
        x: 0.5 + Math.cos(angle) * orbit,
        y: 0.5 + Math.sin(angle) * orbit,
        vx: 0,
        vy: 0,
        angle,
        orbit,
        phase: Math.random() * Math.PI * 2,
        size: Math.random() * 2 + 1,
        seed: Math.random(),
      });
    }
  }

  _render2d(sceneName, audioState) {
    if (!this.ctx2d || !this.canvas2d) return;

    const ctx = this.ctx2d;
    const W = this.canvas2d.width;
    const H = this.canvas2d.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const energy = Math.min(1, audioState.bass * 0.5 + audioState.mid * 0.3 + audioState.air * 0.2 + audioState.beat * 0.2);
    const speed = 0.35 + energy * 1.8;
    const colA = this._paletteA(audioState);
    const colB = this._paletteB(audioState);

    ctx.fillStyle = `rgba(0,0,0,${0.1 + audioState.mood.tension * 0.08})`;
    ctx.fillRect(0, 0, W, H);
    this._update2dBars(audioState.raw, 1.0 + audioState.mood.energy * 0.8);

    if (sceneName === 'Linear Spectrum') this._renderLinear2d(ctx, W, H, audioState, colA, colB);
    else if (sceneName === 'Particle Field') this._renderParticleField2d(ctx, W, H, audioState, colA, colB, speed, dpr);
    else if (sceneName === 'Waveform Rings') this._renderRings2d(ctx, W, H, audioState, colA, colB, dpr);
    else if (sceneName === 'Kaleidoscope') this._renderKaleido2d(ctx, W, H, audioState, colA, colB, dpr);
    else this._renderRadial2d(ctx, W, H, audioState, colA, colB, dpr);
  }

  _update2dBars(raw, react) {
    const n = this._bars2d.length;
    for (let i = 0; i < n; i++) {
      const start = Math.floor(Math.pow(i / n, 1.8) * 300);
      const end = Math.floor(Math.pow((i + 1) / n, 1.8) * 300);
      let v = 0;
      for (let j = start; j <= end && j < raw.length; j++) v = Math.max(v, raw[j]);
      v /= 255;
      v = v < 0.08 ? 0 : Math.pow((v - 0.08) / 0.92, 1.7);
      v *= react;
      this._bars2d[i] = v > this._bars2d[i] ? v : this._bars2d[i] * 0.84 + v * 0.16;
    }
  }

  _paletteA(s) {
    return [55 + s.mid * 130, 120 + s.air * 110, 255 - s.bass * 80];
  }

  _paletteB(s) {
    return [255 - s.air * 70, 70 + s.bass * 150, 150 + s.mid * 90];
  }

  _mixColor(a, b, t, alpha = 1) {
    const r = Math.round(a[0] + (b[0] - a[0]) * t);
    const g = Math.round(a[1] + (b[1] - a[1]) * t);
    const bl = Math.round(a[2] + (b[2] - a[2]) * t);
    return `rgba(${r},${g},${bl},${alpha})`;
  }

  _renderRadial2d(ctx, W, H, s, colA, colB, dpr) {
    const cx = W / 2;
    const cy = H / 2;
    const baseR = Math.min(W, H) * 0.09 * (1 + s.bass * 0.8 + s.beat * 0.25);
    const maxReach = Math.min(W, H) * 0.34;

    ctx.save();
    ctx.translate(cx, cy);
    for (let i = 0; i < this._bars2d.length; i++) {
      const v = this._bars2d[i];
      const angle = (i / this._bars2d.length) * Math.PI * 2 - Math.PI / 2;
      ctx.strokeStyle = this._mixColor(colA, colB, i / this._bars2d.length, Math.min(1, 0.22 + v * 1.2));
      ctx.lineWidth = (2 + v * 8 + s.beat * 2) * dpr;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * baseR, Math.sin(angle) * baseR);
      ctx.lineTo(Math.cos(angle) * (baseR + v * maxReach), Math.sin(angle) * (baseR + v * maxReach));
      ctx.stroke();
    }
    ctx.restore();

    this._drawCircularWave(ctx, W, H, s, baseR * 0.72, colA, 0.75, dpr);
  }

  _renderLinear2d(ctx, W, H, s, colA, colB) {
    const barW = W / this._bars2d.length;
    const cy = H / 2;
    const maxH = H * (0.32 + s.bass * 0.12);
    for (let i = 0; i < this._bars2d.length; i++) {
      const v = this._bars2d[i];
      const h = v * maxH * (1 + s.beat * 0.25);
      const grad = ctx.createLinearGradient(0, cy - h, 0, cy + h);
      grad.addColorStop(0, this._mixColor(colA, colB, i / this._bars2d.length, 0.08));
      grad.addColorStop(0.5, this._mixColor(colA, colB, i / this._bars2d.length, Math.min(1, 0.25 + v)));
      grad.addColorStop(1, this._mixColor(colA, colB, i / this._bars2d.length, 0.08));
      ctx.fillStyle = grad;
      ctx.fillRect(i * barW + barW * 0.12, cy - h, barW * 0.76, h * 2);
    }
    ctx.fillStyle = this._mixColor(colA, colB, 0.6, 0.12 + s.beat * 0.35);
    ctx.fillRect(0, cy - (2 + s.beat * 20), W, 4 + s.beat * 40);
  }

  _renderParticleField2d(ctx, W, H, s, colA, colB, speed, dpr) {
    const centerPull = 0.045 + s.mid * 0.02;
    const bassBloom = s.bass * 0.13 + s.beat * 0.08;
    const swirl = this._elapsedTime * (0.12 + speed * 0.08);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const p of this._particles2d) {
      const wobble = Math.sin(this._elapsedTime * (0.7 + p.seed * 1.5) + p.phase) * (0.012 + s.air * 0.025);
      const radius = p.orbit * (0.78 + bassBloom + wobble);
      const angle = p.angle + swirl * (0.35 + p.seed) + s.beat * 0.08 * (p.seed > 0.5 ? 1 : -1);
      const targetX = 0.5 + Math.cos(angle) * radius;
      const targetY = 0.5 + Math.sin(angle) * radius * (W / Math.max(H, 1));

      p.vx += (targetX - p.x) * centerPull;
      p.vy += (targetY - p.y) * centerPull;
      p.vx += Math.cos(angle + Math.PI / 2) * s.air * 0.0009;
      p.vy += Math.sin(angle + Math.PI / 2) * s.air * 0.0009;
      p.vx *= 0.82;
      p.vy *= 0.82;
      p.x += p.vx;
      p.y += p.vy;
    }

    const connR = 0.075 + s.air * 0.055 + s.beat * 0.018;
    const maxLinksPerParticle = 4;
    for (let i = 0; i < this._particles2d.length; i++) {
      const a = this._particles2d[i];
      let links = 0;
      for (let j = i + 1; j < this._particles2d.length; j++) {
        const b = this._particles2d[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dd = Math.sqrt(dx * dx + dy * dy);
        if (dd < connR) {
          const alpha = Math.min(0.55, (1 - dd / connR) * (0.08 + s.air * 0.42 + s.beat * 0.18));
          ctx.strokeStyle = this._mixColor(colA, colB, (a.seed + b.seed) * 0.5, alpha);
          ctx.lineWidth = (0.45 + s.air * 1.3 + s.beat * 0.6) * dpr;
          ctx.beginPath();
          ctx.moveTo(a.x * W, a.y * H);
          ctx.lineTo(b.x * W, b.y * H);
          ctx.stroke();
          links++;
          if (links >= maxLinksPerParticle) break;
        }
      }
    }

    for (const p of this._particles2d) {
      const size = p.size * dpr * (0.9 + s.bass * 1.2 + s.beat * 0.75);
      const glow = size * (3.5 + s.beat * 2.5);
      const x = p.x * W;
      const y = p.y * H;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, glow);
      grad.addColorStop(0, this._mixColor(colA, colB, p.seed, 0.75));
      grad.addColorStop(0.45, this._mixColor(colA, colB, p.seed, 0.16 + s.bass * 0.1));
      grad.addColorStop(1, this._mixColor(colA, colB, p.seed, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, glow, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = this._mixColor(colA, colB, p.seed, 0.9);
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  _renderRings2d(ctx, W, H, s, colA, colB, dpr) {
    const maxR = Math.min(W, H) * 0.42;
    for (let r = 0; r < 5; r++) {
      this._drawCircularWave(ctx, W, H, s, maxR * (0.18 + r * 0.16) * (1 + s.bass * 0.22), r % 2 ? colB : colA, 0.55 + r * 0.08, dpr, r);
    }
  }

  _drawCircularWave(ctx, W, H, s, radius, color, alpha, dpr, offset = 0) {
    const data = s.timeRaw || new Uint8Array(2048).fill(128);
    const cx = W / 2;
    const cy = H / 2;
    ctx.strokeStyle = `rgba(${Math.round(color[0])},${Math.round(color[1])},${Math.round(color[2])},${Math.min(1, alpha + s.beat * 0.3)})`;
    ctx.lineWidth = (1.5 + s.beat * 6 + s.bass * 2) * dpr;
    ctx.beginPath();
    const step = Math.max(1, Math.floor(data.length / 220));
    for (let i = 0; i < data.length; i += step) {
      const idx = (i + offset * 173) % data.length;
      const v = (data[idx] - 128) / 128;
      const angle = (i / data.length) * Math.PI * 2 + this._elapsedTime * 0.14 * (offset + 1);
      const rr = radius + v * 55 * dpr * (1 + s.mid * 1.2 + s.bass * 0.5);
      const x = cx + Math.cos(angle) * rr;
      const y = cy + Math.sin(angle) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  _renderKaleido2d(ctx, W, H, s, colA, colB, dpr) {
    const cx = W / 2;
    const cy = H / 2;
    const segments = 8;
    const nBars = 32;
    const maxReach = Math.min(W, H) * 0.48;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this._elapsedTime * (0.22 + s.mood.energy * 0.5) + s.beat * 0.08);
    for (let seg = 0; seg < segments; seg++) {
      ctx.save();
      ctx.rotate((Math.PI * 2 / segments) * seg);
      if (seg % 2) ctx.scale(1, -1);
      for (let i = 0; i < nBars; i++) {
        const v = this._bars2d[Math.floor(i * this._bars2d.length / nBars)];
        const angle = (i / nBars) * (Math.PI * 2 / segments);
        ctx.strokeStyle = this._mixColor(colA, colB, i / nBars, 0.25 + v * 0.9);
        ctx.lineWidth = (1.5 + v * 5 + s.beat) * dpr;
        ctx.beginPath();
        const r1 = Math.min(W, H) * 0.025;
        ctx.moveTo(Math.cos(angle) * r1, Math.sin(angle) * r1);
        ctx.lineTo(Math.cos(angle) * (r1 + v * maxReach), Math.sin(angle) * (r1 + v * maxReach));
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
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
        this._nextModeIdx = idx;
      }
    }

    if (typeof preset.feedbackAlpha === 'number') {
      this.feedback.baseAlpha = preset.feedbackAlpha;
    } else {
      const mode = VISUAL_MODES[this.currentModeName];
      if (typeof mode?.feedbackBase === 'number') this.feedback.baseAlpha = mode.feedbackBase;
    }
  }

  get currentModeName() { return this._modeNames[this._currModeIdx]; }
  get modeNames() { return this._modeNames; }

  set onModeChange(fn) { this._onModeChange = fn; }

  getDebugInfo() {
    return {
      mode: this._modeNames[this._currModeIdx],
      shaderMode: VISUAL_MODES[this.currentModeName]?.shaderModeIdx ?? 0,
      transition: this._transition,
      time: this._elapsedTime,
    };
  }

  destroy() {
    if (this._animFrame) cancelAnimationFrame(this._animFrame);
    if (this._transitionInterval) clearInterval(this._transitionInterval);
  }
}
