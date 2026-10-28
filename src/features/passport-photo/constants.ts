import type { PhotoBackground, PhotoPreset } from "./types";

export const MAX_FILE_SIZE_BYTES = 30 * 1024 * 1024;

/** Print resolution for every output. 300 DPI is what photo shops and ID offices expect. */
export const PRINT_DPI = 300;
export const JPEG_QUALITY = 0.95;
export const MM_PER_INCH = 25.4;

/**
 * Common sizes. Head guidance is approximate and rules change, so the UI
 * always tells people to check their own document's requirements.
 */
export const PRESETS: PhotoPreset[] = [
  { id: "35x45", label: "35×45 mm", usage: "UK, EU & Schengen, and most passports worldwide", widthMm: 35, heightMm: 45, headMm: [29, 34], crownMarginMm: 4 },
  { id: "2x2in", label: "2×2 in (51×51 mm)", usage: "US passport and visa", widthMm: 50.8, heightMm: 50.8, headMm: [25.4, 34.9], crownMarginMm: 5.5 },
  { id: "50x70", label: "50×70 mm", usage: "Canada passport", widthMm: 50, heightMm: 70, headMm: [31, 36], crownMarginMm: 12 },
  { id: "33x48", label: "33×48 mm", usage: "China visa", widthMm: 33, heightMm: 48, headMm: [28, 33], crownMarginMm: 4 },
];

export const CUSTOM_PRESET_ID = "custom";

export const BACKGROUNDS: { value: PhotoBackground; label: string }[] = [
  { value: "#ffffff", label: "White" },
  { value: "#f1f1f1", label: "Light grey" },
  { value: "#d6e6f5", label: "Light blue" },
  { value: "original", label: "Keep original" },
];

/** Print sheets, portrait, in mm. */
export const SHEETS = {
  "4x6": { label: "4×6 in photo paper", widthMm: 101.6, heightMm: 152.4 },
  a4: { label: "A4 paper", widthMm: 210, heightMm: 297 },
} as const;

export type SheetId = keyof typeof SHEETS;

/** Space between photos on a sheet, and the unprintable border kept clear. */
export const SHEET_GAP_MM = 2;
export const SHEET_MARGIN_MM = 4;

/** Zoom limits for the framing editor, relative to "head fits the guide". */
export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 5;
