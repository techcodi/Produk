import { encodeQr, QrTooLongError, type QrMatrix } from "@/lib/qr";
import type { CardDetails, QrMode } from "../types";
import { buildVcard, normalizeUrl } from "./vcard";

export interface CardQr {
  matrix: QrMatrix;
  /** What the code actually holds; differs from the requested mode after a fallback. */
  mode: Exclude<QrMode, "none">;
}

export interface QrResult {
  qr: CardQr | null;
  /** Explains a fallback or why nothing could be encoded. */
  notice: string | null;
}

/**
 * The QR code for the back of the card. "M" error correction keeps a full vCard
 * scannable at business-card size; if the vCard is still too long it falls back
 * to the website.
 */
export function buildCardQr(details: CardDetails, mode: QrMode): QrResult {
  if (mode === "none") return { qr: null, notice: null };
  const website = normalizeUrl(details.website);

  if (mode === "vcard") {
    if (!details.name.trim()) return { qr: null, notice: "Add your name to create a contact QR code." };
    try {
      return { qr: { matrix: encodeQr(buildVcard(details), "M"), mode: "vcard" }, notice: null };
    } catch (error) {
      if (!(error instanceof QrTooLongError)) throw error;
      if (!website) return { qr: null, notice: "Your contact details are too long for a QR code. Shorten the address, or use a website QR." };
      return { qr: { matrix: encodeQr(website, "M"), mode: "website" }, notice: "Your contact details were too long, so the QR code links to your website instead." };
    }
  }

  if (!website) return { qr: null, notice: "Add your website to create a website QR code." };
  return { qr: { matrix: encodeQr(website, "M"), mode: "website" }, notice: null };
}
