import { describe, expect, it } from "vitest";
import { clampToCanvasLimits, isHeic, isSupportedImage, MAX_CANVAS_AREA, MAX_CANVAS_DIMENSION } from "./images";

const file = (name: string, type = "") => new File(["x"], name, { type });

describe("isSupportedImage / isHeic", () => {
  it("accepts images by MIME type or by extension when MIME is missing", () => {
    expect(isSupportedImage(file("a.jpg", "image/jpeg"))).toBe(true);
    expect(isSupportedImage(file("IMG_0001.HEIC"))).toBe(true);
    expect(isSupportedImage(file("doc.pdf", "application/pdf"))).toBe(false);
    expect(isSupportedImage(file("logo.svg", "image/svg+xml"))).toBe(false);
  });

  it("detects HEIC with or without a MIME type", () => {
    expect(isHeic(file("photo.heic"))).toBe(true);
    expect(isHeic(file("photo", "image/heif"))).toBe(true);
    expect(isHeic(file("photo.jpg", "image/jpeg"))).toBe(false);
  });
});

describe("clampToCanvasLimits", () => {
  it("leaves sizes within limits alone", () => {
    expect(clampToCanvasLimits({ width: 1200, height: 800 })).toEqual({ width: 1200, height: 800 });
  });

  it("caps the longest side and keeps the aspect ratio", () => {
    expect(clampToCanvasLimits({ width: 8000, height: 2000 })).toEqual({ width: MAX_CANVAS_DIMENSION, height: 1000 });
    expect(clampToCanvasLimits({ width: 1000, height: 500 }, 100)).toEqual({ width: 100, height: 50 });
  });

  it("caps the total area for large squares", () => {
    const { width, height } = clampToCanvasLimits({ width: 4000, height: 4000 });
    expect(width * height).toBeLessThanOrEqual(MAX_CANVAS_AREA);
    expect(width).toBe(height);
  });
});
