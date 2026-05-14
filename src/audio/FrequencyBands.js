// FFT bin ranges for each perceptual frequency band (out of 2048 fftSize → 1024 bins)
export const BANDS = {
  bass:    [0,   12],
  lowMid:  [12,  40],
  mid:     [40,  100],
  highMid: [100, 180],
  treble:  [180, 250],
  air:     [250, 512],
};

export function sliceBand(fftData, [lo, hi]) {
  let sum = 0;
  const count = hi - lo;
  for (let i = lo; i < hi; i++) sum += fftData[i];
  return sum / (count * 255); // normalize 0..1
}
