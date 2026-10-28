import type { PDFDocument, PDFFont, PDFPage } from "pdf-lib";
import { loadPdfLib, readPdf } from "@/lib/pdf/documents";
import { BASELINE_RATIO, LINE_HEIGHT } from "../constants";
import type { EditObject, FontFamily, ImageObject, PageGeometry, Rect, ShapeObject, TextObject } from "../types";
import { viewportToPdf } from "./geometry";
import { fitsStandardFonts, isWinAnsiChar } from "./winansi";

export class UnsupportedTextError extends Error {
  constructor(readonly characters: string) {
    super(`These characters can’t be added to a PDF here yet: ${characters}`);
    this.name = "UnsupportedTextError";
  }
}

const hexToRgb = async (hex: string) => {
  const { rgb } = await loadPdfLib();
  const value = Number.parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  return rgb(((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255);
};

const dataUrlBytes = (dataUrl: string) => {
  const binary = atob(dataUrl.slice(dataUrl.indexOf(",") + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

interface LoadedFont {
  font: PDFFont;
  supports: (char: string) => boolean;
}

/** Embeds fonts on first use: standard fonts for Latin text, Roboto (from pdfmake's bundle) for everything else. */
function createFontCache(doc: PDFDocument) {
  const cache = new Map<string, Promise<LoadedFont>>();

  const standard = async (font: FontFamily, bold: boolean) => {
    const { StandardFonts } = await loadPdfLib();
    const names: Record<FontFamily, [string, string]> = {
      sans: [StandardFonts.Helvetica, StandardFonts.HelveticaBold],
      serif: [StandardFonts.TimesRoman, StandardFonts.TimesRomanBold],
      mono: [StandardFonts.Courier, StandardFonts.CourierBold],
    };
    return { font: await doc.embedFont(names[font][bold ? 1 : 0]), supports: isWinAnsiChar };
  };

  const unicode = async (bold: boolean) => {
    const [{ default: fontkit }, { default: vfs }] = await Promise.all([import("@pdf-lib/fontkit"), import("pdfmake/build/vfs_fonts")]);
    doc.registerFontkit(fontkit);
    const bytes = dataUrlBytes(`,${vfs[bold ? "Roboto-Medium.ttf" : "Roboto-Regular.ttf"] as unknown as string}`);
    const glyphs = fontkit.create(bytes);
    return {
      font: await doc.embedFont(bytes, { subset: true }),
      supports: (char: string) => glyphs.hasGlyphForCodePoint(char.codePointAt(0)!),
    };
  };

  return (object: TextObject) => {
    const useStandard = fitsStandardFonts(object.text);
    const key = useStandard ? `${object.font}-${object.bold}` : `unicode-${object.bold}`;
    if (!cache.has(key)) cache.set(key, useStandard ? standard(object.font, object.bold) : unicode(object.bold));
    return cache.get(key)!;
  };
}

async function drawRect(page: PDFPage, geometry: PageGeometry, rect: Rect, color: string) {
  const { degrees } = await loadPdfLib();
  const map = viewportToPdf(geometry.transform);
  const [x, y] = map.point(rect.x, rect.y + rect.height);
  page.drawRectangle({ x, y, width: rect.width, height: rect.height, color: await hexToRgb(color), rotate: degrees(map.angle) });
}

async function drawText(page: PDFPage, geometry: PageGeometry, object: TextObject, { font, supports }: LoadedFont) {
  const { degrees } = await loadPdfLib();
  const map = viewportToPdf(geometry.transform);
  const color = await hexToRgb(object.color);
  const lines = object.text.split("\n");
  const baseline = object.y + BASELINE_RATIO[object.font] * object.fontSize;

  for (const [index, line] of lines.entries()) {
    if (!line) continue;
    // A font without a glyph would silently drop the character; fail loudly instead.
    const missing = [...new Set(line)].filter((char) => char.trim() && !supports(char));
    if (missing.length > 0) throw new UnsupportedTextError(missing.join(" "));
    const [x, y] = map.point(object.x, baseline + index * LINE_HEIGHT * object.fontSize);
    page.drawText(line, { x, y, size: object.fontSize, font, color, rotate: degrees(map.angle) });
  }
}

async function drawImage(doc: PDFDocument, page: PDFPage, geometry: PageGeometry, object: ImageObject) {
  const { degrees } = await loadPdfLib();
  const map = viewportToPdf(geometry.transform);
  const bytes = dataUrlBytes(object.src);
  const image = object.src.startsWith("data:image/png") ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
  const [x, y] = map.point(object.x, object.y + object.height);
  page.drawImage(image, { x, y, width: object.width, height: object.height, rotate: degrees(map.angle) });
}

/**
 * Writes the edits into the original PDF. Covers are drawn first so that a
 * replacement line is never hidden by another line's cover.
 */
export async function applyEdits(source: Blob, objects: EditObject[], geometry: PageGeometry[], title: string): Promise<Uint8Array> {
  const doc = await readPdf(source);
  const pages = doc.getPages();
  const fontFor = createFontCache(doc);

  const onPage = (number: number) => objects.filter((object) => object.page === number);

  for (const [index, page] of pages.entries()) {
    const objectsHere = onPage(index + 1);
    if (objectsHere.length === 0) continue;
    const pageGeometry = geometry[index];

    for (const object of objectsHere) {
      if (object.kind === "text" && object.cover) await drawRect(page, pageGeometry, object.cover, object.cover.color);
      if (object.kind === "whiteout") await drawRect(page, pageGeometry, object as ShapeObject, object.color);
    }
    for (const object of objectsHere) {
      if (object.kind === "image") await drawImage(doc, page, pageGeometry, object);
    }
    for (const object of objectsHere) {
      if (object.kind === "text" && object.text.trim()) await drawText(page, pageGeometry, object, await fontFor(object));
    }
  }

  doc.setTitle(title);
  doc.setProducer("ProDuk");
  doc.setModificationDate(new Date());
  return doc.save();
}
