import type { Framing, HeadEstimate, PhotoSpec, SheetLayout } from "../types";

/** Size of a photo in pixels at `dpi`. */
export const photoPixels = ({ widthMm, heightMm }: PhotoSpec, dpi: number) => ({
  width: Math.round((widthMm / 25.4) * dpi),
  height: Math.round((heightMm / 25.4) * dpi),
});

/** A spec for any custom size: head about 70% of the height, a 10% gap above it. */
export const customSpec = (widthMm: number, heightMm: number): PhotoSpec => ({
  widthMm,
  heightMm,
  headMm: [heightMm * 0.62, heightMm * 0.76],
  crownMarginMm: heightMm * 0.1,
});

/**
 * Finds the head in a subject mask (the background-removal output: `size`×`size`
 * alpha values stretched from an image with the given width/height `aspect`).
 *
 * Only the person's central outline is measured: in each row, the run of
 * foreground pixels through the body's centre line. Stray specks the model
 * picks up from a textured wall therefore can't inflate the widths. Walking
 * down from the crown, the head ends where the outline narrows to the neck;
 * if no shoulders are visible, the head height is inferred from its width.
 * Returns null when there is no subject.
 */
export function estimateHead(alpha: ArrayLike<number>, size: number, aspect: number, threshold = 128): HeadEstimate | null {
  const on = (x: number, y: number) => alpha[y * size + x] >= threshold;

  // The body's centre line: the median column of all foreground pixels.
  const columnCounts = new Array<number>(size).fill(0);
  let total = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (on(x, y)) {
        columnCounts[x]++;
        total++;
      }
    }
  }
  if (total === 0) return null;
  let center = 0;
  for (let seen = 0; center < size; center++) {
    seen += columnCounts[center];
    if (seen >= total / 2) break;
  }

  // Per row, the foreground run through (or nearest to) the centre line.
  const reach = Math.round(size * 0.1);
  const runs = Array.from({ length: size }, (_, y) => {
    let start = -1;
    for (let d = 0; d <= reach && start === -1; d++) {
      if (center - d >= 0 && on(center - d, y)) start = center - d;
      else if (center + d < size && on(center + d, y)) start = center + d;
    }
    if (start === -1) return { left: -1, right: -1 };
    let left = start;
    let right = start;
    while (left > 0 && on(left - 1, y)) left--;
    while (right < size - 1 && on(right + 1, y)) right++;
    return { left, right };
  });

  const widthAt = (y: number) => (runs[y].left === -1 ? 0 : runs[y].right - runs[y].left + 1);
  // Mask rows/columns are stretched differently; widths are converted to "row units" to compare with heights.
  const realWidth = (y: number) => widthAt(y) * aspect;

  // The crown: the first row starting a connected stretch of outline (≈2% of the height), not a lone speck.
  const minWidth = size * 0.03;
  const streak = Math.max(4, Math.round(size * 0.02));
  const connected = (y: number) => runs[y].left <= runs[y - 1].right && runs[y].right >= runs[y - 1].left;
  const top = runs.findIndex((_, y) => {
    if (y + streak >= size) return false;
    for (let d = 0; d < streak; d++) {
      if (widthAt(y + d) < minWidth || (d > 0 && !connected(y + d))) return false;
    }
    return true;
  });
  if (top === -1) return null;

  // Head width is only measured over the head itself: it stops growing once the outline narrows
  // into the neck, or once we're further down than a head is tall. Otherwise gradually widening
  // shoulders would be mistaken for an ever-wider head.
  let headWidth = 0;
  let widest = top;
  let narrowed = false;
  let shoulders = -1;
  for (let y = top; y < size; y++) {
    const w = realWidth(y);
    const inHead = !narrowed && (y - top <= headWidth || headWidth === 0);
    if (inHead) {
      if (w > headWidth) {
        headWidth = w;
        widest = y;
      }
      continue;
    }
    if (w < headWidth * 0.8) narrowed = true;
    if (w > headWidth * 1.45) {
      shoulders = y;
      break;
    }
  }
  if (headWidth === 0) return null;

  let chin = top + headWidth * 1.35;
  const neckEnd = shoulders === -1 ? size : shoulders;
  let neck = Infinity;
  for (let y = widest; y < neckEnd; y++) neck = Math.min(neck, realWidth(y));
  if (neck < headWidth * 0.8) {
    // The chin is where the face has narrowed to (about) the neck's width.
    const below = runs.findIndex((_, y) => y > widest && y < neckEnd && realWidth(y) <= neck * 1.15);
    if (below !== -1) chin = below;
  } else if (shoulders !== -1) {
    // No visible neck (collar, long hair): the head ends a little above the shoulders.
    chin = shoulders - headWidth * 0.1;
  }
  // Keep the proportions human: a head is roughly 1.15–1.6 times taller than it is wide.
  chin = Math.min(Math.max(chin, top + headWidth * 1.15), top + headWidth * 1.6, size);

  let centerSum = 0;
  let centerRows = 0;
  for (let y = top; y < chin; y++) {
    if (runs[y].left === -1) continue;
    centerSum += (runs[y].left + runs[y].right) / 2;
    centerRows++;
  }

  return {
    top: top / size,
    chin: chin / size,
    centerX: centerRows ? centerSum / centerRows / size : center / size,
  };
}

/**
 * Framing that puts an estimated head at the middle of the allowed size, with
 * the crown at the spec's margin. Without an estimate, the photo just covers the frame.
 */
export function initialFraming(head: HeadEstimate | null, image: { width: number; height: number }, spec: PhotoSpec): Framing {
  if (!head || head.chin <= head.top) {
    const mmPerPx = Math.max(spec.widthMm / image.width, spec.heightMm / image.height);
    return { mmPerPx, centerX: image.width / 2, centerY: image.height / 2 };
  }
  const targetHeadMm = (spec.headMm[0] + spec.headMm[1]) / 2;
  const mmPerPx = targetHeadMm / ((head.chin - head.top) * image.height);
  const frameTopPx = head.top * image.height - spec.crownMarginMm / mmPerPx;
  return {
    mmPerPx,
    centerX: head.centerX * image.width,
    centerY: frameTopPx + spec.heightMm / 2 / mmPerPx,
  };
}

/** Estimated head height in mm for the current framing. */
export const headHeightMm = (head: HeadEstimate, imageHeight: number, framing: Framing) =>
  (head.chin - head.top) * imageHeight * framing.mmPerPx;

/** How many photos fit in one direction of a sheet. */
const fit = (sheetMm: number, photoMm: number, gapMm: number, marginMm: number) =>
  Math.max(0, Math.floor((sheetMm - marginMm * 2 + gapMm) / (photoMm + gapMm)));

/**
 * Lays out as many photos as fit on a sheet, trying both orientations of the
 * sheet, and centres the grid. Pure function.
 */
export function layoutSheet(
  sheet: { widthMm: number; heightMm: number },
  photo: { widthMm: number; heightMm: number },
  gapMm: number,
  marginMm: number,
): SheetLayout {
  const options = [sheet, { widthMm: sheet.heightMm, heightMm: sheet.widthMm }].map((s) => {
    const cols = fit(s.widthMm, photo.widthMm, gapMm, marginMm);
    const rows = fit(s.heightMm, photo.heightMm, gapMm, marginMm);
    return { sheet: s, cols, rows, count: cols * rows };
  });
  // Prefer more photos; on a tie keep the original (portrait) orientation.
  const best = options[1].count > options[0].count ? options[1] : options[0];

  const gridWidth = best.cols * photo.widthMm + Math.max(0, best.cols - 1) * gapMm;
  const gridHeight = best.rows * photo.heightMm + Math.max(0, best.rows - 1) * gapMm;
  const left = (best.sheet.widthMm - gridWidth) / 2;
  const top = (best.sheet.heightMm - gridHeight) / 2;

  const positions: SheetLayout["positions"] = [];
  for (let row = 0; row < best.rows; row++) {
    for (let col = 0; col < best.cols; col++) {
      positions.push({ x: left + col * (photo.widthMm + gapMm), y: top + row * (photo.heightMm + gapMm) });
    }
  }
  return { widthMm: best.sheet.widthMm, heightMm: best.sheet.heightMm, positions };
}
