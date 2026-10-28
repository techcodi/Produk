export interface PhotoSpec {
  widthMm: number;
  heightMm: number;
  /** Allowed head height, chin to crown, in mm. */
  headMm: [min: number, max: number];
  /** Gap between the top edge and the top of the head, in mm. */
  crownMarginMm: number;
}

export interface PhotoPreset extends PhotoSpec {
  id: string;
  label: string;
  /** Where the size is commonly used. */
  usage: string;
}

/** A solid colour, or "original" to keep the photo's own background. */
export type PhotoBackground = `#${string}` | "original";

/**
 * Where the photo sits in the frame: `mmPerPx` physical millimetres per
 * source pixel (the zoom), and the source pixel shown at the frame's centre.
 * Independent of output resolution, so preview and print use the same numbers.
 */
export interface Framing {
  mmPerPx: number;
  centerX: number;
  centerY: number;
}

/** Head position in the source image, as fractions of its width/height. */
export interface HeadEstimate {
  top: number;
  chin: number;
  centerX: number;
}

export interface SheetLayout {
  /** Sheet size in mm (orientation already chosen). */
  widthMm: number;
  heightMm: number;
  /** Top-left corner of each photo, in mm. */
  positions: { x: number; y: number }[];
}
