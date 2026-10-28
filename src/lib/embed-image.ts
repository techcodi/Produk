import { canvasToBlob, clampToCanvasLimits, convertHeicToJpeg, createCanvas, decodeImage, hasTransparency, isHeic, releaseCanvas } from "./images";

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

/**
 * Turns any image (HEIC included) into a downscaled PNG (when it has
 * transparency, e.g. logos) or JPEG data URL. Those are the formats PDFs and
 * SVG-as-image embed reliably, and the result is small enough to save in a draft.
 */
export async function toEmbeddableDataUrl(file: Blob, { maxDimension, quality = 0.9 }: { maxDimension: number; quality?: number }): Promise<string> {
  const source = file instanceof File && isHeic(file) ? await convertHeicToJpeg(file) : file;
  const image = await decodeImage(source);
  try {
    const transparent = hasTransparency(image);
    const size = clampToCanvasLimits(image, maxDimension);
    const { canvas, ctx } = createCanvas(size);
    try {
      if (!transparent) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, size.width, size.height);
      }
      ctx.drawImage(image.drawable, 0, 0, size.width, size.height);
      return await blobToDataUrl(await canvasToBlob(canvas, transparent ? "image/png" : "image/jpeg", quality));
    } finally {
      releaseCanvas(canvas);
    }
  } finally {
    image.release();
  }
}
