import { shade, tint } from "@/lib/color";
import { INK, SOFT_INK, type Design, type DesignContext } from "./design-context";
import { initials, photo, round, textBlock } from "./svg-kit";

// Club/gym-style cards only: no chip, no card-number formatting, no payment or official-ID styling.

/** Photo, or initials on a tinted disc when there's no photo. */
function avatar(ctx: DesignContext, x: number, y: number, size: number, shape: "circle" | "rect", ring: string): string {
  const { f, family, measure, accent } = ctx;
  if (ctx.photo) {
    const frame =
      shape === "circle"
        ? `<circle cx="${round(x + size / 2)}" cy="${round(y + size / 2)}" r="${round(size / 2 + 0.5)}" fill="${ring}"/>`
        : `<rect x="${round(x - 0.5)}" y="${round(y - 0.5)}" width="${round(size + 1)}" height="${round(size + 1)}" rx="1.5" fill="${ring}"/>`;
    return frame + photo("member-photo", ctx.photo, x, y, size, size, shape, 1.2);
  }
  const text = initials(f("member"));
  return (
    `<circle cx="${round(x + size / 2)}" cy="${round(y + size / 2)}" r="${round(size / 2)}" fill="${tint(accent, 0.3)}"/>` +
    textBlock(text, x + size / 2, y + size / 2 - size * 0.18, size, { size: size * 0.32, family, color: shade(accent, 0.3), weight: 700, anchor: "middle" }, measure).svg
  );
}

/** "Member no." and "Valid until" side by side at the bottom. */
function footer(ctx: DesignContext, x: number, y: number, width: number, labelColor: string, valueColor: string): string {
  const { f, family, measure, h } = ctx;
  const columns = [
    ["Member no.", f("memberNumber")],
    ["Valid until", f("validUntil")],
  ].filter(([, value]) => value);
  const colWidth = width / 2;
  return columns
    .map(([label, value], i) => {
      const cx = x + i * colWidth;
      return (
        textBlock(label, cx, y, colWidth - 2, { size: h * 0.055, family, color: labelColor, weight: 700, uppercase: true, letterSpacing: 0.25 }, measure).svg +
        textBlock(value, cx, y + h * 0.08, colWidth - 2, { size: h * 0.08, family, color: valueColor, weight: 600, maxLines: 1 }, measure).svg
      );
    })
    .join("");
}

const club: Design = (ctx) => {
  const { w, h, accent, onAccent, f, family, measure } = ctx;
  const pad = w * 0.065;
  const photoSize = h * 0.42;
  const textWidth = w - pad * 3 - photoSize;
  const muted = onAccent === "#ffffff" ? "rgba(255,255,255,0.75)" : "rgba(17,24,39,0.7)";
  return (
    `<defs><linearGradient id="club-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${accent}"/><stop offset="1" stop-color="${shade(accent, 0.35)}"/></linearGradient></defs>` +
    `<rect width="${w}" height="${h}" rx="3" fill="url(#club-bg)"/>` +
    `<circle cx="${round(w * 1.02)}" cy="${round(h * -0.1)}" r="${round(h * 0.55)}" fill="${onAccent}" opacity="0.08"/>` +
    textBlock(f("organisation"), pad, pad, textWidth, { size: h * 0.085, family, color: onAccent, weight: 700, maxLines: 2, lineHeight: 1.1 }, measure).svg +
    textBlock("Member", pad, h * 0.38, textWidth, { size: h * 0.055, family, color: muted, weight: 700, uppercase: true, letterSpacing: 0.35 }, measure).svg +
    textBlock(f("member"), pad, h * 0.45, textWidth, { size: h * 0.11, family, color: onAccent, weight: 700, maxLines: 2, lineHeight: 1.05 }, measure).svg +
    footer(ctx, pad, h * 0.74, w - pad * 2, muted, onAccent) +
    avatar(ctx, w - pad - photoSize, pad, photoSize, "circle", onAccent)
  );
};

const minimal: Design = (ctx) => {
  const { w, h, accent, f, family, measure } = ctx;
  const pad = w * 0.07;
  const bar = w * 0.035;
  const photoSize = h * 0.46;
  const left = bar + pad;
  const textWidth = w - left - pad * 2 - photoSize;
  return (
    `<rect width="${w}" height="${h}" rx="3" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.3"/>` +
    `<path d="M3 0H${round(bar)}V${h}H3A3 3 0 0 1 0 ${h - 3}V3A3 3 0 0 1 3 0Z" fill="${accent}"/>` +
    textBlock(f("organisation"), left, pad, textWidth, { size: h * 0.075, family, color: accent, weight: 700, uppercase: true, letterSpacing: 0.3, maxLines: 2 }, measure).svg +
    textBlock(f("member"), left, h * 0.36, textWidth, { size: h * 0.11, family, color: INK, weight: 700, maxLines: 2, lineHeight: 1.05 }, measure).svg +
    textBlock("Member", left, h * 0.58, textWidth, { size: h * 0.055, family, color: SOFT_INK, uppercase: true, letterSpacing: 0.35 }, measure).svg +
    footer(ctx, left, h * 0.74, w - left - pad, SOFT_INK, INK) +
    avatar(ctx, w - pad - photoSize, pad, photoSize, "rect", "#e5e7eb")
  );
};

export const MEMBERSHIP_DESIGNS: Record<string, Design> = { club, minimal };
