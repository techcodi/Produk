import { canvasToBlob, createCanvas } from "@/lib/images";
import { createPdf, loadPdfLib } from "@/lib/pdf/documents";
import { JPEG_QUALITY, MM_PER_INCH, PRINT_DPI } from "../constants";
import type { Framing, PhotoBackground, PhotoSpec, SheetLayout } from "../types";
import { photoPixels } from "./framing";

const CUT_LINE_COLOR = "#c8c8c8";

/**
 * Draws the framed photo at print resolution. `subject` is the cut-out (or the
 * original photo) at `subjectSize`, the pixel space `framing` refers to.
 * Anything the photo doesn't cover is filled with the background colour.
 */
export function renderPhoto(
  subject: CanvasImageSource,
  subjectSize: { width: number; height: number },
  spec: PhotoSpec,
  framing: Framing,
  background: PhotoBackground,
  dpi = PRINT_DPI,
): HTMLCanvasElement {
  const size = photoPixels(spec, dpi);
  const { canvas, ctx } = createCanvas(size);
  ctx.fillStyle = background === "original" ? "#ffffff" : background;
  ctx.fillRect(0, 0, size.width, size.height);

  const scale = framing.mmPerPx * (dpi / MM_PER_INCH);
  ctx.setTransform(scale, 0, 0, scale, size.width / 2 - framing.centerX * scale, size.height / 2 - framing.centerY * scale);
  ctx.drawImage(subject, 0, 0, subjectSize.width, subjectSize.height);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return canvas;
}

export const toJpeg = (canvas: HTMLCanvasElement) => canvasToBlob(canvas, "image/jpeg", JPEG_QUALITY);

/** A sheet of copies with light cut lines, for photo printers (JPG at print resolution). */
export function renderSheet(photo: HTMLCanvasElement, layout: SheetLayout, spec: PhotoSpec, dpi = PRINT_DPI): HTMLCanvasElement {
  const px = (mm: number) => Math.round((mm / MM_PER_INCH) * dpi);
  const { canvas, ctx } = createCanvas({ width: px(layout.widthMm), height: px(layout.heightMm) });
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = CUT_LINE_COLOR;
  ctx.lineWidth = 1;
  for (const { x, y } of layout.positions) {
    ctx.drawImage(photo, px(x), px(y), px(spec.widthMm), px(spec.heightMm));
    ctx.strokeRect(px(x) - 0.5, px(y) - 0.5, px(spec.widthMm) + 1, px(spec.heightMm) + 1);
  }
  return canvas;
}

/** The same sheet as a PDF, so home printers print it at true size. */
export async function sheetPdf(photoJpeg: Uint8Array, layout: SheetLayout, spec: PhotoSpec): Promise<Uint8Array> {
  const { rgb } = await loadPdfLib();
  const pt = (mm: number) => (mm / MM_PER_INCH) * 72;
  const doc = await createPdf("Passport photos", "Passport Photo Maker");
  const page = doc.addPage([pt(layout.widthMm), pt(layout.heightMm)]);
  const image = await doc.embedJpg(photoJpeg);
  const lineColor = rgb(0.78, 0.78, 0.78);

  for (const { x, y } of layout.positions) {
    // PDF y runs upwards from the bottom of the page.
    const bottom = pt(layout.heightMm - y - spec.heightMm);
    page.drawImage(image, { x: pt(x), y: bottom, width: pt(spec.widthMm), height: pt(spec.heightMm) });
    page.drawRectangle({ x: pt(x), y: bottom, width: pt(spec.widthMm), height: pt(spec.heightMm), borderColor: lineColor, borderWidth: 0.4 });
  }
  return doc.save();
}
