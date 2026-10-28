import type { Size } from "@/lib/images";

export type { RejectedFile } from "@/lib/files";
export type { Size };

export type Rotation = 0 | 90 | 180 | 270;

export interface ImageItem {
  id: string;
  name: string;
  /** Original file size in bytes (before any conversion). */
  size: number;
  /** Browser-decodable image data (HEIC is converted to JPEG on import). */
  source: Blob;
  previewUrl: string;
  rotation: Rotation;
}

export type PageSizeId = "a4" | "letter" | "legal" | "fit";
export type Orientation = "auto" | "portrait" | "landscape";
export type MarginId = "none" | "small" | "large";
export type QualityId = "high" | "balanced" | "small";

export interface PdfSettings {
  pageSize: PageSizeId;
  orientation: Orientation;
  margin: MarginId;
  quality: QualityId;
  fileName: string;
}

export interface Rect extends Size {
  x: number;
  y: number;
}
