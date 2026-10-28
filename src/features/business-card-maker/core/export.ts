import { printPixels, svgsToPdf, svgToPng } from "@/lib/card-export";
import { sanitizeFileName } from "@/lib/files";
import { CARD_SIZES, SHEET_COLUMNS, SHEET_ROWS, SHEET_SIZE } from "../constants";
import type { CardDetails, CardSizeId } from "../types";
import { sheetLayout, sheetSvg } from "./sheet";

const TOOL = "Business Card Maker";

export type ExportKind = "card-pdf" | "sheet-pdf" | "png";

export interface ExportedFile {
  blob: Blob;
  fileName: string;
}

const baseName = (details: CardDetails) => [details.name, "business card"].filter((part) => part.trim()).join(" ");

/** Renders the chosen export. `front`/`back` are the card SVGs from `renderCard`. */
export async function exportCard(
  kind: ExportKind,
  { front, back, details, size }: { front: string; back: string; details: CardDetails; size: CardSizeId },
): Promise<ExportedFile> {
  const card = CARD_SIZES[size];
  const name = baseName(details);

  if (kind === "png") {
    const blob = await svgToPng(front, printPixels(card, 600));
    return { blob, fileName: sanitizeFileName(name, "png", "business-card") };
  }

  if (kind === "card-pdf") {
    const bytes = await svgsToPdf([front, back], card, { title: name, tool: TOOL });
    return { blob: new Blob([bytes as BlobPart], { type: "application/pdf" }), fileName: sanitizeFileName(name, "pdf", "business-card") };
  }

  // Page 1 fronts, page 2 backs mirrored, for double-sided printing flipped on the long edge.
  const pages = [
    sheetSvg(SHEET_SIZE, card, sheetLayout(SHEET_SIZE, card, SHEET_COLUMNS, SHEET_ROWS), front),
    sheetSvg(SHEET_SIZE, card, sheetLayout(SHEET_SIZE, card, SHEET_COLUMNS, SHEET_ROWS, true), back),
  ];
  const bytes = await svgsToPdf(pages, SHEET_SIZE, { title: `${name} (print sheet)`, tool: TOOL });
  return {
    blob: new Blob([bytes as BlobPart], { type: "application/pdf" }),
    fileName: sanitizeFileName(`${name} A4 sheet`, "pdf", "business-cards-sheet"),
  };
}
