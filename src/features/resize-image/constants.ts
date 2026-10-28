import type { ResizeSettings } from "./types";

export const MAX_FILES = 100;
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
export const MAX_PERCENT = 400;

/** Encoder quality for JPG and WebP output. Resizing should not visibly cost quality. */
export const OUTPUT_QUALITY = 0.92;

export const DEFAULT_SETTINGS: ResizeSettings = {
  mode: "percent",
  percent: "50",
  width: "",
  height: "",
  keepAspect: true,
  format: "original",
};
