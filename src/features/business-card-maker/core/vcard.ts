import type { CardDetails } from "../types";

/** vCard 3.0 text escaping (RFC 2426 §4): backslash, comma, semicolon and line breaks. */
export const escapeVcard = (value: string) =>
  value
    .trim()
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\r?\n/g, "\\n");

/** `"lumen.studio"` → `"https://lumen.studio"`; leaves URLs with a scheme alone. */
export const normalizeUrl = (website: string) => {
  const trimmed = website.trim();
  if (!trimmed) return "";
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

/** `"https://www.lumen.studio/"` → `"lumen.studio"` for printing. */
export const displayUrl = (website: string) =>
  website.trim().replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");

/**
 * A vCard 3.0 that phone cameras turn into "Add contact". The family name is
 * taken as the last word, which suits most names; FN keeps the name exactly as typed.
 */
export function buildVcard(details: CardDetails): string {
  const name = details.name.trim();
  const parts = name.split(/\s+/).filter(Boolean);
  const family = parts.length > 1 ? parts[parts.length - 1] : name;
  const given = parts.length > 1 ? parts.slice(0, -1).join(" ") : "";

  const lines = ["BEGIN:VCARD", "VERSION:3.0", `N:${escapeVcard(family)};${escapeVcard(given)};;;`, `FN:${escapeVcard(name)}`];
  const add = (key: string, value: string) => value.trim() && lines.push(`${key}:${escapeVcard(value)}`);
  add("ORG", details.company);
  add("TITLE", details.title);
  add("TEL;TYPE=WORK,VOICE", details.phone);
  add("EMAIL;TYPE=INTERNET", details.email);
  if (details.website.trim()) lines.push(`URL:${escapeVcard(normalizeUrl(details.website))}`);
  // ADR fields: PO box; extended; street; locality; region; postcode; country. The whole address goes in "street".
  if (details.address.trim()) lines.push(`ADR;TYPE=WORK:;;${escapeVcard(details.address)};;;;`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}
