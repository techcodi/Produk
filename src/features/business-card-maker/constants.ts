import type { PrintSize } from "@/lib/card-export";
import type { CardDetails, CardSizeId, CardStyle, TemplateId } from "./types";

export const DRAFT_STORAGE_KEY = "produk:business-card:v1";
export const MAX_LOGO_FILE_SIZE_BYTES = 10 * 1024 * 1024;
/** Logos print at ~20 mm wide; 800 px is well over 600 dpi. */
export const LOGO_MAX_DIMENSION = 800;

export const CARD_SIZES: Record<CardSizeId, PrintSize & { label: string; hint: string }> = {
  standard: { label: "Standard", hint: "85 × 55 mm, used across Europe, Africa and Asia.", widthMm: 85, heightMm: 55 },
  us: { label: "US", hint: "3.5 × 2 in, used in the US and Canada.", widthMm: 88.9, heightMm: 50.8 },
};

/** A4 portrait, for the home-printing sheet. */
export const SHEET_SIZE: PrintSize = { widthMm: 210, heightMm: 297 };
export const SHEET_COLUMNS = 2;
export const SHEET_ROWS = 5;

export const TEMPLATES: { id: TemplateId; name: string; description: string }[] = [
  { id: "classic", name: "Classic", description: "Clean, with an accent edge" },
  { id: "modern", name: "Modern", description: "Colour band header" },
  { id: "split", name: "Split", description: "Logo panel on the side" },
  { id: "bold", name: "Bold", description: "Full colour front" },
  { id: "minimal", name: "Minimal", description: "Centred and quiet" },
];

export const ACCENT_SWATCHES = ["#4f46e5", "#2563eb", "#0f766e", "#16a34a", "#a16207", "#ea580c", "#dc2626", "#db2777", "#7c3aed", "#111827"];

export const QR_OPTIONS = [
  { value: "none", label: "None" },
  { value: "website", label: "Website" },
  { value: "vcard", label: "Contact" },
] as const;

/** System font stacks: an SVG drawn as an image can't load web fonts. */
export const FONTS = {
  sans: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
} as const;

export const BLANK_DETAILS: CardDetails = {
  name: "",
  title: "",
  company: "",
  tagline: "",
  phone: "",
  email: "",
  website: "",
  address: "",
};

/** Shown in the preview until the user types, so an empty form still shows what the design looks like. */
export const SAMPLE_DETAILS: CardDetails = {
  name: "Ada Okafor",
  title: "Creative Director",
  company: "Lumen Studio",
  tagline: "Design that moves people",
  phone: "+234 801 234 5678",
  email: "ada@lumen.studio",
  website: "lumen.studio",
  address: "12 Admiralty Way, Lekki\nLagos, Nigeria",
};

export const DEFAULT_STYLE: CardStyle = { template: "classic", accent: "#4f46e5", size: "standard", logo: null, qr: "none" };
