import { clampToCanvasLimits, type OutputMime, type Size } from "@/lib/images";
import { MAX_PERCENT } from "../constants";
import type { ResizeFormat, ResizeSettings } from "../types";

const parseDimension = (value: string) => (value.trim() === "" ? undefined : Number(value));
const isValidDimension = (value: number | undefined) => value === undefined || (Number.isInteger(value) && value >= 1);

/** Problem with the settings themselves (independent of any image), or undefined if they are usable. */
export function validateResizeSettings(settings: ResizeSettings): string | undefined {
  if (settings.mode === "percent") {
    const percent = Number(settings.percent);
    if (settings.percent.trim() === "" || !Number.isFinite(percent) || percent <= 0) return "Enter a percentage above 0";
    if (percent > MAX_PERCENT) return `Up to ${MAX_PERCENT}% is supported`;
    return undefined;
  }

  const width = parseDimension(settings.width);
  const height = parseDimension(settings.height);
  if (width === undefined && height === undefined) return "Enter a width, a height, or both";
  if (!isValidDimension(width) || !isValidDimension(height)) return "Sizes must be whole numbers of pixels";
  return undefined;
}

export interface TargetSize extends Size {
  /** True when the requested size was reduced to fit browser canvas limits. */
  limited: boolean;
}

/**
 * Pure function: the output size for one image. Assumes settings are valid
 * (see validateResizeSettings).
 */
export function computeTargetSize(original: Size, settings: ResizeSettings): TargetSize {
  let width: number;
  let height: number;

  if (settings.mode === "percent") {
    const factor = Number(settings.percent) / 100;
    width = original.width * factor;
    height = original.height * factor;
  } else {
    const boxWidth = parseDimension(settings.width);
    const boxHeight = parseDimension(settings.height);
    if (settings.keepAspect) {
      const scale = Math.min(
        boxWidth === undefined ? Infinity : boxWidth / original.width,
        boxHeight === undefined ? Infinity : boxHeight / original.height,
      );
      width = original.width * scale;
      height = original.height * scale;
    } else {
      width = boxWidth ?? original.width;
      height = boxHeight ?? original.height;
    }
  }

  const requested = { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) };
  const clamped = clampToCanvasLimits(requested);
  return { ...clamped, limited: clamped.width !== requested.width || clamped.height !== requested.height };
}

const NATIVE_OUTPUTS: OutputMime[] = ["image/jpeg", "image/png", "image/webp"];

/** "Original" keeps JPG/PNG/WebP as they are; anything else (HEIC, GIF, BMP…) becomes JPG. */
export function resolveOutputMime(format: ResizeFormat, sourceType: string): OutputMime {
  if (format === "jpeg") return "image/jpeg";
  if (format === "png") return "image/png";
  if (format === "webp") return "image/webp";
  return NATIVE_OUTPUTS.includes(sourceType as OutputMime) ? (sourceType as OutputMime) : "image/jpeg";
}
