import { describe, expect, it } from "vitest";
import { MAX_CANVAS_DIMENSION } from "@/lib/images";
import { DEFAULT_SETTINGS } from "../constants";
import type { ResizeSettings } from "../types";
import { computeTargetSize, resolveOutputMime, validateResizeSettings } from "./target-size";

const settings = (patch: Partial<ResizeSettings>): ResizeSettings => ({ ...DEFAULT_SETTINGS, ...patch });
const photo = { width: 4000, height: 3000 };

describe("validateResizeSettings", () => {
  it("requires a sensible percentage", () => {
    expect(validateResizeSettings(settings({ mode: "percent", percent: "50" }))).toBeUndefined();
    expect(validateResizeSettings(settings({ mode: "percent", percent: "" }))).toBeDefined();
    expect(validateResizeSettings(settings({ mode: "percent", percent: "0" }))).toBeDefined();
    expect(validateResizeSettings(settings({ mode: "percent", percent: "1000" }))).toBeDefined();
  });

  it("requires at least one whole-pixel dimension", () => {
    expect(validateResizeSettings(settings({ mode: "pixels", width: "", height: "" }))).toBeDefined();
    expect(validateResizeSettings(settings({ mode: "pixels", width: "0", height: "" }))).toBeDefined();
    expect(validateResizeSettings(settings({ mode: "pixels", width: "800", height: "" }))).toBeUndefined();
  });
});

describe("computeTargetSize", () => {
  it("scales by percentage", () => {
    expect(computeTargetSize(photo, settings({ mode: "percent", percent: "25" }))).toEqual({ width: 1000, height: 750, limited: false });
  });

  it("derives the missing side from the aspect ratio", () => {
    expect(computeTargetSize(photo, settings({ mode: "pixels", width: "800", height: "" }))).toMatchObject({ width: 800, height: 600 });
    expect(computeTargetSize(photo, settings({ mode: "pixels", width: "", height: "300" }))).toMatchObject({ width: 400, height: 300 });
  });

  it("fits inside a box when keeping the aspect ratio", () => {
    expect(computeTargetSize(photo, settings({ mode: "pixels", width: "1000", height: "1000" }))).toMatchObject({ width: 1000, height: 750 });
  });

  it("stretches to the exact size otherwise, using the original for a blank side", () => {
    const stretched = settings({ mode: "pixels", keepAspect: false });
    expect(computeTargetSize(photo, { ...stretched, width: "1000", height: "1000" })).toMatchObject({ width: 1000, height: 1000 });
    expect(computeTargetSize(photo, { ...stretched, width: "1000", height: "" })).toMatchObject({ width: 1000, height: 3000 });
  });

  it("flags sizes reduced to fit canvas limits", () => {
    const result = computeTargetSize(photo, settings({ mode: "percent", percent: "300" }));
    expect(result.limited).toBe(true);
    expect(result.width).toBeLessThanOrEqual(MAX_CANVAS_DIMENSION);
  });

  it("never produces a zero-sized image", () => {
    expect(computeTargetSize({ width: 3, height: 1 }, settings({ mode: "percent", percent: "10" }))).toMatchObject({ width: 1, height: 1 });
  });
});

describe("resolveOutputMime", () => {
  it("keeps web formats and converts the rest to JPEG", () => {
    expect(resolveOutputMime("original", "image/png")).toBe("image/png");
    expect(resolveOutputMime("original", "image/heic")).toBe("image/jpeg");
    expect(resolveOutputMime("original", "")).toBe("image/jpeg");
    expect(resolveOutputMime("webp", "image/png")).toBe("image/webp");
  });
});
