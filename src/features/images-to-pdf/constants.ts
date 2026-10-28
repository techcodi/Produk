import type { MarginId, PageSizeId, PdfSettings, QualityId, Size } from "./types";

/** Portrait page dimensions in PDF points (1pt = 1/72 inch). */
export const PAGE_SIZES: Record<Exclude<PageSizeId, "fit">, Size> = {
  a4: { width: 595.28, height: 841.89 },
  letter: { width: 612, height: 792 },
  legal: { width: 612, height: 1008 },
};

export const MARGINS_PT: Record<MarginId, number> = {
  none: 0,
  small: 18,
  large: 42,
};

/**
 * Every image is re-encoded to JPEG so the pipeline is uniform (PNG/WebP/GIF/
 * AVIF/HEIC all work the same). The cap on dimension keeps canvas memory well
 * under the ~16.7MP iOS Safari limit.
 */
export const QUALITY_PRESETS: Record<QualityId, { maxDimension: number; jpegQuality: number }> = {
  high: { maxDimension: 4000, jpegQuality: 0.92 },
  balanced: { maxDimension: 2400, jpegQuality: 0.82 },
  small: { maxDimension: 1600, jpegQuality: 0.68 },
};

export const DEFAULT_SETTINGS: PdfSettings = {
  pageSize: "a4",
  orientation: "auto",
  margin: "small",
  quality: "balanced",
  fileName: "produk-images",
};

export const MAX_FILES = 200;
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
