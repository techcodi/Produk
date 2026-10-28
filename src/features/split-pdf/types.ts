export type SplitMode = "select" | "ranges" | "every";

export interface SplitSettings {
  mode: SplitMode;
  /** Page/range text such as "1-3, 5", used by the "select" and "ranges" modes. */
  ranges: string;
  /** Pages per file in "every" mode (kept as typed so the field can be edited freely). */
  everyN: string;
}

export interface SplitOutput {
  /** 1-based page numbers, in output order. */
  pages: number[];
  /** File-name suffix, e.g. "pages-1-3". */
  label: string;
}

export type SplitPlan = { ok: true; outputs: SplitOutput[] } | { ok: false; error: string };
