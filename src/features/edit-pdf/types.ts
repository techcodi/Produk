export type FontFamily = "sans" | "serif" | "mono";

/**
 * Every object lives on one page, in that page's *viewport* space at scale 1:
 * PDF points, origin top-left, y pointing down, with the page's own rotation
 * applied — i.e. exactly as the page is displayed. Conversion to PDF user
 * space happens only when saving (core/geometry.ts).
 */
interface PlacedObject {
  id: string;
  /** 1-based page number. */
  page: number;
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextObject extends PlacedObject {
  kind: "text";
  /** Top-left of the first line box; lines are separated by "\n". */
  text: string;
  fontSize: number;
  font: FontFamily;
  bold: boolean;
  color: string;
  /** For edits of existing text: the box painted over the original, in its sampled background colour. */
  cover?: Rect & { color: string };
  /** For edits of existing text: what the line said originally. */
  original?: string;
}

export interface ImageObject extends PlacedObject {
  kind: "image";
  width: number;
  height: number;
  /** PNG or JPEG data URL. */
  src: string;
  signature: boolean;
}

export interface ShapeObject extends PlacedObject {
  kind: "whiteout";
  width: number;
  height: number;
  color: string;
}

export type EditObject = TextObject | ImageObject | ShapeObject;

/** A run of existing text that can be clicked to replace it, in viewport space. */
export interface EditableLine {
  /** Stable within a page: "<page>:<first item index>". */
  key: string;
  text: string;
  x: number;
  /** y of the baseline. */
  baseline: number;
  width: number;
  fontSize: number;
  /** Ascent above / descent below the baseline, as fractions of the font size (descent is positive here). */
  ascent: number;
  descent: number;
  font: FontFamily;
  bold: boolean;
}

/** What saving needs to know about a page: viewport size and the matrix from PDF user space to viewport space. */
export interface PageGeometry {
  width: number;
  height: number;
  transform: number[];
}

export type EditMode = "select" | "edit-text" | "add-text" | "whiteout" | "place";

export interface PendingImage {
  src: string;
  /** Natural size in CSS pixels. */
  width: number;
  height: number;
  signature: boolean;
}
