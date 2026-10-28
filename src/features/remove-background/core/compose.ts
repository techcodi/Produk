import { canvasToBlob, createCanvas, decodeImage, releaseCanvas } from "@/lib/images";
import { JPEG_QUALITY } from "../constants";
import type { BackgroundChoice } from "../types";

/** The file to download: the transparent PNG as is, or the cut-out flattened onto a colour as JPEG. */
export async function composeOutput(cutout: Blob, background: BackgroundChoice): Promise<Blob> {
  if (background === "transparent") return cutout;
  const decoded = await decodeImage(cutout);
  const { canvas, ctx } = createCanvas({ width: decoded.width, height: decoded.height });
  try {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, decoded.width, decoded.height);
    ctx.drawImage(decoded.drawable, 0, 0);
    return await canvasToBlob(canvas, "image/jpeg", JPEG_QUALITY);
  } finally {
    decoded.release();
    releaseCanvas(canvas);
  }
}
