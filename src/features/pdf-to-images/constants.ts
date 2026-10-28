import type { ConvertSettings, ResolutionId } from "./types";

export const MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024;

/** Render resolution in dots per inch. Very large pages are scaled down to stay within canvas limits. */
export const RESOLUTION_DPI: Record<ResolutionId, number> = {
  screen: 96,
  standard: 150,
  print: 300,
};

export const JPEG_QUALITY = 0.9;

export const DEFAULT_SETTINGS: ConvertSettings = {
  format: "jpg",
  resolution: "standard",
  scope: "all",
  ranges: "",
};
