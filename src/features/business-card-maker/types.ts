export type TemplateId = "classic" | "bold" | "split" | "minimal" | "modern";
export type CardSizeId = "standard" | "us";
export type QrMode = "none" | "website" | "vcard";

export interface CardDetails {
  name: string;
  title: string;
  company: string;
  tagline: string;
  phone: string;
  email: string;
  website: string;
  /** Multi-line street address. */
  address: string;
}

export interface CardStyle {
  template: TemplateId;
  /** `#rrggbb` */
  accent: string;
  size: CardSizeId;
  /** PNG or JPEG data URL, already downscaled. */
  logo: string | null;
  qr: QrMode;
}

export interface CardDraft {
  details: CardDetails;
  style: CardStyle;
}
