import { canvasToBlob, createCanvas, decodeImage, releaseCanvas } from "@/lib/images";
import type { Rotation, Size } from "../types";

export interface ProcessedImage {
  jpeg: Uint8Array;
  /** Rotated size before downscaling — used for physical page sizing. */
  naturalSize: Size;
}

interface ProcessOptions {
  rotation: Rotation;
  maxDimension: number;
  jpegQuality: number;
}

/**
 * Decodes any browser-supported image, applies EXIF + user rotation, flattens
 * transparency onto white, downsizes, and re-encodes to JPEG.
 */
export async function processImage(source: Blob, { rotation, maxDimension, jpegQuality }: ProcessOptions): Promise<ProcessedImage> {
  const decoded = await decodeImage(source);
  let canvas: HTMLCanvasElement | undefined;

  try {
    const sideways = rotation % 180 !== 0;
    const naturalSize = sideways
      ? { width: decoded.height, height: decoded.width }
      : { width: decoded.width, height: decoded.height };

    const scale = Math.min(1, maxDimension / Math.max(decoded.width, decoded.height));
    const drawWidth = Math.max(1, Math.round(decoded.width * scale));
    const drawHeight = Math.max(1, Math.round(decoded.height * scale));

    const created = createCanvas(sideways ? { width: drawHeight, height: drawWidth } : { width: drawWidth, height: drawHeight });
    canvas = created.canvas;
    const { ctx } = created;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(decoded.drawable, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

    const blob = await canvasToBlob(canvas, "image/jpeg", jpegQuality);
    return { jpeg: new Uint8Array(await blob.arrayBuffer()), naturalSize };
  } finally {
    decoded.release();
    if (canvas) releaseCanvas(canvas);
  }
}
