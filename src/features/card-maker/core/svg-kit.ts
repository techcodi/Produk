import { escapeXml, wrapLines } from "@/lib/svg";
import { encodeQr, matrixToSvg } from "@/lib/qr";
import type { MeasureFactory } from "../types";

/** Building blocks shared by the designs. All units are millimetres (the SVG viewBox is the card in mm). */

export interface TextStyle {
  size: number;
  family: string;
  color: string;
  weight?: number;
  italic?: boolean;
  anchor?: "start" | "middle" | "end";
  lineHeight?: number;
  letterSpacing?: number;
  uppercase?: boolean;
  maxLines?: number;
}

export interface Block {
  svg: string;
  height: number;
}

const EMPTY: Block = { svg: "", height: 0 };

/**
 * Word-wrapped text whose first line's top sits at `y`. `x` is the left edge,
 * centre or right edge depending on `anchor`. Returns the markup and its height.
 */
export function textBlock(text: string | undefined, x: number, y: number, width: number, style: TextStyle, measure: MeasureFactory): Block {
  const content = (style.uppercase ? text?.toUpperCase() : text)?.trim();
  if (!content) return EMPTY;
  const weight = style.weight ?? 400;
  const baseMeasure = measure(style.family, style.size, weight);
  // Letter spacing widens every character, so measure with it included.
  const spacing = style.letterSpacing ?? 0;
  const measureText = spacing ? (t: string) => baseMeasure(t) + spacing * t.length : baseMeasure;
  const lines = wrapLines(content, width, measureText, style.maxLines);
  const lineHeight = style.size * (style.lineHeight ?? 1.25);
  const attrs = [
    `font-family="${escapeXml(style.family)}"`,
    `font-size="${round(style.size)}"`,
    `font-weight="${weight}"`,
    `fill="${style.color}"`,
    `text-anchor="${style.anchor ?? "start"}"`,
    style.italic ? `font-style="italic"` : "",
    spacing ? `letter-spacing="${round(spacing)}"` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const svg = lines
    .map((line, i) => `<text x="${round(x)}" y="${round(y + style.size * 0.8 + i * lineHeight)}" ${attrs}>${escapeXml(line)}</text>`)
    .join("");
  return { svg, height: lines.length * lineHeight };
}

/**
 * Stacks blocks vertically from `top`, with `gap` between non-empty ones.
 * Returns the markup and the y where the stack ends.
 */
export function stack(top: number, gap: number, makers: ((y: number) => Block)[]): { svg: string; bottom: number } {
  let y = top;
  let svg = "";
  for (const make of makers) {
    const block = make(y);
    if (!block.height) continue;
    svg += block.svg;
    y += block.height + gap;
  }
  return { svg, bottom: y - gap };
}

/** Like `stack`, but centres the whole stack vertically between `top` and `bottom`. */
export function centredStack(top: number, bottom: number, gap: number, makers: ((y: number) => Block)[]): string {
  const measured = stack(0, gap, makers);
  const height = Math.max(0, measured.bottom);
  const start = top + Math.max(0, (bottom - top - height) / 2);
  return stack(start, gap, makers).svg;
}

/** A photo cropped to fill the box (and clipped to a circle or rounded rectangle). */
export function photo(id: string, href: string, x: number, y: number, w: number, h: number, shape: "rect" | "circle" = "rect", radius = 0): string {
  const clip =
    shape === "circle"
      ? `<circle cx="${round(x + w / 2)}" cy="${round(y + h / 2)}" r="${round(Math.min(w, h) / 2)}"/>`
      : `<rect x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(h)}" rx="${round(radius)}"/>`;
  return (
    `<clipPath id="${id}">${clip}</clipPath>` +
    `<image href="${href}" x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(h)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>`
  );
}

/** A QR code drawn in a square at (x, y). Empty when there's no text or it doesn't fit in a QR code. */
export function qrCode(text: string | undefined, x: number, y: number, size: number, foreground = "#111827", background = "#ffffff"): string {
  if (!text?.trim()) return "";
  try {
    const svg = matrixToSvg(encodeQr(text.trim(), "M"), { foreground, background, margin: 2 });
    return svg.replace("<svg ", `<svg x="${round(x)}" y="${round(y)}" width="${round(size)}" height="${round(size)}" `);
  } catch {
    return "";
  }
}

/** Two-letter initials for a placeholder avatar. */
export const initials = (name: string | undefined) =>
  (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");

export const round = (n: number) => Math.round(n * 100) / 100;

export const svgDocument = (width: number, height: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}mm" height="${height}mm">${body}</svg>`;

/** Deterministic pseudo-random numbers, so the same card always renders the same confetti. */
export function seeded(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}
