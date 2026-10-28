import { describe, expect, it } from "vitest";
import { imageFileName, resolvePages } from "./plan";

describe("resolvePages", () => {
  it("returns every page for the 'all' scope", () => {
    expect(resolvePages({ scope: "all", ranges: "junk" }, 3)).toEqual({ ok: true, pages: [1, 2, 3] });
  });

  it("parses custom ranges", () => {
    expect(resolvePages({ scope: "custom", ranges: "3, 1" }, 3)).toEqual({ ok: true, pages: [3, 1] });
    expect(resolvePages({ scope: "custom", ranges: "" }, 3).ok).toBe(false);
    expect(resolvePages({ scope: "custom", ranges: "4" }, 3).ok).toBe(false);
  });
});

describe("imageFileName", () => {
  it("zero-pads page numbers to the document's page count", () => {
    expect(imageFileName("report", 7, 120, "png")).toBe("report-page-007.png");
    expect(imageFileName("report", 7, 9, "jpg")).toBe("report-page-7.jpg");
  });
});
