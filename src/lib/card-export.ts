import { canvasToBlob, clampToCanvasLimits, createCanvas, releaseCanvas, type Size } from "./images";
import { createPdf } from "./pdf/documents";

/** Physical size of a printed design. */
export interface PrintSize {
  widthMm: number;
  heightMm: number;
}

export const MM_PER_INCH = 25.4;
export const mmToPt = (mm: number) => (mm / MM_PER_INCH) * 72;

/** Pixel size of `size` printed at `dpi`, kept inside the canvas limits. */
export const printPixels = ({ widthMm, heightMm }: PrintSize, dpi: number): Size =>
  clampToCanvasLimits({ width: Math.round((widthMm / MM_PER_INCH) * dpi), height: Math.round((heightMm / MM_PER_INCH) * dpi) });

/**
 * Rasterises an SVG string. Embedded images must be data URLs, and text can
 * only use system fonts (an SVG drawn as an image can't load web fonts).
 */
export async function svgToCanvas(svg: string, size: Size): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    const { canvas, ctx } = createCanvas(size);
    ctx.drawImage(img, 0, 0, size.width, size.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function svgToPng(svg: string, size: Size): Promise<Blob> {
  const canvas = await svgToCanvas(svg, size);
  try {
    return await canvasToBlob(canvas, "image/png");
  } finally {
    releaseCanvas(canvas);
  }
}

interface PdfOptions {
  title: string;
  tool: string;
  /** 300 is standard for print; higher only grows the file. */
  dpi?: number;
  signal?: AbortSignal;
}

/** One PDF page per SVG, each exactly `size`, rendered at print resolution. */
export async function svgsToPdf(pages: string[], size: PrintSize, { title, tool, dpi = 300, signal }: PdfOptions): Promise<Uint8Array> {
  const doc = await createPdf(title, tool);
  const pixels = printPixels(size, dpi);
  for (const svg of pages) {
    const png = await svgToPng(svg, pixels);
    signal?.throwIfAborted();
    const image = await doc.embedPng(new Uint8Array(await png.arrayBuffer()));
    const page = doc.addPage([mmToPt(size.widthMm), mmToPt(size.heightMm)]);
    page.drawImage(image, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
  }
  return doc.save();
}
