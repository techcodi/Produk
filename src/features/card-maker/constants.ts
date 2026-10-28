import type { CardDesign, CardDraft, CardFormat, CardKind, FieldDefinition, FontStyle } from "./types";

export const DRAFT_STORAGE_KEY = "produk:card-maker:v1";
export const MAX_PHOTO_FILE_SIZE_BYTES = 20 * 1024 * 1024;
/** Longest photo side kept: sharp in print at card sizes, small enough for localStorage. */
export const PHOTO_MAX_DIMENSION = 1200;

export const KINDS: { id: CardKind; label: string }[] = [
  { id: "birthday", label: "Birthday" },
  { id: "thankyou", label: "Thank you" },
  { id: "invitation", label: "Invitation" },
  { id: "pass", label: "Event pass" },
  { id: "membership", label: "Membership" },
];

/** SVG drawn as an image can't load web fonts, so every style is a system font stack. */
export const FONTS: Record<FontStyle, { label: string; family: string }> = {
  // Labels avoid the layout names ("Modern", "Classic") so the two pickers can't be confused.
  modern: { label: "Simple", family: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
  classic: { label: "Serif", family: "Georgia, 'Times New Roman', Times, serif" },
  playful: { label: "Friendly", family: "'Trebuchet MS', 'Segoe UI', Verdana, sans-serif" },
};

const PORTRAIT: CardFormat = { id: "portrait", label: "5×7 in", widthMm: 127, heightMm: 178 };
const SQUARE: CardFormat = { id: "square", label: "Square", widthMm: 150, heightMm: 150 };

export const FORMATS: Record<CardKind, CardFormat[]> = {
  birthday: [PORTRAIT, SQUARE],
  thankyou: [PORTRAIT, SQUARE],
  invitation: [PORTRAIT, SQUARE],
  pass: [{ id: "landscape", label: "4×6 in", widthMm: 152.4, heightMm: 101.6 }],
  membership: [{ id: "wallet", label: "Wallet size", widthMm: 85.6, heightMm: 54 }],
};

const GREETING_DESIGNS: CardDesign[] = [
  { id: "confetti", name: "Confetti" },
  { id: "elegant", name: "Elegant" },
  { id: "photo", name: "Photo" },
];

export const DESIGNS: Record<CardKind, CardDesign[]> = {
  birthday: GREETING_DESIGNS,
  thankyou: GREETING_DESIGNS,
  invitation: [
    { id: "classic", name: "Classic" },
    { id: "modern", name: "Modern" },
    { id: "photo", name: "Photo" },
  ],
  pass: [
    { id: "ticket", name: "Ticket" },
    { id: "badge", name: "Badge" },
  ],
  membership: [
    { id: "club", name: "Club" },
    { id: "minimal", name: "Minimal" },
  ],
};

/** Designs that show the uploaded photo; the photo section is hidden for kinds with none. */
export const PHOTO_DESIGNS: Record<CardKind, string[]> = {
  birthday: ["photo"],
  thankyou: ["photo"],
  invitation: ["photo"],
  pass: [],
  membership: ["club", "minimal"],
};

const greetingFields =(headline: string): FieldDefinition[] => [
  { key: "headline", label: "Headline", placeholder: headline, maxLength: 60 },
  { key: "message", label: "Message", multiline: true, maxLength: 600 },
  { key: "signoff", label: "From", placeholder: "With love, Sam", maxLength: 80 },
];

export const FIELDS: Record<CardKind, FieldDefinition[]> = {
  birthday: greetingFields("Happy Birthday!"),
  thankyou: greetingFields("Thank you"),
  invitation: [
    { key: "title", label: "Title", placeholder: "You’re invited", maxLength: 60 },
    { key: "host", label: "Hosted by / occasion", placeholder: "Ada & Tunde’s wedding", maxLength: 100 },
    { key: "message", label: "Message", multiline: true, maxLength: 300 },
    { key: "date", label: "Date", placeholder: "Saturday, 12 December 2026", maxLength: 60 },
    { key: "time", label: "Time", placeholder: "2:00 PM", maxLength: 40 },
    { key: "venue", label: "Venue", multiline: true, maxLength: 160 },
    { key: "rsvp", label: "RSVP", placeholder: "RSVP to Ada, +234 801 234 5678", maxLength: 120 },
  ],
  pass: [
    { key: "event", label: "Event name", maxLength: 80 },
    { key: "attendee", label: "Attendee", maxLength: 60 },
    { key: "date", label: "Date & time", maxLength: 60 },
    { key: "venue", label: "Venue", maxLength: 100 },
    { key: "zone", label: "Seat / zone", placeholder: "VIP · Table 4", maxLength: 40 },
    {
      key: "qr",
      label: "QR code content",
      placeholder: "A link, ticket reference or any text",
      maxLength: 300,
      hint: "Leave empty for no QR code.",
    },
  ],
  membership: [
    { key: "organisation", label: "Club or organisation", maxLength: 60 },
    { key: "member", label: "Member name", maxLength: 60 },
    { key: "memberNumber", label: "Member no.", placeholder: "GYM-00042", maxLength: 24 },
    { key: "validUntil", label: "Valid until", placeholder: "Dec 2027", maxLength: 30 },
  ],
};

export const ACCENT_SWATCHES = ["#e11d48", "#db2777", "#7c3aed", "#4f46e5", "#0284c7", "#0f766e", "#16a34a", "#ca8a04", "#ea580c", "#111827"];

const DEFAULT_FIELDS: Record<CardKind, CardDraft["fields"]> = {
  birthday: {
    headline: "Happy Birthday!",
    message: "Wishing you a year full of laughter, adventure and everything that makes you smile.",
    signoff: "With love",
  },
  thankyou: {
    headline: "Thank you",
    message: "Your kindness meant more than words can say. I’m so grateful.",
    signoff: "Warmly",
  },
  invitation: {
    title: "You’re invited",
    host: "Our Garden Party",
    message: "Join us for an afternoon of food, music and good company.",
    date: "Saturday, 12 December 2026",
    time: "2:00 PM",
    venue: "12 Admiralty Way, Lekki, Lagos",
    rsvp: "",
  },
  pass: {
    event: "Lagos Tech Summit 2026",
    attendee: "Your Name",
    date: "12 Dec 2026 · 9:00 AM",
    venue: "Eko Convention Centre",
    zone: "General admission",
    qr: "",
  },
  membership: {
    organisation: "Sunrise Fitness Club",
    member: "Your Name",
    memberNumber: "",
    validUntil: "",
  },
};

const DEFAULT_ACCENTS: Record<CardKind, string> = {
  birthday: "#db2777",
  thankyou: "#0f766e",
  invitation: "#ca8a04",
  pass: "#4f46e5",
  membership: "#111827",
};

export function createDraft(kind: CardKind): CardDraft {
  return {
    design: DESIGNS[kind][0].id,
    format: FORMATS[kind][0].id,
    fields: { ...DEFAULT_FIELDS[kind] },
    accent: DEFAULT_ACCENTS[kind],
    font: kind === "invitation" ? "classic" : kind === "birthday" ? "playful" : "modern",
    photo: null,
  };
}

export const getFormat = (kind: CardKind, id: string) => FORMATS[kind].find((f) => f.id === id) ?? FORMATS[kind][0];
export const getDesign = (kind: CardKind, id: string) => DESIGNS[kind].find((d) => d.id === id) ?? DESIGNS[kind][0];
