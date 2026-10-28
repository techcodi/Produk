import { describe, expect, it } from "vitest";
import { IMAGE_MEAN, IMAGE_STD } from "./models";
import { maskToAlpha, rgbaToTensor } from "./tensor";

describe("rgbaToTensor", () => {
  it("lays out normalised RGB planes (NCHW) and ignores alpha", () => {
    // 2×1 image: a red pixel then a white one.
    const tensor = rgbaToTensor(new Uint8ClampedArray([255, 0, 0, 10, 255, 255, 255, 255]), 1);
    // size=1 only reads the first pixel.
    expect(tensor).toHaveLength(3);
    expect(tensor[0]).toBeCloseTo((1 - IMAGE_MEAN[0]) / IMAGE_STD[0]);
    expect(tensor[1]).toBeCloseTo((0 - IMAGE_MEAN[1]) / IMAGE_STD[1]);
    expect(tensor[2]).toBeCloseTo((0 - IMAGE_MEAN[2]) / IMAGE_STD[2]);
  });

  it("puts each channel in its own plane", () => {
    const rgba = new Uint8ClampedArray(2 * 2 * 4).fill(0);
    rgba[3 * 4 + 1] = 255; // last pixel: green
    const tensor = rgbaToTensor(rgba, 2);
    expect(tensor[4 + 3]).toBeCloseTo((1 - IMAGE_MEAN[1]) / IMAGE_STD[1]);
    expect(tensor[3]).toBeCloseTo(-IMAGE_MEAN[0] / IMAGE_STD[0]);
  });
});

describe("maskToAlpha", () => {
  it("applies a sigmoid to logits", () => {
    expect([...maskToAlpha([-20, 0, 20], "logits")]).toEqual([0, 128, 255]);
  });

  it("stretches probability maps to the full range", () => {
    const [low, mid, high] = maskToAlpha([0.2, 0.5, 0.8], "probability");
    expect([low, high]).toEqual([0, 255]);
    expect(mid).toBeGreaterThanOrEqual(127);
    expect(mid).toBeLessThanOrEqual(128);
  });

  it("leaves a flat probability map as is", () => {
    expect([...maskToAlpha([1, 1], "probability")]).toEqual([255, 255]);
  });
});
