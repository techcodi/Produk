import type { FontFamily } from "./types";

export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;

/** Line box height as a multiple of the font size, shared by the on-screen editor and the saved PDF. */
export const LINE_HEIGHT = 1.2;

/**
 * Where the baseline of the first line sits below the top of its line box,
 * as a fraction of the font size, for each preview font at LINE_HEIGHT
 * (half-leading + ascent from the fonts' metrics). Using the same numbers on
 * screen and in the PDF is what makes saved text land where it was typed.
 */
export const BASELINE_RATIO: Record<FontFamily, number> = {
  sans: 0.947,
  serif: 0.937,
  mono: 0.866,
};

/** Fonts used on screen; metric-compatible with the PDF standard fonts used when saving. */
export const PREVIEW_FONTS: Record<FontFamily, string> = {
  sans: "Arial, Helvetica, 'Liberation Sans', Arimo, sans-serif",
  serif: "'Times New Roman', Times, 'Liberation Serif', Tinos, serif",
  mono: "'Courier New', Courier, 'Liberation Mono', Cousine, monospace",
};

export const DEFAULT_TEXT = {
  fontSize: 14,
  font: "sans" as FontFamily,
  color: "#111111",
};

export const DEFAULT_WHITEOUT_COLOR = "#ffffff";

/** Placed images start no wider than this share of the page; signatures no wider than SIGNATURE_WIDTH_PT. */
export const IMAGE_MAX_PAGE_SHARE = 0.4;
export const SIGNATURE_WIDTH_PT = 160;

/** Longest side, in pixels, for images embedded in the PDF. */
export const MAX_IMAGE_DIMENSION = 2000;

export const COLOR_SWATCHES = ["#111111", "#1d4ed8", "#b91c1c", "#15803d", "#ffffff"] as const;
