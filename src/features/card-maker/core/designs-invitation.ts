import { tint } from "@/lib/color";
import { INK, PAPER, SOFT_INK, type Design, type DesignContext } from "./design-context";
import { centredStack, photo, round, stack, textBlock, type Block } from "./svg-kit";

/** The when/where/RSVP lines every invitation shows, centred. */
function details(ctx: DesignContext, cx: number, width: number, size: number, labelColor: string): ((y: number) => Block)[] {
  const { f, family, measure } = ctx;
  const when = [f("date"), f("time")].filter(Boolean).join(" · ");
  return [
    (y) => textBlock(when, cx, y, width, { size: size * 1.1, family, color: INK, weight: 700, anchor: "middle", maxLines: 2 }, measure),
    (y) => textBlock(f("venue"), cx, y, width, { size, family, color: SOFT_INK, anchor: "middle", lineHeight: 1.35, maxLines: 3 }, measure),
    (y) => textBlock(f("rsvp"), cx, y, width, { size: size * 0.85, family, color: labelColor, anchor: "middle", italic: true, maxLines: 2 }, measure),
  ];
}

const classic: Design = (ctx) => {
  const { w, h, accent, f, family, measure } = ctx;
  const base = Math.min(w, h);
  const m = base * 0.06;
  const cx = w / 2;
  const width = w * 0.74;
  return (
    `<rect width="${w}" height="${h}" fill="${PAPER}"/>` +
    `<rect x="${round(m)}" y="${round(m)}" width="${round(w - m * 2)}" height="${round(h - m * 2)}" fill="none" stroke="${accent}" stroke-width="0.5"/>` +
    centredStack(m * 2, h - m * 2, base * 0.045, [
      (y) => textBlock(f("title"), cx, y, width, { size: base * 0.04, family, color: accent, weight: 700, anchor: "middle", uppercase: true, letterSpacing: base * 0.006, maxLines: 2 }, measure),
      (y) => textBlock(f("host"), cx, y, width, { size: base * 0.09, family, color: INK, anchor: "middle", lineHeight: 1.15, maxLines: 3 }, measure),
      (y) => ({ svg: `<path d="M${round(cx - w * 0.12)} ${round(y + 1)}H${round(cx + w * 0.12)}" stroke="${accent}" stroke-width="0.4"/>`, height: 2 }),
      (y) => textBlock(f("message"), cx, y, width, { size: base * 0.038, family, color: SOFT_INK, anchor: "middle", lineHeight: 1.45, maxLines: 5 }, measure),
      ...details(ctx, cx, width, base * 0.04, accent),
    ])
  );
};

const modern: Design = (ctx) => {
  const { w, h, accent, onAccent, f, family, measure } = ctx;
  const base = Math.min(w, h);
  const band = h * 0.4;
  const pad = w * 0.09;
  const width = w - pad * 2;
  const top = stack(band * 0.28, base * 0.03, [
    (y) => textBlock(f("title"), pad, y, width, { size: base * 0.035, family, color: onAccent, weight: 700, uppercase: true, letterSpacing: base * 0.005, maxLines: 1 }, measure),
    (y) => textBlock(f("host"), pad, y, width, { size: base * 0.095, family, color: onAccent, weight: 700, lineHeight: 1.08, maxLines: 3 }, measure),
  ]);
  const label = (text: string, y: number) =>
    textBlock(text, pad, y, width, { size: base * 0.028, family, color: accent, weight: 700, uppercase: true, letterSpacing: base * 0.004 }, measure);
  const when = [f("date"), f("time")].filter(Boolean).join(" · ");
  const body = stack(band + h * 0.07, base * 0.025, [
    (y) => textBlock(f("message"), pad, y, width, { size: base * 0.04, family, color: SOFT_INK, lineHeight: 1.45, maxLines: 4 }, measure),
    (y) => (when ? label("When", y + base * 0.02) : { svg: "", height: 0 }),
    (y) => textBlock(when, pad, y, width, { size: base * 0.045, family, color: INK, weight: 700, maxLines: 2 }, measure),
    (y) => (f("venue") ? label("Where", y + base * 0.02) : { svg: "", height: 0 }),
    (y) => textBlock(f("venue"), pad, y, width, { size: base * 0.042, family, color: INK, lineHeight: 1.35, maxLines: 3 }, measure),
  ]);
  const rsvp = textBlock(f("rsvp"), pad, h - pad - base * 0.04, width, { size: base * 0.034, family, color: SOFT_INK, italic: true, maxLines: 1 }, measure);
  return (
    `<rect width="${w}" height="${h}" fill="#ffffff"/>` +
    `<rect width="${w}" height="${round(band)}" fill="${accent}"/>` +
    `<circle cx="${round(w * 0.92)}" cy="${round(band * 0.12)}" r="${round(base * 0.22)}" fill="${tint(accent, 0.75)}" opacity="0.25"/>` +
    top.svg +
    body.svg +
    rsvp.svg
  );
};

const photoInvite: Design = (ctx) => {
  const { w, h, accent, f, family, measure } = ctx;
  const base = Math.min(w, h);
  const photoHeight = h * 0.42;
  const cx = w / 2;
  const width = w * 0.8;
  const picture = ctx.photo
    ? photo("invite-photo", ctx.photo, 0, 0, w, photoHeight)
    : `<rect width="${w}" height="${round(photoHeight)}" fill="${tint(accent, 0.3)}"/>`;
  return (
    `<rect width="${w}" height="${h}" fill="${PAPER}"/>` +
    picture +
    centredStack(photoHeight + h * 0.03, h * 0.97, base * 0.035, [
      (y) => textBlock(f("title"), cx, y, width, { size: base * 0.035, family, color: accent, weight: 700, anchor: "middle", uppercase: true, letterSpacing: base * 0.005, maxLines: 1 }, measure),
      (y) => textBlock(f("host"), cx, y, width, { size: base * 0.08, family, color: INK, anchor: "middle", lineHeight: 1.12, maxLines: 2 }, measure),
      ...details(ctx, cx, width, base * 0.037, accent),
    ])
  );
};

export const INVITATION_DESIGNS: Record<string, Design> = { classic, modern, photo: photoInvite };
