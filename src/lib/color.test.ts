import { describe, expect, it } from "vitest";
import { readableOn, tint } from "./color";

describe("tint", () => {
  it("mixes towards white", () => {
    expect(tint("#000000", 0)).toBe("#ffffff");
    expect(tint("#000000", 1)).toBe("#000000");
    expect(tint("#ff0000", 0.5)).toBe("#ff8080");
  });
});

describe("readableOn", () => {
  it("picks white on dark colours and dark text on light ones", () => {
    expect(readableOn("#111827")).toBe("#ffffff");
    expect(readableOn("#4f46e5")).toBe("#ffffff");
    expect(readableOn("#facc15")).toBe("#111827");
    expect(readableOn("#ffffff")).toBe("#111827");
  });
});
