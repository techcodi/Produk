import { describe, expect, it } from "vitest";
import { PAGE_SIZES } from "../constants";
import { computePageLayout, MAX_PAGE_PT, PX_TO_PT } from "./layout";

describe("computePageLayout", () => {
  it("auto-orients landscape images onto a landscape page", () => {
    const { page } = computePageLayout({ width: 4000, height: 3000 }, { pageSize: "a4", orientation: "auto", margin: 0 });
    expect(page.width).toBeCloseTo(PAGE_SIZES.a4.height);
    expect(page.height).toBeCloseTo(PAGE_SIZES.a4.width);
  });

  it("respects a forced orientation", () => {
    const { page } = computePageLayout({ width: 4000, height: 3000 }, { pageSize: "a4", orientation: "portrait", margin: 0 });
    expect(page.width).toBeCloseTo(PAGE_SIZES.a4.width);
  });

  it("fits the image inside the margins, preserving aspect ratio and centring it", () => {
    const margin = 20;
    const { page, frame } = computePageLayout({ width: 1000, height: 1000 }, { pageSize: "letter", orientation: "portrait", margin });
    expect(frame.width).toBeCloseTo(page.width - margin * 2);
    expect(frame.height).toBeCloseTo(frame.width);
    expect(frame.y).toBeCloseTo((page.height - frame.height) / 2);
  });

  it("sizes the page to the image in fit mode", () => {
    const { page, frame } = computePageLayout({ width: 800, height: 600 }, { pageSize: "fit", orientation: "auto", margin: 10 });
    expect(frame.width).toBeCloseTo(800 * PX_TO_PT);
    expect(page.width).toBeCloseTo(800 * PX_TO_PT + 20);
  });

  it("clamps fit-mode pages to the PDF size limit", () => {
    const { page } = computePageLayout({ width: 40000, height: 1000 }, { pageSize: "fit", orientation: "auto", margin: 0 });
    expect(page.width).toBeLessThanOrEqual(MAX_PAGE_PT);
  });

  it("rejects zero-sized images", () => {
    expect(() => computePageLayout({ width: 0, height: 10 }, { pageSize: "a4", orientation: "auto", margin: 0 })).toThrow();
  });
});
