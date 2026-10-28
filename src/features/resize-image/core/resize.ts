import { yieldToMain } from "@/lib/async";
import type { BatchItemResult } from "@/lib/batch";
import { stripExtension } from "@/lib/files";
import { canvasToBlob, createCanvas, decodeImage, extensionForMime, releaseCanvas, type Size } from "@/lib/images";
import { OUTPUT_QUALITY } from "../constants";
import type { ResizeSettings } from "../types";
import { computeTargetSize, resolveOutputMime } from "./target-size";

export interface ResizeSource {
  id: string;
  name: string;
  type: string;
  /** Browser-decodable data (HEIC already converted). */
  source: Blob;
}

export class ImageResizeError extends Error {
  constructor(
    readonly fileName: string,
    cause: unknown,
  ) {
    super(`${fileName} could not be resized`, { cause });
    this.name = "ImageResizeError";
  }
}

export const resizedFileName = (name: string, size: Size, mime: string) =>
  `${stripExtension(name)}-${size.width}x${size.height}.${extensionForMime(mime)}`;

export async function resizeImage(item: ResizeSource, settings: ResizeSettings): Promise<BatchItemResult> {
  const decoded = await decodeImage(item.source);
  let canvas: HTMLCanvasElement | undefined;

  try {
    // Size from the decoded bitmap, which is what actually gets drawn.
    const target = computeTargetSize({ width: decoded.width, height: decoded.height }, settings);
    const mime = resolveOutputMime(settings.format, item.type);
    const created = createCanvas(target);
    canvas = created.canvas;

    if (mime === "image/jpeg") {
      // JPEG has no alpha channel; without this, transparent areas turn black.
      created.ctx.fillStyle = "#ffffff";
      created.ctx.fillRect(0, 0, target.width, target.height);
    }
    created.ctx.drawImage(decoded.drawable, 0, 0, target.width, target.height);

    const blob = await canvasToBlob(canvas, mime, mime === "image/png" ? undefined : OUTPUT_QUALITY);
    return { id: item.id, blob, fileName: resizedFileName(item.name, target, blob.type) };
  } finally {
    decoded.release();
    if (canvas) releaseCanvas(canvas);
  }
}

interface BatchOptions {
  signal?: AbortSignal;
  onProgress?: (completed: number, total: number) => void;
}

export async function resizeImages(items: ResizeSource[], settings: ResizeSettings, { signal, onProgress }: BatchOptions = {}) {
  const results: BatchItemResult[] = [];

  for (const [index, item] of items.entries()) {
    signal?.throwIfAborted();
    try {
      results.push(await resizeImage(item, settings));
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new ImageResizeError(item.name, error);
    }
    onProgress?.(index + 1, items.length);
    await yieldToMain();
  }

  signal?.throwIfAborted();
  return results;
}
