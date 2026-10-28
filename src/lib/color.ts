const channels = (hex: string) => [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16));

const toHex = (values: number[]) => `#${values.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

export const isHexColor = (value: unknown): value is string => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);

/** Mixes `hex` with white: `amount` 0 = white, 1 = the colour itself. */
export const tint = (hex: string, amount: number) => toHex(channels(hex).map((v) => 255 - (255 - v) * amount));

/** Mixes `hex` with black: `amount` 0 = the colour itself, 1 = black. */
export const shade = (hex: string, amount: number) => toHex(channels(hex).map((v) => v * (1 - amount)));

/** WCAG relative luminance, 0 (black) to 1 (white). */
function luminance(hex: string) {
  const [r, g, b] = channels(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * White or near-black for text on `hex`. Leans towards white (it's what people
 * expect on brand colours) while keeping at least 3:1 contrast — fine for the
 * bold, larger text that sits on accent fills.
 */
export const readableOn = (hex: string) => (luminance(hex) > 0.3 ? "#111827" : "#ffffff");
