import { tint } from "@/lib/color";
import { INK, PAPER, SOFT_INK, type Design, type DesignContext } from "./design-context";
import { centredStack, photo, round, seeded, textBlock } from "./svg-kit";

/** Headline, message and sign-off, centred in the band between `top` and `bottom`. */
function greetingText(ctx: DesignContext, top: number, bottom: number, colors: { headline: string; body: string }) {
  const { w, f, family, measure } = ctx;
  const width = w * 0.78;
  const cx = w / 2;
  const base = Math.min(w, ctx.h);
  return centredStack(top, bottom, base * 0.05, [
    (y) => textBlock(f("headline"), cx, y, width, { size: base * 0.11, family, color: colors.headline, weight: 700, anchor: "middle", lineHeight: 1.1, maxLines: 3 }, measure),
    (y) => textBlock(f("message"), cx, y, width, { size: base * 0.045, family, color: colors.body, anchor: "middle", lineHeight: 1.45, maxLines: 9 }, measure),
    (y) => textBlock(f("signoff"), cx, y, width, { size: base * 0.05, family, color: colors.headline, italic: true, anchor: "middle", maxLines: 2 }, measure),
  ]);
}

const confetti: Design = (ctx) => {
  const { w, h, accent } = ctx;
  const random = seeded(Math.round(w * 1000 + h));
  const colors = [accent, tint(accent, 0.55), "#f59e0b", "#38bdf8", "#a3e635"];
  let pieces = "";
  for (let i = 0; i < 46; i++) {
    // Keep the middle clear for the text: scatter along the top and bottom bands.
    const band = i % 3 === 2 ? [h * 0.86, h * 0.98] : [h * 0.02, h * 0.24];
    const x = random() * w;
    const y = band[0] + random() * (band[1] - band[0]);
    const size = Math.min(w, h) * (0.012 + random() * 0.02);
    const color = colors[Math.floor(random() * colors.length)];
    const angle = Math.round(random() * 180);
    pieces +=
      i % 2
        ? `<circle cx="${round(x)}" cy="${round(y)}" r="${round(size / 2)}" fill="${color}"/>`
        : `<rect x="${round(x)}" y="${round(y)}" width="${round(size)}" height="${round(size * 0.45)}" rx="${round(size * 0.1)}" fill="${color}" transform="rotate(${angle} ${round(x)} ${round(y)})"/>`;
  }
  return (
    `<rect width="${w}" height="${h}" fill="${tint(accent, 0.1)}"/>` +
    pieces +
    greetingText(ctx, h * 0.26, h * 0.84, { headline: accent, body: INK })
  );
};

const elegant: Design = (ctx) => {
  const { w, h, accent } = ctx;
  const m = Math.min(w, h) * 0.05;
  const ornamentY = h * 0.17;
  return (
    `<rect width="${w}" height="${h}" fill="${PAPER}"/>` +
    `<rect x="${round(m)}" y="${round(m)}" width="${round(w - m * 2)}" height="${round(h - m * 2)}" fill="none" stroke="${accent}" stroke-width="0.6"/>` +
    `<rect x="${round(m * 1.4)}" y="${round(m * 1.4)}" width="${round(w - m * 2.8)}" height="${round(h - m * 2.8)}" fill="none" stroke="${accent}" stroke-width="0.25"/>` +
    // A small diamond flanked by rules.
    `<path d="M${round(w / 2)} ${round(ornamentY - 2.2)}l2.2 2.2l-2.2 2.2l-2.2 -2.2z" fill="${accent}"/>` +
    `<path d="M${round(w * 0.3)} ${round(ornamentY)}H${round(w / 2 - 4)}M${round(w / 2 + 4)} ${round(ornamentY)}H${round(w * 0.7)}" stroke="${accent}" stroke-width="0.3"/>` +
    greetingText(ctx, h * 0.22, h * 0.88, { headline: accent, body: SOFT_INK })
  );
};

const photoCard: Design = (ctx) => {
  const { w, h, accent } = ctx;
  const photoHeight = h * (w / h > 0.9 ? 0.5 : 0.55);
  const picture = ctx.photo
    ? photo("card-photo", ctx.photo, 0, 0, w, photoHeight)
    : // Without a photo, a soft gradient keeps the layout looking intentional.
      `<defs><linearGradient id="ph" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${accent}"/><stop offset="1" stop-color="${tint(accent, 0.45)}"/></linearGradient></defs>` +
      `<rect width="${w}" height="${round(photoHeight)}" fill="url(#ph)"/>`;
  return (
    `<rect width="${w}" height="${h}" fill="#ffffff"/>` +
    picture +
    `<rect y="${round(photoHeight)}" width="${w}" height="1.2" fill="${accent}"/>` +
    greetingText(ctx, photoHeight + h * 0.04, h * 0.96, { headline: accent, body: INK })
  );
};

export const GREETING_DESIGNS: Record<string, Design> = { confetti, elegant, photo: photoCard };
