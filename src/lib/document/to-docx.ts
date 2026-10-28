import { Document, Packer } from "docx";
import { htmlToContent } from "docx/html";
import { DOC_MARGINS_PT, DOC_PAGE_SIZES, type DocFont, type DocumentSettings, type ImageMap } from "./types";

/** Word fonts closest to each PDF font. */
export const DOCX_FONTS: Record<DocFont, string> = {
  sans: "Calibri",
  serif: "Times New Roman",
  mono: "Courier New",
};

const PT_TO_TWIP = 20;
const PT_TO_PX = 96 / 72;

/** Builds a Word document from the editor's HTML. Loaded on demand (docx is large). */
export function buildDocx(html: string, settings: Omit<DocumentSettings, "fileName">, images: ImageMap, title: string) {
  const page = DOC_PAGE_SIZES[settings.pageSize];
  const margin = DOC_MARGINS_PT[settings.margin] * PT_TO_TWIP;

  return new Document({
    title,
    creator: "ProDuk",
    styles: {
      default: {
        document: { run: { font: DOCX_FONTS[settings.font], size: settings.fontSize * 2 } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: page.width * PT_TO_TWIP, height: page.height * PT_TO_TWIP },
            margin: { top: margin, right: margin, bottom: margin, left: margin },
          },
        },
        children: [
          ...htmlToContent(html, {
            // Images arrive re-encoded to PNG/JPEG, since Word can't show WebP and friends.
            images: (source) => images.get(source)?.dataUrl,
            maxImageWidth: Math.floor((page.width - DOC_MARGINS_PT[settings.margin] * 2) * PT_TO_PX),
          }),
        ],
      },
    ],
  });
}

export const packDocx = (doc: Document) => Packer.toBlob(doc);
