import {
  canvasToBlob,
  clampToCanvasLimits,
  convertHeicToJpeg,
  createCanvas,
  decodeImage,
  hasTransparency,
  isHeic,
  releaseCanvas,
} from "@/lib/images";
import { MAX_IMAGE_DIMENSION } from "../constants";
import type { PendingImage } from "../types";

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

/**
 * Turns an uploaded image into something pdf-lib can embed: PNG when it has
 * transparency (logos, stamps), JPEG otherwise, scaled down to a sensible size.
 */
export async function prepareImage(file: File): Promise<PendingImage> {
  const source = isHeic(file) ? await convertHeicToJpeg(file) : file;
  const decoded = await decodeImage(source);
  try {
    const size = clampToCanvasLimits(decoded, MAX_IMAGE_DIMENSION);
    const transparent = hasTransparency(decoded);
    const { canvas, ctx } = createCanvas(size);
    try {
      ctx.drawImage(decoded.drawable, 0, 0, size.width, size.height);
      const blob = await canvasToBlob(canvas, transparent ? "image/png" : "image/jpeg", 0.9);
      return { src: await blobToDataUrl(blob), width: size.width, height: size.height, signature: false };
    } finally {
      releaseCanvas(canvas);
    }
  } finally {
    decoded.release();
  }
}
