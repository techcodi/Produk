import type { InvoiceData, InvoiceStyle, PageSize, TemplateId } from "./types";

export const DRAFT_STORAGE_KEY = "produk:invoice-draft:v1";
export const MAX_ITEMS = 100;
export const MAX_LOGO_FILE_SIZE_BYTES = 10 * 1024 * 1024;
/** Longest logo side kept after downscaling — plenty for print, small enough for localStorage. */
export const LOGO_MAX_DIMENSION = 600;

export interface TemplateInfo {
  id: TemplateId;
  name: string;
  description: string;
  /** Suggested accent, applied when the template is picked. */
  accent: string;
}

export const TEMPLATES: TemplateInfo[] = [
  { id: "classic", name: "Classic", description: "Timeless and clean", accent: "#4f46e5" },
  { id: "modern", name: "Modern", description: "Bold colour header", accent: "#0f766e" },
  { id: "minimal", name: "Minimal", description: "Quiet, lots of space", accent: "#111827" },
  { id: "bold", name: "Bold", description: "Big type, accent stripe", accent: "#dc2626" },
  { id: "elegant", name: "Elegant", description: "Centred and refined", accent: "#a16207" },
];

export const ACCENT_SWATCHES = [
  "#4f46e5",
  "#2563eb",
  "#0f766e",
  "#16a34a",
  "#a16207",
  "#ea580c",
  "#dc2626",
  "#db2777",
  "#7c3aed",
  "#111827",
];

export const PAGE_SIZES: Record<PageSize, { label: string; width: number; height: number }> = {
  A4: { label: "A4", width: 595.28, height: 841.89 },
  LETTER: { label: "Letter", width: 612, height: 792 },
};

export interface CurrencyInfo {
  code: string;
  name: string;
  /** "code" where the bundled PDF font has no glyph for the symbol (e.g. ₵). */
  display: "narrowSymbol" | "code";
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: "USD", name: "US Dollar", display: "narrowSymbol" },
  { code: "EUR", name: "Euro", display: "narrowSymbol" },
  { code: "GBP", name: "British Pound", display: "narrowSymbol" },
  { code: "NGN", name: "Nigerian Naira", display: "narrowSymbol" },
  { code: "GHS", name: "Ghanaian Cedi", display: "code" },
  { code: "KES", name: "Kenyan Shilling", display: "code" },
  { code: "ZAR", name: "South African Rand", display: "narrowSymbol" },
  { code: "EGP", name: "Egyptian Pound", display: "code" },
  { code: "INR", name: "Indian Rupee", display: "narrowSymbol" },
  { code: "PKR", name: "Pakistani Rupee", display: "code" },
  { code: "CAD", name: "Canadian Dollar", display: "code" },
  { code: "AUD", name: "Australian Dollar", display: "code" },
  { code: "NZD", name: "New Zealand Dollar", display: "code" },
  { code: "JPY", name: "Japanese Yen", display: "narrowSymbol" },
  { code: "CNY", name: "Chinese Yuan", display: "code" },
  { code: "KRW", name: "South Korean Won", display: "narrowSymbol" },
  { code: "SGD", name: "Singapore Dollar", display: "code" },
  { code: "PHP", name: "Philippine Peso", display: "narrowSymbol" },
  { code: "AED", name: "UAE Dirham", display: "code" },
  { code: "SAR", name: "Saudi Riyal", display: "code" },
  { code: "CHF", name: "Swiss Franc", display: "code" },
  { code: "SEK", name: "Swedish Krona", display: "code" },
  { code: "TRY", name: "Turkish Lira", display: "narrowSymbol" },
  { code: "BRL", name: "Brazilian Real", display: "narrowSymbol" },
  { code: "MXN", name: "Mexican Peso", display: "code" },
];

export const DOCUMENT_TITLES = ["Invoice", "Tax Invoice", "Quote", "Estimate", "Receipt", "Proforma Invoice"];

export const DEFAULT_STYLE: InvoiceStyle = {
  template: "classic",
  accent: TEMPLATES[0].accent,
  pageSize: "A4",
  logo: null,
};

/** A blank invoice dated today, due in 14 days. Dates are local so "today" matches the user's calendar. */
export function createBlankInvoice(today = new Date(), itemId = "item-1"): InvoiceData {
  const due = new Date(today);
  due.setDate(due.getDate() + 14);
  return {
    title: "Invoice",
    number: "INV-0001",
    issueDate: toIsoDate(today),
    dueDate: toIsoDate(due),
    currency: "USD",
    from: { name: "", details: "" },
    billTo: { name: "", details: "" },
    items: [{ id: itemId, description: "", quantity: "1", rate: "" }],
    taxLabel: "Tax",
    taxRate: "",
    discountType: "percent",
    discount: "",
    shipping: "",
    amountPaid: "",
    notes: "Thank you for your business!",
    terms: "",
    paymentDetails: "",
  };
}

function toIsoDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
