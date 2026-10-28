import { pluralize } from "@/lib/format";
import { formatPageRanges, pagesInRanges, parsePageRanges } from "@/lib/pdf/page-ranges";
import type { SplitOutput, SplitPlan, SplitSettings } from "../types";

const labelFor = (pages: number[]) => {
  const ranges = formatPageRanges(pages).replace(/, /g, "_");
  if (ranges.length > 40) return `${pages.length}-pages`;
  return `${pages.length === 1 ? "page" : "pages"}-${ranges}`;
};

const output = (pages: number[]): SplitOutput => ({ pages, label: labelFor(pages) });

/**
 * Pure function: turns the user's split settings into the list of PDFs to
 * create, or a message explaining what is wrong with the input.
 */
export function planSplit(settings: SplitSettings, pageCount: number): SplitPlan {
  if (pageCount < 1) return { ok: false, error: "This PDF has no pages" };

  switch (settings.mode) {
    case "select": {
      if (!settings.ranges.trim()) return { ok: false, error: "Tap pages or type ranges to choose what to keep" };
      const parsed = parsePageRanges(settings.ranges, pageCount);
      if (!parsed.ok) return parsed;
      return { ok: true, outputs: [output(pagesInRanges(parsed.ranges))] };
    }

    case "ranges": {
      if (!settings.ranges.trim()) return { ok: false, error: "Type ranges separated by commas, e.g. 1-3, 4-6" };
      const parsed = parsePageRanges(settings.ranges, pageCount);
      if (!parsed.ok) return parsed;
      return { ok: true, outputs: parsed.ranges.map(({ start, end }) => output(range(start, end))) };
    }

    case "every": {
      const size = Number(settings.everyN);
      if (!Number.isInteger(size) || size < 1) return { ok: false, error: "Enter a whole number of pages, 1 or more" };
      if (size >= pageCount) {
        return { ok: false, error: `This PDF only has ${pluralize(pageCount, "page")}, so that would not split it` };
      }
      const outputs: SplitOutput[] = [];
      for (let start = 1; start <= pageCount; start += size) {
        outputs.push(output(range(start, Math.min(start + size - 1, pageCount))));
      }
      return { ok: true, outputs };
    }
  }
}

function range(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

/** For the preview: which output file (1-based) each page lands in first. */
export function outputIndexByPage(outputs: SplitOutput[]): Map<number, number> {
  const map = new Map<number, number>();
  outputs.forEach((out, index) => out.pages.forEach((page) => map.has(page) || map.set(page, index + 1)));
  return map;
}
