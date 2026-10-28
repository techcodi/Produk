import type { BackgroundChoice } from "./types";

export const MAX_FILE_SIZE_BYTES = 30 * 1024 * 1024;

export const BACKGROUND_PRESETS: { value: BackgroundChoice; label: string }[] = [
  { value: "transparent", label: "None" },
  { value: "#ffffff", label: "White" },
  { value: "#000000", label: "Black" },
  { value: "#e8f0fe", label: "Light blue" },
];

/** JPEG quality when a solid background is chosen. */
export const JPEG_QUALITY = 0.92;
