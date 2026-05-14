export class CameraController {
  constructor() {
    this.angle = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.zoom = 0;
    this._targetZoom = 0;
    this._driftSpeed = 0.0003;
  }

  update(audioState) {
    const { beat, mood } = audioState;

    // Slow organic drift
    this.angle += this._driftSpeed + mood.chaos * 0.001;
    this.offsetX = Math.sin(this.angle) * 0.4;
    this.offsetY = Math.cos(this.angle * 0.7) * 0.3;

    // Beat nudge: brief zoom punch
    if (beat > 0.8) {
      this._targetZoom = beat * 0.3;
    }
    this.zoom += (this._targetZoom - this.zoom) * 0.1;
    this._targetZoom *= 0.9;

    return {
      offsetX: this.offsetX,
      offsetY: this.offsetY,
      zoom: this.zoom,
    };
  }
}
