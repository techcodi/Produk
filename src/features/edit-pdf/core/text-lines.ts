import type { EditableLine, FontFamily } from "../types";
import { multiply, type Matrix } from "./geometry";

/** The parts of a PDF.js TextItem / TextStyle we use (kept structural so this stays testable). */
export interface RawTextItem {
  str: string;
  transform: number[];
  width: number;
  fontName: string;
}

export interface RawTextStyle {
  ascent?: number;
  descent?: number;
  fontFamily?: string;
}

/** Real font names (e.g. "ABCDEF+TimesNewRomanPS-BoldMT") by PDF.js font id, when known. */
export type FontNames = ReadonlyMap<string, string>;

export function classifyFont(realName: string | undefined, cssFamily: string | undefined): { font: FontFamily; bold: boolean } {
  const name = (realName ?? "").replace(/^[A-Z]{6}\+/, "");
  const family = cssFamily ?? "";
  // "Sans" anywhere in the name wins, so "MicrosoftSansSerif" is sans.
  const serifName = !/sans/i.test(name) && /times|roman|serif|georgia|garamond|cambria|minion|palatino/i.test(name);
  const font: FontFamily =
    /courier|mono|consol/i.test(name) || family === "monospace"
      ? "mono"
      : serifName || (!name && family === "serif")
        ? "serif"
        : "sans";
  return { font, bold: /bold|black|heavy|semibold|demi/i.test(name) };
}

interface Piece extends EditableLine {
  index: number;
}

/**
 * Turns PDF.js text items into clickable lines in viewport space. Only
 * horizontal text is editable. Items on the same baseline with the same font
 * and a small gap are merged, since PDFs often split a line into many pieces.
 */
export function extractEditableLines(
  items: RawTextItem[],
  styles: Readonly<Record<string, RawTextStyle>>,
  viewportTransform: Matrix,
  page: number,
  fontNames: FontNames = new Map(),
): EditableLine[] {
  const pieces: Piece[] = [];

  items.forEach((item, index) => {
    if (!item.str.trim() || item.width <= 0) return;
    const [a, b, c, d, e, f] = multiply(viewportTransform, item.transform);
    // Skip rotated or skewed text: it can't be replaced with an upright line.
    if (Math.abs(b) > 0.01 * Math.abs(a) || Math.abs(c) > 0.01 * Math.abs(d) || a <= 0) return;

    const fontSize = Math.hypot(c, d);
    if (fontSize < 1) return;
    const style = styles[item.fontName] ?? {};
    const { font, bold } = classifyFont(fontNames.get(item.fontName), style.fontFamily);
    const scaleX = Math.hypot(viewportTransform[0], viewportTransform[1]);

    pieces.push({
      index,
      key: `${page}:${index}`,
      text: item.str,
      x: e,
      baseline: f,
      width: item.width * scaleX,
      fontSize,
      ascent: style.ascent && style.ascent > 0 ? style.ascent : 0.8,
      descent: style.descent && style.descent < 0 ? -style.descent : 0.2,
      font,
      bold,
    });
  });

  pieces.sort((p, q) => p.baseline - q.baseline || p.x - q.x);

  const lines: EditableLine[] = [];
  for (const piece of pieces) {
    const last = lines[lines.length - 1];
    const gap = last ? piece.x - (last.x + last.width) : Infinity;
    const sameLine =
      last &&
      Math.abs(piece.baseline - last.baseline) < last.fontSize * 0.2 &&
      Math.abs(piece.fontSize - last.fontSize) < last.fontSize * 0.1 &&
      piece.font === last.font &&
      piece.bold === last.bold &&
      gap > -last.fontSize * 0.2 &&
      gap < last.fontSize * 0.8;

    if (last && sameLine) {
      const needsSpace = gap > last.fontSize * 0.15 && !last.text.endsWith(" ") && !piece.text.startsWith(" ");
      last.text = `${last.text}${needsSpace ? " " : ""}${piece.text}`;
      last.width = piece.x + piece.width - last.x;
    } else {
      const { index, ...line } = piece;
      void index;
      lines.push({ ...line });
    }
  }

  return lines.map((line) => ({ ...line, text: line.text.replace(/\s+$/, "") }));
}
