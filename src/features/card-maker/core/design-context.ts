import type { FieldKey, MeasureFactory } from "../types";

/** What every design function receives. Units are millimetres. */
export interface DesignContext {
  w: number;
  h: number;
  /** Field text (already trimmed of nothing; designs decide what empty means). */
  f: (key: FieldKey) => string;
  accent: string;
  /** Text colour that reads on the accent. */
  onAccent: string;
  family: string;
  photo: string | null;
  measure: MeasureFactory;
}

export type Design = (ctx: DesignContext) => string;

/** Neutral greys used across designs (paper is always white/cream, regardless of the site's theme). */
export const INK = "#1f2937";
export const SOFT_INK = "#4b5563";
export const PAPER = "#fffdf8";
