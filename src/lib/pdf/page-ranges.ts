import { pluralize } from "../format";

/** 1-based, inclusive. */
export interface PageRange {
  start: number;
  end: number;
}

export type ParsedRanges = { ok: true; ranges: PageRange[] } | { ok: false; error: string };

/**
 * Parses user input such as `"1-3, 5, 8-"` against a document's page count.
 * An open start (`-4`) means "from page 1", an open end (`8-`) "to the last page".
 */
export function parsePageRanges(input: string, pageCount: number): ParsedRanges {
  const parts = input
    .split(/[,;]/)
    .map((part) => part.replace(/\s+/g, ""))
    .filter(Boolean);

  if (parts.length === 0) return { ok: false, error: "Enter at least one page, e.g. 1-3, 5" };

  const ranges: PageRange[] = [];
  for (const part of parts) {
    const match = /^(\d*)(?:([-–])(\d*))?$/.exec(part);
    if (!match || (!match[1] && !match[3])) return { ok: false, error: `“${part}” isn’t a page or range` };

    const start = match[1] ? Number(match[1]) : 1;
    const end = match[2] ? (match[3] ? Number(match[3]) : pageCount) : start;

    if (start < 1 || end < 1) return { ok: false, error: "Pages start at 1" };
    if (start > end) return { ok: false, error: `“${part}” runs backwards — try ${end}-${start}` };
    if (end > pageCount) {
      return { ok: false, error: `Page ${end} doesn’t exist — this PDF has ${pluralize(pageCount, "page")}` };
    }
    ranges.push({ start, end });
  }

  return { ok: true, ranges };
}

/** Every page covered by `ranges`, in order of first appearance, without duplicates. */
export function pagesInRanges(ranges: PageRange[]): number[] {
  const pages = new Set<number>();
  for (const { start, end } of ranges) {
    for (let page = start; page <= end; page++) pages.add(page);
  }
  return [...pages];
}

/** `[5, 1, 2, 3]` → `"1-3, 5"`. */
export function formatPageRanges(pages: Iterable<number>): string {
  const sorted = [...new Set(pages)].sort((a, b) => a - b);
  const parts: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const start = sorted[i];
    while (i + 1 < sorted.length && sorted[i + 1] === sorted[i] + 1) i++;
    parts.push(start === sorted[i] ? `${start}` : `${start}-${sorted[i]}`);
  }
  return parts.join(", ");
}

/** Adds or removes one page from a range string, e.g. toggling 4 in "1-3" gives "1-4". */
export function togglePageInRanges(input: string, page: number, pageCount: number): string {
  const parsed = parsePageRanges(input, pageCount);
  const pages = new Set(parsed.ok ? pagesInRanges(parsed.ranges) : []);
  if (pages.has(page)) pages.delete(page);
  else pages.add(page);
  return formatPageRanges(pages);
}
