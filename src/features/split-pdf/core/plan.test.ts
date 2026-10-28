import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../constants";
import type { SplitSettings } from "../types";
import { outputIndexByPage, planSplit } from "./plan";

const settings = (patch: Partial<SplitSettings>): SplitSettings => ({ ...DEFAULT_SETTINGS, ...patch });

describe("planSplit", () => {
  it("extracts the chosen pages into a single PDF, in typed order", () => {
    const plan = planSplit(settings({ mode: "select", ranges: "5, 1-2" }), 6);
    expect(plan).toEqual({ ok: true, outputs: [{ pages: [5, 1, 2], label: "pages-1-2_5" }] });
  });

  it("creates one PDF per range", () => {
    const plan = planSplit(settings({ mode: "ranges", ranges: "1-2, 3, 4-" }), 5);
    expect(plan.ok && plan.outputs.map((o) => o.pages)).toEqual([[1, 2], [3], [4, 5]]);
    expect(plan.ok && plan.outputs.map((o) => o.label)).toEqual(["pages-1-2", "page-3", "pages-4-5"]);
  });

  it("cuts into fixed-size chunks with a shorter last part", () => {
    const plan = planSplit(settings({ mode: "every", everyN: "2" }), 5);
    expect(plan.ok && plan.outputs.map((o) => o.pages)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("rejects input that would not split anything", () => {
    expect(planSplit(settings({ mode: "every", everyN: "5" }), 5).ok).toBe(false);
    expect(planSplit(settings({ mode: "every", everyN: "0" }), 5).ok).toBe(false);
    expect(planSplit(settings({ mode: "select", ranges: "" }), 5).ok).toBe(false);
    expect(planSplit(settings({ mode: "ranges", ranges: "1-9" }), 5).ok).toBe(false);
  });

  it("shortens labels for scattered selections", () => {
    const pages = Array.from({ length: 30 }, (_, i) => i * 2 + 1).join(",");
    const plan = planSplit(settings({ mode: "select", ranges: pages }), 60);
    expect(plan.ok && plan.outputs[0].label).toBe("30-pages");
  });
});

describe("outputIndexByPage", () => {
  it("maps each page to the first output that contains it", () => {
    const map = outputIndexByPage([{ pages: [1, 2], label: "" }, { pages: [2, 3], label: "" }]);
    expect([...map]).toEqual([
      [1, 1],
      [2, 1],
      [3, 2],
    ]);
  });
});
