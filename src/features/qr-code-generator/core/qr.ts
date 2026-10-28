import type { WifiDetails } from "../types";

/** Escapes the characters the Wi-Fi QR format reserves: \ ; , : " */
const escapeWifi = (value: string) => value.replace(/([\\;,:"])/g, "\\$1");

/**
 * The de-facto Wi-Fi QR format understood by iOS and Android cameras:
 * `WIFI:T:WPA;S:<ssid>;P:<password>;H:true;;`
 */
export function wifiPayload({ ssid, password, security, hidden }: WifiDetails): string {
  const parts = [`T:${security}`, `S:${escapeWifi(ssid)}`];
  if (security !== "nopass") parts.push(`P:${escapeWifi(password)}`);
  if (hidden) parts.push("H:true");
  return `WIFI:${parts.join(";")};;`;
}

const luminance = (hex: string) => {
  const value = Number.parseInt(hex.replace("#", "").slice(0, 6), 16);
  const channel = (shift: number) => {
    const c = ((value >> shift) & 255) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(16) + 0.7152 * channel(8) + 0.0722 * channel(0);
};

/** WCAG contrast ratio between two hex colours (1–21). */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** Many scanners only read dark codes on light backgrounds. */
export const isInverted = (foreground: string, background: string) => luminance(foreground) > luminance(background);
