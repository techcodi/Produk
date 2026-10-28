import { BLANK_DETAILS, CARD_SIZES, DEFAULT_STYLE, TEMPLATES } from "../constants";
import type { CardDetails, CardDraft, CardStyle } from "../types";

type Loose = Record<string, unknown>;
const isObject = (value: unknown): value is Loose => typeof value === "object" && value !== null && !Array.isArray(value);
const str = (value: unknown, max = 300) => (typeof value === "string" ? value.slice(0, max) : "");

export const blankDraft = (): CardDraft => ({ details: { ...BLANK_DETAILS }, style: { ...DEFAULT_STYLE } });

/** Rebuilds a draft from untrusted JSON (localStorage), keeping valid fields and defaulting the rest. */
export function parseDraft(value: unknown): CardDraft {
  if (!isObject(value)) return blankDraft();
  const d = isObject(value.details) ? value.details : {};
  const s = isObject(value.style) ? value.style : {};
  const details = Object.fromEntries(
    (Object.keys(BLANK_DETAILS) as (keyof CardDetails)[]).map((key) => [key, str(d[key], key === "address" ? 300 : 120)]),
  ) as unknown as CardDetails;
  const style: CardStyle = {
    template: TEMPLATES.find((t) => t.id === s.template)?.id ?? DEFAULT_STYLE.template,
    accent: typeof s.accent === "string" && /^#[0-9a-f]{6}$/i.test(s.accent) ? s.accent : DEFAULT_STYLE.accent,
    size: typeof s.size === "string" && s.size in CARD_SIZES ? (s.size as CardStyle["size"]) : DEFAULT_STYLE.size,
    logo: typeof s.logo === "string" && /^data:image\/(png|jpeg);base64,/.test(s.logo) ? s.logo : null,
    qr: s.qr === "website" || s.qr === "vcard" ? s.qr : "none",
  };
  return { details, style };
}

export const isEmpty = (details: CardDetails) => Object.values(details).every((value) => !value.trim());
