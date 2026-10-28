import { pagesInRanges, parsePageRanges } from "@/lib/pdf/page-ranges";
import type { ConvertSettings, PageSelection } from "../types";

/** Pure function: which pages (1-based, in order) to convert. */
export function resolvePages(settings: Pick<ConvertSettings, "scope" | "ranges">, pageCount: number): PageSelection {
  if (pageCount < 1) return { ok: false, error: "This PDF has no pages" };
  if (settings.scope === "all") return { ok: true, pages: Array.from({ length: pageCount }, (_, index) => index + 1) };

  if (!settings.ranges.trim()) return { ok: false, error: "Tap pages or type ranges to choose which to convert" };
  const parsed = parsePageRanges(settings.ranges, pageCount);
  return parsed.ok ? { ok: true, pages: pagesInRanges(parsed.ranges) } : parsed;
}

/** `"report", 7, 120, "png"` → `"report-page-007.png"`, so files sort correctly in any file manager. */
export function imageFileName(base: string, page: number, pageCount: number, extension: string): string {
  const digits = String(pageCount).length;
  return `${base}-page-${String(page).padStart(digits, "0")}.${extension}`;
}
