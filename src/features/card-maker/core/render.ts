import { FONTS, getDesign, getFormat } from "../constants";
import type { CardKind, RenderInput } from "../types";
import { readableOn } from "@/lib/color";
import type { Design } from "./design-context";
import { GREETING_DESIGNS } from "./designs-greeting";
import { INVITATION_DESIGNS } from "./designs-invitation";
import { MEMBERSHIP_DESIGNS } from "./designs-membership";
import { PASS_DESIGNS } from "./designs-pass";
import { svgDocument } from "./svg-kit";

const DESIGN_FUNCTIONS: Record<CardKind, Record<string, Design>> = {
  birthday: GREETING_DESIGNS,
  thankyou: GREETING_DESIGNS,
  invitation: INVITATION_DESIGNS,
  pass: PASS_DESIGNS,
  membership: MEMBERSHIP_DESIGNS,
};

/** Pure: a card draft → a standalone SVG sized in millimetres. All user text is escaped. */
export function renderCard({ kind, draft, measure }: RenderInput): string {
  const format = getFormat(kind, draft.format);
  const design = DESIGN_FUNCTIONS[kind][getDesign(kind, draft.design).id];
  const body = design({
    w: format.widthMm,
    h: format.heightMm,
    f: (key) => draft.fields[key]?.trim() ?? "",
    accent: draft.accent,
    onAccent: readableOn(draft.accent),
    family: FONTS[draft.font].family,
    photo: draft.photo,
    measure,
  });
  return svgDocument(format.widthMm, format.heightMm, body);
}

/** "Happy Birthday" → "happy-birthday-card", for download names. */
export function cardFileStem(kind: CardKind, draft: RenderInput["draft"]): string {
  const f = draft.fields;
  const words = (kind === "pass" ? f.event : kind === "membership" ? f.organisation : kind === "invitation" ? f.host || f.title : f.headline) ?? "";
  const slug = words
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || `${kind}-card`;
}
