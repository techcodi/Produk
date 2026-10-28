import { createDraft, DESIGNS, FIELDS, FONTS, FORMATS, KINDS } from "../constants";
import type { CardDraft, CardKind, FontStyle } from "../types";
import { isHexColor } from "@/lib/color";

export interface CardMakerState {
  kind: CardKind;
  drafts: Record<CardKind, CardDraft>;
}

export const createInitialState = (): CardMakerState => ({
  kind: "birthday",
  drafts: Object.fromEntries(KINDS.map(({ id }) => [id, createDraft(id)])) as Record<CardKind, CardDraft>,
});

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** Only images we produced ourselves: base64 PNG or JPEG data URLs. */
const isSafePhoto = (value: unknown): value is string => typeof value === "string" && /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(value);

function parseDraft(kind: CardKind, value: unknown): CardDraft {
  const fallback = createDraft(kind);
  if (!isObject(value)) return fallback;
  const fields: CardDraft["fields"] = { ...fallback.fields };
  if (isObject(value.fields)) {
    for (const { key, maxLength } of FIELDS[kind]) {
      const text = value.fields[key];
      if (typeof text === "string") fields[key] = text.slice(0, maxLength);
    }
  }
  return {
    design: DESIGNS[kind].some((d) => d.id === value.design) ? (value.design as string) : fallback.design,
    format: FORMATS[kind].some((f) => f.id === value.format) ? (value.format as string) : fallback.format,
    fields,
    accent: isHexColor(value.accent) ? value.accent : fallback.accent,
    font: typeof value.font === "string" && value.font in FONTS ? (value.font as FontStyle) : fallback.font,
    photo: isSafePhoto(value.photo) ? value.photo : null,
  };
}

/** Rebuilds saved state from untrusted JSON, keeping valid parts and defaulting the rest. */
export function parseState(value: unknown): CardMakerState {
  const initial = createInitialState();
  if (!isObject(value)) return initial;
  const drafts = isObject(value.drafts) ? value.drafts : {};
  return {
    kind: KINDS.some((k) => k.id === value.kind) ? (value.kind as CardKind) : initial.kind,
    drafts: Object.fromEntries(KINDS.map(({ id }) => [id, parseDraft(id, drafts[id])])) as Record<CardKind, CardDraft>,
  };
}
