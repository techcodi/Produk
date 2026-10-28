import { MAX_CANVAS_DIMENSION } from "@/lib/images";
import type { CompressionLevel, CompressSettings } from "./types";

export const MAX_FILES = 100;
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

export const COMPRESSION_LEVELS: Record<CompressionLevel, { quality: number; maxDimension: number }> = {
  light: { quality: 0.88, maxDimension: MAX_CANVAS_DIMENSION },
  balanced: { quality: 0.75, maxDimension: MAX_CANVAS_DIMENSION },
  strong: { quality: 0.6, maxDimension: 2560 },
};

export const DEFAULT_SETTINGS: CompressSettings = {
  level: "balanced",
  format: "auto",
};
