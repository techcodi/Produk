export type CardKind = "birthday" | "thankyou" | "invitation" | "pass" | "membership";

export type FontStyle = "modern" | "classic" | "playful";

/** Keys of the editable text fields, shared across kinds so a design can look any of them up. */
export type FieldKey =
  | "headline"
  | "message"
  | "signoff"
  | "title"
  | "host"
  | "date"
  | "time"
  | "venue"
  | "rsvp"
  | "event"
  | "attendee"
  | "zone"
  | "qr"
  | "organisation"
  | "member"
  | "memberNumber"
  | "validUntil";

export interface FieldDefinition {
  key: FieldKey;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  maxLength: number;
  hint?: string;
}

export interface CardFormat {
  id: string;
  label: string;
  widthMm: number;
  heightMm: number;
}

export interface CardDesign {
  id: string;
  name: string;
}

/** Everything the user has set for one card kind. */
export interface CardDraft {
  design: string;
  format: string;
  fields: Partial<Record<FieldKey, string>>;
  accent: string;
  font: FontStyle;
  /** Downscaled JPEG/PNG data URL, or null. */
  photo: string | null;
}

/** Text measurement for a font, injected so designs stay pure and testable. */
export type MeasureFactory = (family: string, size: number, weight?: number) => (text: string) => number;

export interface RenderInput {
  kind: CardKind;
  draft: CardDraft;
  measure: MeasureFactory;
}
