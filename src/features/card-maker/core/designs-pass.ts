import { tint } from "@/lib/color";
import { INK, SOFT_INK, type Design, type DesignContext } from "./design-context";
import { qrCode, round, stack, textBlock, type Block } from "./svg-kit";

/** A small uppercase label above a value. */
function field(ctx: DesignContext, label: string, value: string, x: number, width: number, size: number): (y: number) => Block {
  const { family, measure, accent } = ctx;
  return (y) => {
    if (!value) return { svg: "", height: 0 };
    const head = textBlock(label, x, y, width, { size: size * 0.62, family, color: accent, weight: 700, uppercase: true, letterSpacing: size * 0.08 }, measure);
    const body = textBlock(value, x, y + head.height + size * 0.15, width, { size, family, color: INK, weight: 600, maxLines: 2 }, measure);
    return { svg: head.svg + body.svg, height: head.height + size * 0.15 + body.height };
  };
}

const ticket: Design = (ctx) => {
  const { w, h, accent, onAccent, f, family, measure } = ctx;
  const stubX = w * 0.7;
  const pad = w * 0.05;
  const header = h * 0.3;
  const mainWidth = stubX - pad * 2;
  const stubWidth = w - stubX - pad * 1.2;
  const qrSize = Math.min(stubWidth, h * 0.42);
  const qr = qrCode(f("qr"), stubX + (w - stubX - qrSize) / 2, h * 0.38, qrSize);
  const notch = h * 0.06;

  const main = stack(header + h * 0.08, h * 0.05, [
    field(ctx, "Attendee", f("attendee"), pad, mainWidth, h * 0.075),
    field(ctx, "Date", f("date"), pad, mainWidth, h * 0.055),
    field(ctx, "Venue", f("venue"), pad, mainWidth, h * 0.055),
  ]);
  const stubTop = textBlock(f("zone") || "Admit one", stubX + (w - stubX) / 2, h * 0.12, stubWidth, { size: h * 0.055, family, color: accent, weight: 700, anchor: "middle", uppercase: true, maxLines: 2 }, measure);

  return (
    `<rect width="${w}" height="${h}" fill="#ffffff"/>` +
    `<rect width="${round(stubX)}" height="${round(header)}" fill="${accent}"/>` +
    textBlock(f("event"), pad, header * 0.22, mainWidth, { size: h * 0.085, family, color: onAccent, weight: 700, lineHeight: 1.1, maxLines: 2 }, measure).svg +
    main.svg +
    `<rect x="${round(stubX)}" width="${round(w - stubX)}" height="${h}" fill="${tint(accent, 0.1)}"/>` +
    // Perforation: a dashed line with half-circle notches at each end.
    `<path d="M${round(stubX)} ${round(notch)}V${round(h - notch)}" stroke="${SOFT_INK}" stroke-width="0.35" stroke-dasharray="1.6 1.6"/>` +
    `<circle cx="${round(stubX)}" cy="0" r="${round(notch)}" fill="#e5e7eb"/><circle cx="${round(stubX)}" cy="${h}" r="${round(notch)}" fill="#e5e7eb"/>` +
    stubTop.svg +
    (qr ||
      textBlock("Present this pass at the entrance", stubX + (w - stubX) / 2, h * 0.5, stubWidth, { size: h * 0.04, family, color: SOFT_INK, anchor: "middle", maxLines: 4 }, measure).svg)
  );
};

const badge: Design = (ctx) => {
  const { w, h, accent, onAccent, f, family, measure } = ctx;
  const pad = w * 0.06;
  const band = h * 0.32;
  const qrSize = h * 0.42;
  const hasQr = Boolean(qrCode(f("qr"), 0, 0, 1));
  const textWidth = w - pad * 2 - (hasQr ? qrSize + pad : 0);
  const info = [f("date"), f("venue")].filter(Boolean).join("  ·  ");
  const body = stack(band + h * 0.08, h * 0.035, [
    (y) => textBlock(f("attendee"), pad, y, textWidth, { size: h * 0.095, family, color: INK, weight: 700, lineHeight: 1.05, maxLines: 2 }, measure),
    (y) => textBlock(f("zone"), pad, y, textWidth, { size: h * 0.055, family, color: accent, weight: 700, uppercase: true, letterSpacing: h * 0.004, maxLines: 1 }, measure),
  ]);
  // Date and venue sit on the bottom edge, wrapping upwards onto a second line if needed.
  const infoStyle = { size: h * 0.042, family, color: SOFT_INK, maxLines: 2 };
  const infoHeight = textBlock(info, 0, 0, textWidth, infoStyle, measure).height;
  return (
    `<rect width="${w}" height="${h}" fill="#ffffff"/>` +
    `<rect width="${w}" height="${round(band)}" fill="${accent}"/>` +
    textBlock(f("event"), pad, band * 0.24, w - pad * 2, { size: h * 0.085, family, color: onAccent, weight: 700, lineHeight: 1.1, maxLines: 2 }, measure).svg +
    body.svg +
    textBlock(info, pad, h - pad * 0.8 - infoHeight, textWidth, infoStyle, measure).svg +
    qrCode(f("qr"), w - pad - qrSize, band + (h - band - qrSize) / 2, qrSize)
  );
};

export const PASS_DESIGNS: Record<string, Design> = { ticket, badge };
