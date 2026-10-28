import type { ErrorCorrection, QrStyle, WifiDetails } from "./types";

export const DEFAULT_STYLE: QrStyle = {
  foreground: "#111111",
  background: "#ffffff",
  errorCorrection: "M",
  margin: 4,
};

export const DEFAULT_WIFI: WifiDetails = { ssid: "", password: "", security: "WPA", hidden: false };

export const ERROR_CORRECTION_HINTS: Record<ErrorCorrection, string> = {
  L: "Smallest code. Recovers ~7% damage.",
  M: "Balanced. Recovers ~15% damage. Recommended.",
  Q: "Recovers ~25% damage. Good for printed codes that may get scuffed.",
  H: "Recovers ~30% damage. Densest code.",
};

/** PNG download sizes, in pixels. */
export const PNG_SIZES = [512, 1024, 2048] as const;

/** Below this foreground/background contrast many phone cameras struggle. */
export const MIN_CONTRAST = 3;

/** Text beyond this many characters makes a dense code that is hard to scan. */
export const DENSE_TEXT_CHARS = 300;
