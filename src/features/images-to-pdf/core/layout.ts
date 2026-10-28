import { PAGE_SIZES } from "../constants";
import type { Orientation, PageSizeId, Rect, Size } from "../types";

/** CSS pixels → PDF points. */
export const PX_TO_PT = 72 / 96;
/** PDF spec limit for a page dimension (200 inches). */
export const MAX_PAGE_PT = 14400;

export interface PageLayout {
  page: Size;
  /** Where the image is drawn, in PDF coordinates (origin bottom-left). */
  frame: Rect;
}

interface LayoutOptions {
  pageSize: PageSizeId;
  orientation: Orientation;
  margin: number;
}

/**
 * Pure function: given an image's (already-rotated) pixel size, work out the
 * page size and where to draw the image so it fits and is centred.
 */
export function computePageLayout(image: Size, { pageSize, orientation, margin }: LayoutOptions): PageLayout {
  if (image.width <= 0 || image.height <= 0) {
    throw new Error("Image has no dimensions");
  }

  if (pageSize === "fit") {
    const limit = MAX_PAGE_PT - margin * 2;
    const raw = { width: image.width * PX_TO_PT, height: image.height * PX_TO_PT };
    const scale = Math.min(1, limit / Math.max(raw.width, raw.height));
    const width = raw.width * scale;
    const height = raw.height * scale;
    return {
      page: { width: width + margin * 2, height: height + margin * 2 },
      frame: { x: margin, y: margin, width, height },
    };
  }

  const base = PAGE_SIZES[pageSize];
  const landscape = orientation === "landscape" || (orientation === "auto" && image.width > image.height);
  const short = Math.min(base.width, base.height);
  const long = Math.max(base.width, base.height);
  const page = landscape ? { width: long, height: short } : { width: short, height: long };

  const available = { width: page.width - margin * 2, height: page.height - margin * 2 };
  const scale = Math.min(available.width / image.width, available.height / image.height);
  const width = image.width * scale;
  const height = image.height * scale;

  return {
    page,
    frame: { x: (page.width - width) / 2, y: (page.height - height) / 2, width, height },
  };
}
