import { IMAGE_MEAN, IMAGE_STD } from "./models";

/**
 * RGBA pixels (as from getImageData) of a size×size image → the model's input:
 * float32, NCHW, scaled to 0–1 and ImageNet-normalised.
 */
export function rgbaToTensor(rgba: Uint8ClampedArray, size: number): Float32Array {
  const plane = size * size;
  const tensor = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i++) {
    for (let c = 0; c < 3; c++) {
      tensor[c * plane + i] = (rgba[i * 4 + c] / 255 - IMAGE_MEAN[c]) / IMAGE_STD[c];
    }
  }
  return tensor;
}

/**
 * The model's mask → alpha values 0–255. Logits go through a sigmoid;
 * probability maps are stretched to the full range (as rembg does), which
 * firms up the faint edges U²-Net tends to produce.
 */
export function maskToAlpha(mask: ArrayLike<number>, output: "probability" | "logits"): Uint8ClampedArray {
  const alpha = new Uint8ClampedArray(mask.length);

  if (output === "logits") {
    for (let i = 0; i < mask.length; i++) alpha[i] = 255 / (1 + Math.exp(-mask[i]));
    return alpha;
  }

  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] < min) min = mask[i];
    if (mask[i] > max) max = mask[i];
  }
  const range = max - min;
  for (let i = 0; i < mask.length; i++) {
    alpha[i] = range > 1e-6 ? ((mask[i] - min) / range) * 255 : mask[i] * 255;
  }
  return alpha;
}
