// Manages feedback alpha: higher on calm music, lower on drops
export class FluidFeedback {
  constructor(baseAlpha = 0.92) {
    this.baseAlpha = baseAlpha;
    this.alpha = baseAlpha;
  }

  update(audioState) {
    const { mood, beat } = audioState;
    // Calm music → high alpha (long trails), drops → low alpha (snappy)
    const target = this.baseAlpha - beat * 0.15 - mood.chaos * 0.1;
    this.alpha += (target - this.alpha) * 0.1;
    this.alpha = Math.max(0.7, Math.min(0.97, this.alpha));
    return this.alpha;
  }
}
