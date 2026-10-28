import type { ModelId } from "@/lib/background-removal/models";

/** "transparent" or a hex colour to put behind the cut-out. */
export type BackgroundChoice = "transparent" | `#${string}`;

export interface Cutout {
  /** Transparent PNG of the subject at the image's (canvas-limited) size. */
  blob: Blob;
  url: string;
  width: number;
  height: number;
  model: ModelId;
}
