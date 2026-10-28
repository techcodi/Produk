import { yieldToMain } from "@/lib/async";
import { stripExtension } from "@/lib/files";
import {
  canvasToBlob,
  clampToCanvasLimits,
  createCanvas,
  decodeImage,
  extensionForMime,
  hasTransparency,
  releaseCanvas,
  type OutputMime,
} from "@/lib/images";
import { COMPRESSION_LEVELS } from "../constants";
import type { CompressedImage, CompressFormat, CompressSettings } from "../types";

/** Formats we can hand back untouched when re-encoding would only make them bigger. */
const PASSTHROUGH_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** "Auto" picks JPEG for opaque images and WebP (which keeps transparency) for see-through ones. */
export function chooseOutputMime(format: CompressFormat, transparent: boolean): OutputMime {
  if (format === "jpeg") return "image/jpeg";
  if (format === "webp") return "image/webp";
  return transparent ? "image/webp" : "image/jpeg";
}

/** Keep the original when it is already smaller and in a format every app can open. */
export function shouldKeepOriginal(original: { type: string; size: number }, compressedSize: number): boolean {
  return PASSTHROUGH_TYPES.includes(original.type) && compressedSize >= original.size;
}

export const compressedFileName = (name: string, mime: string) => `${stripExtension(name)}-compressed.${extensionForMime(mime)}`;

export interface CompressSource {
  id: string;
  name: string;
  type: string;
  size: number;
  file: File;
  /** Browser-decodable data (HEIC already converted). */
  source: Blob;
}

export class ImageCompressError extends Error {
  constructor(
    readonly fileName: string,
    cause: unknown,
  ) {
    super(`${fileName} could not be compressed`, { cause });
    this.name = "ImageCompressError";
  }
}

export async function compressImage(item: CompressSource, settings: CompressSettings): Promise<CompressedImage> {
  const { quality, maxDimension } = COMPRESSION_LEVELS[settings.level];
  const decoded = await decodeImage(item.source);
  let canvas: HTMLCanvasElement | undefined;

  try {
    const mime = chooseOutputMime(settings.format, settings.format === "auto" && hasTransparency(decoded));
    const size = clampToCanvasLimits(decoded, maxDimension);
    const created = createCanvas(size);
    canvas = created.canvas;

    if (mime === "image/jpeg") {
      // JPEG has no alpha channel; without this, transparent areas turn black.
      created.ctx.fillStyle = "#ffffff";
      created.ctx.fillRect(0, 0, size.width, size.height);
    }
    created.ctx.drawImage(decoded.drawable, 0, 0, size.width, size.height);

    const blob = await canvasToBlob(canvas, mime, quality);
    if (shouldKeepOriginal(item, blob.size)) {
      return { id: item.id, blob: item.file, fileName: item.name, kept: true };
    }
    return { id: item.id, blob, fileName: compressedFileName(item.name, blob.type), kept: false };
  } finally {
    decoded.release();
    if (canvas) releaseCanvas(canvas);
  }
}

interface BatchOptions {
  signal?: AbortSignal;
  onProgress?: (completed: number, total: number) => void;
}

export async function compressImages(items: CompressSource[], settings: CompressSettings, { signal, onProgress }: BatchOptions = {}) {
  const results: CompressedImage[] = [];

  for (const [index, item] of items.entries()) {
    signal?.throwIfAborted();
    try {
      results.push(await compressImage(item, settings));
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new ImageCompressError(item.name, error);
    }
    onProgress?.(index + 1, items.length);
    await yieldToMain();
  }

  signal?.throwIfAborted();
  return results;
}
