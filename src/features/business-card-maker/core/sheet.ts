import type { PrintSize } from "@/lib/card-export";
import { nestSvg } from "./svg-nest";

export interface Placement {
  x: number;
  y: number;
}

export interface CropMark {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface SheetLayout {
  /** Top-left of each card, row by row, in mm. */
  cards: Placement[];
  marks: CropMark[];
}

/** Gap between the card grid and the start of each crop mark, and the mark's length, in mm. */
const MARK_GAP = 2;
const MARK_LENGTH = 5;

/**
 * Cards butted edge to edge and centred on the sheet, so one cut along each
 * crop line separates neighbours. Marks sit in the margin, outside the cards.
 * `mirrored` reverses columns for the back side, so backs line up with fronts
 * when the sheet is printed double-sided and flipped on its long edge.
 */
export function sheetLayout(sheet: PrintSize, card: PrintSize, columns: number, rows: number, mirrored = false): SheetLayout {
  const gridWidth = card.widthMm * columns;
  const gridHeight = card.heightMm * rows;
  if (gridWidth > sheet.widthMm || gridHeight > sheet.heightMm) throw new RangeError("The cards don't fit on the sheet");
  const left = (sheet.widthMm - gridWidth) / 2;
  const top = (sheet.heightMm - gridHeight) / 2;

  const cards: Placement[] = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const slot = mirrored ? columns - 1 - column : column;
      cards.push({ x: left + slot * card.widthMm, y: top + row * card.heightMm });
    }
  }

  const marks: CropMark[] = [];
  const right = left + gridWidth;
  const bottom = top + gridHeight;
  for (let column = 0; column <= columns; column++) {
    const x = left + column * card.widthMm;
    marks.push({ x1: x, y1: top - MARK_GAP - MARK_LENGTH, x2: x, y2: top - MARK_GAP });
    marks.push({ x1: x, y1: bottom + MARK_GAP, x2: x, y2: bottom + MARK_GAP + MARK_LENGTH });
  }
  for (let row = 0; row <= rows; row++) {
    const y = top + row * card.heightMm;
    marks.push({ x1: left - MARK_GAP - MARK_LENGTH, y1: y, x2: left - MARK_GAP, y2: y });
    marks.push({ x1: right + MARK_GAP, y1: y, x2: right + MARK_GAP + MARK_LENGTH, y2: y });
  }
  return { cards, marks };
}

/** One A4 page as SVG: `cardSvg` placed at every slot, plus crop marks. */
export function sheetSvg(sheet: PrintSize, card: PrintSize, layout: SheetLayout, cardSvg: string): string {
  const inner = (at: Placement) => nestSvg(cardSvg, at.x, at.y, card.widthMm, card.heightMm);
  const marks = layout.marks
    .map((m) => `<line x1="${m.x1}" y1="${m.y1}" x2="${m.x2}" y2="${m.y2}"/>`)
    .join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${sheet.widthMm}mm" height="${sheet.heightMm}mm" viewBox="0 0 ${sheet.widthMm} ${sheet.heightMm}">` +
    `<rect width="${sheet.widthMm}" height="${sheet.heightMm}" fill="#ffffff"/>` +
    layout.cards.map(inner).join("") +
    `<g stroke="#000000" stroke-width="0.15">${marks}</g>` +
    `</svg>`
  );
}
