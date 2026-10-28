export type CompressionLevel = "light" | "balanced" | "strong";
export type CompressFormat = "auto" | "jpeg" | "webp";

export interface CompressSettings {
  level: CompressionLevel;
  format: CompressFormat;
}

export interface CompressedImage {
  /** Id of the source ImageFile. */
  id: string;
  blob: Blob;
  fileName: string;
  /** True when re-encoding didn't help and the original file is returned instead. */
  kept: boolean;
}
