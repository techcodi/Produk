/**
 * The editor's document as JSON (ProseMirror/TipTap shape). Declared here so
 * the converters don't depend on the editor library.
 */
export interface DocMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface DocNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: DocNode[];
  marks?: DocMark[];
  text?: string;
}

export type DocPageSize = "a4" | "letter";
export type DocMargin = "narrow" | "normal" | "wide";
export type DocFont = "sans" | "serif" | "mono";

export interface DocumentSettings {
  pageSize: DocPageSize;
  margin: DocMargin;
  font: DocFont;
  /** Body text size in points. */
  fontSize: number;
  fileName: string;
}

/** An image from the document, re-encoded to a format both PDF and DOCX writers accept. */
export interface PreparedImage {
  dataUrl: string;
  mime: "image/png" | "image/jpeg";
  /** Pixel size (CSS px). */
  width: number;
  height: number;
}

export type ImageMap = ReadonlyMap<string, PreparedImage>;

/** Page dimensions in points, portrait. */
export const DOC_PAGE_SIZES: Record<DocPageSize, { width: number; height: number }> = {
  a4: { width: 595.28, height: 841.89 },
  letter: { width: 612, height: 792 },
};

export const DOC_MARGINS_PT: Record<DocMargin, number> = {
  narrow: 36,
  normal: 72,
  wide: 108,
};

/** CSS pixels → points. */
export const PX_TO_PT = 0.75;
