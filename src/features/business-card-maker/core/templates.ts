import { matrixToSvg } from "@/lib/qr";
import { escapeXml, wrapLines, type MeasureText } from "@/lib/svg";
import { CARD_SIZES, FONTS } from "../constants";
import type { CardDetails, CardStyle, TemplateId } from "../types";
import { readableOn, tint } from "@/lib/color";
import type { CardQr } from "./qr-content";
import { nestSvg } from "./svg-nest";
import { displayUrl } from "./vcard";

/** Returns a width measurer for text set in `family` at `size` mm. Injected so designs stay pure. */
export type Measurer = (family: string, size: number, weight: number) => MeasureText;

export interface CardInput {
  details: CardDetails;
  style: CardStyle;
  qr: CardQr | null;
  measure: Measurer;
}

const INK = "#111827";
const MUTED = "#6b7280";

interface TextOptions {
  size: number;
  fill: string;
  weight?: number;
  family?: string;
  anchor?: "start" | "middle" | "end";
  spacing?: number;
  opacity?: number;
}

/* ───────────────────────── drawing helpers (all units mm) ───────────────────────── */

function textEl(x: number, y: number, content: string, o: TextOptions): string {
  if (!content) return "";
  const attrs = [
    `x="${round(x)}"`,
    `y="${round(y)}"`,
    `font-family="${escapeXml(o.family ?? FONTS.sans)}"`,
    `font-size="${o.size}"`,
    `font-weight="${o.weight ?? 400}"`,
    `fill="${o.fill}"`,
    o.anchor && o.anchor !== "start" ? `text-anchor="${o.anchor}"` : "",
    o.spacing ? `letter-spacing="${o.spacing}"` : "",
    o.opacity !== undefined ? `opacity="${o.opacity}"` : "",
  ].filter(Boolean);
  return `<text ${attrs.join(" ")}>${escapeXml(content)}</text>`;
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Truncates `text` with an ellipsis so it fits on one line of `maxWidth`. */
function fit(input: CardInput, text: string, maxWidth: number, o: TextOptions): string {
  const measure = input.measure(o.family ?? FONTS.sans, o.size, o.weight ?? 400);
  return wrapLines(text.trim(), maxWidth, measure, 1)[0] ?? "";
}

function logoEl(logo: string, x: number, y: number, w: number, h: number, align: "xMinYMid" | "xMidYMid" | "xMaxYMid" | "xMaxYMin"): string {
  return `<image href="${escapeXml(logo)}" x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(h)}" preserveAspectRatio="${align} meet"/>`;
}

/** Logo on a white rounded tile, so any logo reads on a coloured background. */
function logoTile(logo: string, cx: number, cy: number, w: number, h: number): string {
  const pad = Math.min(w, h) * 0.14;
  return (
    `<rect x="${round(cx - w / 2)}" y="${round(cy - h / 2)}" width="${round(w)}" height="${round(h)}" rx="1.6" fill="#ffffff"/>` +
    logoEl(logo, cx - w / 2 + pad, cy - h / 2 + pad, w - pad * 2, h - pad * 2, "xMidYMid")
  );
}

/** Phone, email, website and up to two address lines, in print order. */
function contactLines({ phone, email, website, address }: CardDetails): string[] {
  const addressLines = address.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 2);
  return [phone.trim(), email.trim(), displayUrl(website), ...addressLines].filter(Boolean);
}

interface ContactOptions {
  x: number;
  /** Baseline of the last line when `fromBottom`, else of the first. */
  y: number;
  maxWidth: number;
  fill: string;
  bullet?: string;
  bulletShape?: "dot" | "square";
  fromBottom?: boolean;
}

function contacts(input: CardInput, o: ContactOptions): string {
  const lines = contactLines(input.details);
  const step = 3.25;
  const size = 2.3;
  const indent = o.bullet ? 2 : 0;
  return lines
    .map((line, index) => {
      const y = o.fromBottom ? o.y - (lines.length - 1 - index) * step : o.y + index * step;
      const bullet = o.bullet
        ? o.bulletShape === "square"
          ? `<rect x="${round(o.x)}" y="${round(y - 1.35)}" width="0.9" height="0.9" fill="${o.bullet}"/>`
          : `<circle cx="${round(o.x + 0.45)}" cy="${round(y - 0.8)}" r="0.45" fill="${o.bullet}"/>`
        : "";
      return bullet + textEl(o.x + indent, y, fit(input, line, o.maxWidth - indent, { size, fill: o.fill }), { size, fill: o.fill });
    })
    .join("");
}

function initials(details: CardDetails): string {
  const source = details.company.trim() || details.name.trim();
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");
}

/* ───────────────────────────────── fronts ───────────────────────────────── */

type Side = (input: CardInput, w: number, h: number) => string;

const fronts: Record<TemplateId, Side> = {
  classic: (input, w, h) => {
    const { details, style } = input;
    const accent = style.accent;
    const maxWidth = w - 14 - (style.logo ? 24 : 0);
    return [
      `<rect width="${w}" height="${h}" fill="#ffffff"/>`,
      `<rect width="2" height="${h}" fill="${accent}"/>`,
      style.logo ? logoEl(style.logo, w - 28, 5, 22, 10, "xMaxYMin") : "",
      textEl(7, 13, fit(input, details.name, maxWidth, { size: 4.4, weight: 700, fill: INK }), { size: 4.4, weight: 700, fill: INK }),
      textEl(7, 17.6, fit(input, details.title, maxWidth, { size: 2.6, fill: accent }), { size: 2.6, fill: accent }),
      textEl(7, 21.4, fit(input, details.company, maxWidth, { size: 2.4, weight: 600, fill: MUTED }), { size: 2.4, weight: 600, fill: MUTED }),
      contacts(input, { x: 7, y: h - 5.5, maxWidth: w - 13, fill: INK, bullet: accent, fromBottom: true }),
    ].join("");
  },

  modern: (input, w, h) => {
    const { details, style } = input;
    const band = h * 0.38;
    const on = readableOn(style.accent);
    return [
      `<rect width="${w}" height="${h}" fill="#ffffff"/>`,
      `<rect width="${w}" height="${round(band)}" fill="${style.accent}"/>`,
      textEl(6, band * 0.5 + 0.6, fit(input, details.name, w - 12, { size: 4.4, weight: 700, fill: on }), { size: 4.4, weight: 700, fill: on }),
      textEl(6, band * 0.5 + 5, fit(input, [details.title, details.company].filter((s) => s.trim()).join(" · "), w - 12, { size: 2.4, fill: on }), {
        size: 2.4,
        fill: on,
        opacity: 0.88,
      }),
      style.logo ? logoEl(style.logo, w - 26, band + 4.5, 20, h - band - 9, "xMaxYMid") : "",
      contacts(input, { x: 6, y: band + 7.2, maxWidth: w - 12 - (style.logo ? 22 : 0), fill: INK, bullet: style.accent, bulletShape: "square" }),
    ].join("");
  },

  split: (input, w, h) => {
    const { details, style } = input;
    const panel = w * 0.36;
    const on = readableOn(style.accent);
    const x = panel + 5;
    const maxWidth = w - x - 4;
    return [
      `<rect width="${w}" height="${h}" fill="#ffffff"/>`,
      `<rect width="${round(panel)}" height="${h}" fill="${style.accent}"/>`,
      style.logo
        ? logoTile(style.logo, panel / 2, h / 2, panel * 0.72, h * 0.42)
        : textEl(panel / 2, h / 2 + 3, initials(details), { size: 9, weight: 700, fill: on, anchor: "middle" }),
      textEl(x, 13, fit(input, details.name, maxWidth, { size: 4, weight: 700, fill: INK }), { size: 4, weight: 700, fill: INK }),
      textEl(x, 17.4, fit(input, details.title, maxWidth, { size: 2.5, fill: style.accent }), { size: 2.5, fill: style.accent }),
      textEl(x, 21, fit(input, details.company, maxWidth, { size: 2.3, weight: 600, fill: MUTED }), { size: 2.3, weight: 600, fill: MUTED }),
      contacts(input, { x, y: h - 5.5, maxWidth, fill: INK, fromBottom: true }),
    ].join("");
  },

  bold: (input, w, h) => {
    const { details, style } = input;
    const on = readableOn(style.accent);
    const maxWidth = w - 12 - (style.logo ? 22 : 0);
    return [
      `<rect width="${w}" height="${h}" fill="${style.accent}"/>`,
      style.logo ? logoTile(style.logo, w - 15, 11.5, 18, 11) : "",
      textEl(6, 14, fit(input, details.name, maxWidth, { size: 5, weight: 800, fill: on }), { size: 5, weight: 800, fill: on }),
      textEl(6, 19, fit(input, details.title, maxWidth, { size: 2.6, fill: on }), { size: 2.6, fill: on, opacity: 0.85 }),
      contacts(input, { x: 6, y: h - 5.5, maxWidth: w - 12, fill: on, fromBottom: true }),
    ].join("");
  },

  minimal: (input, w, h) => {
    const { details, style } = input;
    const cx = w / 2;
    const top = style.logo ? h * 0.46 : h * 0.4;
    const line1 = [details.phone, details.email].map((s) => s.trim()).filter(Boolean).join("   ·   ");
    const line2 = [displayUrl(details.website), details.address.split(/\r?\n/)[0]?.trim() ?? ""].filter(Boolean).join("   ·   ");
    const small = { size: 2.15, fill: MUTED, anchor: "middle" as const };
    return [
      `<rect width="${w}" height="${h}" fill="#ffffff"/>`,
      style.logo ? logoEl(style.logo, cx - 10, 4.5, 20, 8, "xMidYMid") : "",
      textEl(cx, top, fit(input, details.name, w - 10, { size: 4.6, fill: INK, family: FONTS.serif }), { size: 4.6, fill: INK, family: FONTS.serif, anchor: "middle" }),
      textEl(cx, top + 4.4, fit(input, details.title.toUpperCase(), w - 10, { size: 2, fill: MUTED, spacing: 0.4 }), { size: 2, fill: MUTED, anchor: "middle", spacing: 0.4 }),
      `<rect x="${round(cx - 5)}" y="${round(top + 7)}" width="10" height="0.35" fill="${style.accent}"/>`,
      textEl(cx, h - 8.4, fit(input, line1, w - 8, small), small),
      textEl(cx, h - 4.8, fit(input, line2, w - 8, small), small),
    ].join("");
  },
};

/* ───────────────────────────────── back ───────────────────────────────── */

function back(input: CardInput, w: number, h: number): string {
  const { details, style, qr } = input;
  const light = style.template === "minimal";
  const bg = light ? tint(style.accent, 0.08) : style.accent;
  const on = light ? INK : readableOn(style.accent);
  const parts = [`<rect width="${w}" height="${h}" fill="${bg}"/>`];

  let centerX = w / 2;
  let areaWidth = w - 12;
  if (qr) {
    const tile = h * 0.6;
    const tx = w - 6 - tile;
    const ty = (h - tile) / 2 - 2;
    parts.push(`<rect x="${round(tx)}" y="${round(ty)}" width="${round(tile)}" height="${round(tile)}" rx="1.2" fill="#ffffff"/>`);
    parts.push(nestSvg(matrixToSvg(qr.matrix, { foreground: "#000000", background: "#ffffff", margin: 2 }), round(tx + 0.6), round(ty + 0.6), round(tile - 1.2), round(tile - 1.2)));
    const caption = qr.mode === "vcard" ? "Scan to save contact" : "Scan to visit website";
    parts.push(textEl(tx + tile / 2, ty + tile + 3.4, caption, { size: 1.9, fill: on, anchor: "middle", opacity: 0.85 }));
    areaWidth = tx - 10;
    centerX = 5 + areaWidth / 2;
  }

  const tagline = details.tagline.trim();
  const company = details.company.trim() || details.name.trim();
  const taglineLines = tagline ? wrapLines(tagline, areaWidth, input.measure(FONTS.sans, 2.3, 400), 2) : [];
  if (style.logo) {
    const logoHeight = h * 0.32;
    const logoY = h / 2 - (taglineLines.length ? 4 : 0);
    parts.push(light ? logoEl(style.logo, centerX - areaWidth * 0.4, logoY - logoHeight / 2, areaWidth * 0.8, logoHeight, "xMidYMid") : logoTile(style.logo, centerX, logoY, Math.min(areaWidth, 36), logoHeight));
    taglineLines.forEach((line, i) => parts.push(textEl(centerX, logoY + logoHeight / 2 + 4.6 + i * 3, line, { size: 2.3, fill: on, anchor: "middle" })));
  } else {
    // Largest size at which the name fits on two lines; only the smallest size truncates.
    const sizes = [4.6, 4, 3.4];
    let size = sizes[sizes.length - 1];
    let lines: string[] = [];
    for (const candidate of sizes) {
      size = candidate;
      lines = wrapLines(company, areaWidth, input.measure(FONTS.sans, candidate, 700), 2);
      if (!lines.at(-1)?.endsWith("…")) break;
    }
    const lineHeight = size * 1.2;
    const blockHeight = lines.length * lineHeight + (taglineLines.length ? 2 + taglineLines.length * 3 : 0);
    const first = h / 2 - blockHeight / 2 + size * 0.85;
    lines.forEach((line, i) => parts.push(textEl(centerX, first + i * lineHeight, line, { size, weight: 700, fill: on, anchor: "middle" })));
    const taglineTop = first + (lines.length - 1) * lineHeight + 5;
    taglineLines.forEach((line, i) => parts.push(textEl(centerX, taglineTop + i * 3, line, { size: 2.3, fill: on, anchor: "middle", opacity: 0.9 })));
  }
  return parts.join("");
}

/* ───────────────────────────────── public ───────────────────────────────── */

const wrap = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}">${body}</svg>`;

/** Front and back of the card as standalone SVG strings, in millimetres at the chosen card size. */
export function renderCard(input: CardInput): { front: string; back: string } {
  const { widthMm: w, heightMm: h } = CARD_SIZES[input.style.size];
  return { front: wrap(w, h, fronts[input.style.template](input, w, h)), back: wrap(w, h, back(input, w, h)) };
}
