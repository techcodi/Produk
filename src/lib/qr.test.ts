import { describe, expect, it } from "vitest";
import { encodeQr, matrixToSvg, QrTooLongError } from "./qr";

describe("encodeQr", () => {
  it("picks a bigger symbol for more data and stricter error correction", () => {
    const small = encodeQr("hi", "L");
    expect(small.size).toBe(21);
    expect(encodeQr("hi", "H").size).toBeGreaterThanOrEqual(21);
    expect(encodeQr("x".repeat(500), "M").size).toBeGreaterThan(small.size);
  });

  it("reports text that cannot fit", () => {
    expect(() => encodeQr("x".repeat(5000), "H")).toThrow(QrTooLongError);
  });
});

describe("matrixToSvg", () => {
  it("draws runs of dark modules as rectangles inside the quiet zone", () => {
    const svg = matrixToSvg({ size: 3, data: [1, 1, 0, 0, 0, 0, 0, 1, 1] }, { foreground: "#000", background: "#fff", margin: 2 });
    expect(svg).toContain('viewBox="0 0 7 7"');
    expect(svg).toContain('d="M2 2h2v1h-2zM3 4h2v1h-2z"');
    expect(svg).toContain('fill="#fff"');
  });
});
