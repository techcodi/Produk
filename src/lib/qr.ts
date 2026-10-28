import QRCode from "qrcode";

/*
 * Generic QR code encoding and drawing, shared by the QR Code Generator and
 * any tool that puts a QR code on something (e.g. business cards).
 */

export type ErrorCorrection = "L" | "M" | "Q" | "H";

/** The QR symbol: `size`×`size` modules, row-major, 1 = dark. */
export interface QrMatrix {
  size: number;
  data: ArrayLike<number>;
}

export class QrTooLongError extends Error {
  constructor() {
    super("That’s too much for one QR code. Shorten the text, or choose a lower error correction level.");
    this.name = "QrTooLongError";
  }
}

/** Encodes `text` into a QR matrix (the smallest version that fits). */
export function encodeQr(text: string, errorCorrection: ErrorCorrection): QrMatrix {
  try {
    const { modules } = QRCode.create(text, { errorCorrectionLevel: errorCorrection });
    return { size: modules.size, data: modules.data };
  } catch (error) {
    if (error instanceof Error && /too big|amount of data/i.test(error.message)) throw new QrTooLongError();
    throw error;
  }
}

/**
 * Pure function: QR matrix → SVG. Each row's runs of dark modules become one
 * rectangle, which keeps the file small and renders without hairline gaps.
 */
export function matrixToSvg(matrix: QrMatrix, { foreground, background, margin }: { foreground: string; background: string; margin: number }): string {
  const total = matrix.size + margin * 2;
  let path = "";
  for (let row = 0; row < matrix.size; row++) {
    let col = 0;
    while (col < matrix.size) {
      if (!matrix.data[row * matrix.size + col]) {
        col++;
        continue;
      }
      const start = col;
      while (col < matrix.size && matrix.data[row * matrix.size + col]) col++;
      path += `M${start + margin} ${row + margin}h${col - start}v1h-${col - start}z`;
    }
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges">` +
    `<rect width="${total}" height="${total}" fill="${background}"/>` +
    `<path fill="${foreground}" d="${path}"/>` +
    `</svg>`
  );
}

/** Draws the code onto a square canvas of `pixels`, aligning modules to whole pixels where possible. */
export function drawQr(matrix: QrMatrix, pixels: number, style: { foreground: string; background: string; margin: number }): HTMLCanvasElement {
  const total = matrix.size + style.margin * 2;
  const canvas = document.createElement("canvas");
  canvas.width = pixels;
  canvas.height = pixels;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = style.background;
  ctx.fillRect(0, 0, pixels, pixels);
  ctx.fillStyle = style.foreground;
  const edge = (i: number) => Math.round((i * pixels) / total);
  for (let row = 0; row < matrix.size; row++) {
    for (let col = 0; col < matrix.size; col++) {
      if (!matrix.data[row * matrix.size + col]) continue;
      const x = edge(col + style.margin);
      const y = edge(row + style.margin);
      ctx.fillRect(x, y, edge(col + style.margin + 1) - x, edge(row + style.margin + 1) - y);
    }
  }
  return canvas;
}
