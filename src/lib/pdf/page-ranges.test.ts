import { describe, expect, it } from "vitest";
import { formatPageRanges, pagesInRanges, parsePageRanges, togglePageInRanges } from "./page-ranges";

describe("parsePageRanges", () => {
  it("parses single pages, closed and open ranges", () => {
    expect(parsePageRanges("1-3, 5; 8-", 10)).toEqual({
      ok: true,
      ranges: [
        { start: 1, end: 3 },
        { start: 5, end: 5 },
        { start: 8, end: 10 },
      ],
    });
    expect(parsePageRanges(" -2 ", 10)).toEqual({ ok: true, ranges: [{ start: 1, end: 2 }] });
    expect(parsePageRanges("2–4", 10)).toEqual({ ok: true, ranges: [{ start: 2, end: 4 }] });
  });

  it("explains invalid input", () => {
    const error = (input: string) => {
      const result = parsePageRanges(input, 10);
      return result.ok ? null : result.error;
    };
    expect(error("")).toMatch(/at least one/);
    expect(error("abc")).toMatch(/isn’t a page/);
    expect(error("5-3")).toMatch(/backwards/);
    expect(error("0")).toMatch(/start at 1/);
    expect(error("4-12")).toMatch(/has 10 pages/);
    expect(error("-")).toMatch(/isn’t a page/);
  });
});

describe("pagesInRanges / formatPageRanges", () => {
  it("flattens in order without duplicates", () => {
    expect(pagesInRanges([{ start: 4, end: 5 }, { start: 1, end: 2 }, { start: 5, end: 6 }])).toEqual([4, 5, 1, 2, 6]);
  });

  it("compresses pages into sorted ranges", () => {
    expect(formatPageRanges([5, 1, 2, 3, 9, 8])).toBe("1-3, 5, 8-9");
    expect(formatPageRanges([])).toBe("");
  });
});

describe("togglePageInRanges", () => {
  it("adds and removes pages, merging neighbours", () => {
    expect(togglePageInRanges("1-3", 4, 10)).toBe("1-4");
    expect(togglePageInRanges("1-4", 2, 10)).toBe("1, 3-4");
    expect(togglePageInRanges("garbage", 7, 10)).toBe("7");
  });
});
