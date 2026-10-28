import { printPixels, svgsToPdf, svgToPng, type PrintSize } from "@/lib/card-export";
import type { CardFormat } from "../types";

/** 300 dpi for print, raised for small cards so even a wallet card exports at least 2000 px wide. */
export function exportDpi({ widthMm, heightMm }: PrintSize): number {
  const longInches = Math.max(widthMm, heightMm) / 25.4;
  return Math.min(600, Math.max(300, Math.ceil(2000 / longInches)));
}

const sizeOf = (format: CardFormat): PrintSize => ({ widthMm: format.widthMm, heightMm: format.heightMm });

export const cardToPng = (svg: string, format: CardFormat) => svgToPng(svg, printPixels(sizeOf(format), exportDpi(sizeOf(format))));

export const cardToPdf = (svg: string, format: CardFormat, title: string) =>
  svgsToPdf([svg], sizeOf(format), { title, tool: "Card Maker", dpi: exportDpi(sizeOf(format)) });
