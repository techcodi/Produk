import { describe, expect, it } from "vitest";
import { PRESETS } from "../constants";
import { customSpec, estimateHead, headHeightMm, initialFraming, layoutSheet, photoPixels } from "./framing";

const SIZE = 100;

/** Draws a mask with an ellipse "head" and a wide block of "shoulders" below it. */
function portraitMask({ headTop = 20, headHeight = 30, headWidth = 22, shoulders = true, gradual = false } = {}) {
  const alpha = new Uint8ClampedArray(SIZE * SIZE);
  const cx = 50;
  const cy = headTop + headHeight / 2;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const inHead = ((x - cx) / (headWidth / 2)) ** 2 + ((y - cy) / (headHeight / 2)) ** 2 <= 1;
      const inNeck = y >= cy && y < headTop + headHeight + 4 && Math.abs(x - cx) <= 6;
      const bodyTop = headTop + headHeight + 4;
      // Gradual shoulders widen by a pixel or two per row, like a real torso.
      const halfWidth = gradual ? Math.min(40, 6 + (y - bodyTop) * 1.5) : 40;
      const inBody = shoulders && y >= bodyTop && Math.abs(x - cx) <= halfWidth;
      if (inHead || inNeck || inBody) alpha[y * SIZE + x] = 255;
    }
  }
  return alpha;
}

describe("estimateHead", () => {
  it("finds the crown and the chin above the shoulders", () => {
    const head = estimateHead(portraitMask(), SIZE, 1)!;
    expect(head.top).toBeCloseTo(0.2, 1);
    // Chin lands at the neck, between the bottom of the head (0.5) and the shoulders (0.54).
    expect(head.chin).toBeGreaterThan(0.45);
    expect(head.chin).toBeLessThanOrEqual(0.55);
    expect(head.centerX).toBeCloseTo(0.5, 1);
  });

  it("ignores stray specks from a textured background", () => {
    const alpha = portraitMask();
    // Scattered 2×2 specks across the whole frame, including beside the head.
    for (let i = 0; i < 60; i++) {
      const x = (i * 37) % 98;
      const y = (i * 53) % 98;
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) alpha[(y + dy) * SIZE + x + dx] = 255;
    }
    const head = estimateHead(alpha, SIZE, 1)!;
    expect(head.top).toBeCloseTo(0.2, 1);
    expect(head.chin - head.top).toBeGreaterThan(0.25);
    expect(head.chin - head.top).toBeLessThan(0.36);
  });

  it("puts the chin where the face meets the neck, not at the bottom of the neck", () => {
    const head = estimateHead(portraitMask({ headTop: 10, headHeight: 40, headWidth: 30 }), SIZE, 1)!;
    // Face ends at 0.5, neck runs to 0.54.
    expect(head.chin).toBeGreaterThan(0.44);
    expect(head.chin).toBeLessThanOrEqual(0.51);
  });

  it("doesn't mistake gradually widening shoulders for the head", () => {
    const head = estimateHead(portraitMask({ gradual: true }), SIZE, 1)!;
    expect(head.top).toBeCloseTo(0.2, 1);
    expect(head.chin).toBeGreaterThan(0.44);
    expect(head.chin).toBeLessThanOrEqual(0.55);
  });

  it("infers the chin from the head width when there are no shoulders", () => {
    const head = estimateHead(portraitMask({ shoulders: false }), SIZE, 1)!;
    expect(head.chin - head.top).toBeGreaterThan(0.22 * 1.1);
    expect(head.chin - head.top).toBeLessThan(0.22 * 1.65);
  });

  it("returns null for an empty mask", () => {
    expect(estimateHead(new Uint8ClampedArray(SIZE * SIZE), SIZE, 1)).toBeNull();
  });
});

describe("initialFraming", () => {
  const spec = PRESETS[0];
  const image = { width: 3000, height: 4000 };
  const head = { top: 0.2, chin: 0.5, centerX: 0.45 };

  it("sizes the head to the middle of the allowed range, crown at the margin", () => {
    const framing = initialFraming(head, image, spec);
    expect(headHeightMm(head, image.height, framing)).toBeCloseTo((spec.headMm[0] + spec.headMm[1]) / 2);
    expect(framing.centerX).toBeCloseTo(0.45 * 3000);
    const frameTopPx = framing.centerY - spec.heightMm / 2 / framing.mmPerPx;
    expect((head.top * image.height - frameTopPx) * framing.mmPerPx).toBeCloseTo(spec.crownMarginMm);
  });

  it("covers the frame when no head was found", () => {
    const framing = initialFraming(null, image, spec);
    expect(image.width * framing.mmPerPx).toBeGreaterThanOrEqual(spec.widthMm - 1e-9);
    expect(image.height * framing.mmPerPx).toBeGreaterThanOrEqual(spec.heightMm - 1e-9);
  });
});

describe("photoPixels / customSpec", () => {
  it("converts millimetres to pixels at the print resolution", () => {
    expect(photoPixels(PRESETS[0], 300)).toEqual({ width: 413, height: 531 });
    expect(photoPixels(PRESETS[1], 300)).toEqual({ width: 600, height: 600 });
  });

  it("derives head guidance for custom sizes", () => {
    const spec = customSpec(40, 50);
    expect(spec.headMm[0]).toBeLessThan(spec.headMm[1]);
    expect(spec.crownMarginMm + spec.headMm[1]).toBeLessThan(50);
  });
});

describe("layoutSheet", () => {
  it("fits 35×45 photos on 4×6 paper and centres the grid", () => {
    const layout = layoutSheet({ widthMm: 101.6, heightMm: 152.4 }, { widthMm: 35, heightMm: 45 }, 2, 4);
    expect(layout.positions).toHaveLength(6);
    const xs = layout.positions.map((p) => p.x);
    expect(Math.min(...xs)).toBeCloseTo(layout.widthMm - (Math.max(...xs) + 35));
  });

  it("turns the sheet when that fits more photos", () => {
    const layout = layoutSheet({ widthMm: 101.6, heightMm: 152.4 }, { widthMm: 50.8, heightMm: 50.8 }, 2, 4);
    expect(layout.positions.length).toBeGreaterThanOrEqual(2);
    const a4 = layoutSheet({ widthMm: 210, heightMm: 297 }, { widthMm: 35, heightMm: 45 }, 2, 4);
    expect(a4.positions.length).toBeGreaterThanOrEqual(25);
  });
});
