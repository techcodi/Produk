export type ImageFormat = "jpg" | "png";
export type ResolutionId = "screen" | "standard" | "print";
export type PageScope = "all" | "custom";

export interface ConvertSettings {
  format: ImageFormat;
  resolution: ResolutionId;
  scope: PageScope;
  /** Page/range text for the "custom" scope, e.g. "1-3, 5". */
  ranges: string;
}

export type PageSelection = { ok: true; pages: number[] } | { ok: false; error: string };
