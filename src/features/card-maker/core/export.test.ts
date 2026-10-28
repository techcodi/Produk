import { describe, expect, it } from "vitest";
import { printPixels } from "@/lib/card-export";
import { FORMATS } from "../constants";
import { exportDpi } from "./export";

describe("exportDpi", () => {
  it("uses 300 dpi for large cards", () => {
    expect(exportDpi({ widthMm: 127, heightMm: 178 })).toBe(300);
  });

  it("raises the resolution for small cards, up to 600 dpi", () => {
    expect(exportDpi({ widthMm: 85.6, heightMm: 54 })).toBe(594);
    expect(exportDpi({ widthMm: 20, heightMm: 20 })).toBe(600);
  });

  it("gives every format a print-quality image at least 2000 px on its long side", () => {
    for (const format of Object.values(FORMATS).flat()) {
      const { width, height } = printPixels(format, exportDpi(format));
      expect(Math.max(width, height)).toBeGreaterThanOrEqual(1990);
    }
  });
});
