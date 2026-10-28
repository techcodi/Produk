export type ResizeMode = "percent" | "pixels";
export type ResizeFormat = "original" | "jpeg" | "png" | "webp";

export interface ResizeSettings {
  mode: ResizeMode;
  /** Number fields are kept as typed so they can be edited freely. */
  percent: string;
  width: string;
  height: string;
  /** In pixel mode: fit inside width × height instead of stretching to it. */
  keepAspect: boolean;
  format: ResizeFormat;
}
