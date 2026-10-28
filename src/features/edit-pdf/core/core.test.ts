import { describe, expect, it } from "vitest";
import { pickBackground } from "./background";
import { applyToPoint, invert, multiply, viewportToPdf } from "./geometry";
import { classifyFont, extractEditableLines, type RawTextItem } from "./text-lines";
import { fitsStandardFonts } from "./winansi";

// PDF.js viewport transform for a 600×800 page at scale 1: flip y.
const UNROTATED = [1, 0, 0, -1, 0, 800];
// …and for the same page with /Rotate 90 (shown 800 wide, 600 tall).
const ROTATED_90 = [0, 1, 1, 0, 0, 0];

describe("geometry", () => {
  it("inverts and multiplies matrices", () => {
    const m = [2, 0.5, -1, 3, 10, 20];
    const identity = multiply(m, invert(m)).map((v) => Math.round(v * 1e9) / 1e9);
    expect(identity).toEqual([1, 0, 0, 1, 0, 0]);
  });

  it("maps viewport points back to PDF user space", () => {
    const { point, angle } = viewportToPdf(UNROTATED);
    expect(point(100, 50)).toEqual([100, 750]);
    expect(angle).toBe(0);
  });

  it("reports the rotation needed to keep content upright on rotated pages", () => {
    const { point, angle } = viewportToPdf(ROTATED_90);
    const [x, y] = point(100, 50);
    expect(applyToPoint(ROTATED_90, x, y)).toEqual([100, 50]);
    expect(Math.abs(angle)).toBe(90);
  });
});

const item = (str: string, x: number, baselineFromTop: number, size = 12, width = str.length * size * 0.5): RawTextItem => ({
  str,
  // Text space: PDF y-up, so baseline y = 800 - baselineFromTop.
  transform: [size, 0, 0, size, x, 800 - baselineFromTop],
  width,
  fontName: "f1",
});

describe("extractEditableLines", () => {
  it("merges pieces of one line and keeps separate lines apart", () => {
    const lines = extractEditableLines(
      [item("Hello", 50, 100), item("world", 50 + 30 + 3, 100), item("Second line", 50, 130)],
      { f1: { ascent: 0.75, descent: -0.25, fontFamily: "sans-serif" } },
      UNROTATED,
      1,
    );
    expect(lines.map((l) => l.text)).toEqual(["Hello world", "Second line"]);
    expect(lines[0]).toMatchObject({ x: 50, baseline: 100, fontSize: 12, ascent: 0.75, descent: 0.25, key: "1:0" });
    // From the first piece's start (50) to the end of "world" (83 + 30).
    expect(lines[0].width).toBeCloseTo(63);
  });

  it("skips blank and rotated text", () => {
    const rotated: RawTextItem = { str: "Up", transform: [0, 12, -12, 0, 10, 10], width: 12, fontName: "f1" };
    expect(extractEditableLines([item("   ", 0, 10), rotated], {}, UNROTATED, 1)).toEqual([]);
  });

  it("does not merge across a large gap or a font change", () => {
    const lines = extractEditableLines([item("Name", 50, 100), item("Value", 300, 100)], {}, UNROTATED, 2);
    expect(lines).toHaveLength(2);
  });
});

describe("classifyFont", () => {
  it("reads family and weight from embedded font names", () => {
    expect(classifyFont("ABCDEF+TimesNewRomanPS-BoldMT", undefined)).toEqual({ font: "serif", bold: true });
    expect(classifyFont("Arial-ItalicMT", "sans-serif")).toEqual({ font: "sans", bold: false });
    expect(classifyFont("CourierNewPSMT", undefined)).toEqual({ font: "mono", bold: false });
    expect(classifyFont("MicrosoftSansSerif", undefined).font).toBe("sans");
    expect(classifyFont(undefined, "serif").font).toBe("serif");
  });
});

describe("fitsStandardFonts", () => {
  it("accepts Latin-1 and WinAnsi punctuation, rejects other scripts", () => {
    expect(fitsStandardFonts("Café — “quoted” €5\nline two")).toBe(true);
    expect(fitsStandardFonts("₦5,000")).toBe(false);
    expect(fitsStandardFonts("Привет")).toBe(false);
  });
});

describe("pickBackground", () => {
  it("picks the dominant colour, ignoring stray anti-aliased pixels", () => {
    expect(pickBackground([[255, 255, 255], [254, 255, 253], [20, 20, 20], [255, 255, 255]])).toMatch(/^#f[ef]f[ef]f[ef]$/);
    expect(pickBackground([[230, 240, 255], [231, 240, 255], [0, 0, 0]])).toBe("#e7f0ff");
    expect(pickBackground([])).toBe("#ffffff");
  });
});
