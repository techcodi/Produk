import { createId } from "@/lib/id";
import { createBlankInvoice, DEFAULT_STYLE, MAX_ITEMS, TEMPLATES } from "../constants";
import type { InvoiceData, InvoiceDraft, InvoiceStyle, LineItem, Party } from "../types";

const FILE_FORMAT = "produk-invoice";
const FILE_VERSION = 1;

type Loose = Record<string, unknown>;

const isObject = (value: unknown): value is Loose => typeof value === "object" && value !== null && !Array.isArray(value);
const str = (value: unknown, fallback: string, max = 5000) =>
  typeof value === "string" ? value.slice(0, max) : typeof value === "number" ? String(value) : fallback;

function party(value: unknown): Party {
  const p = isObject(value) ? value : {};
  return { name: str(p.name, ""), details: str(p.details, "") };
}

function items(value: unknown): LineItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isObject)
    .slice(0, MAX_ITEMS)
    .map((item) => ({
      id: typeof item.id === "string" && item.id ? item.id : createId(),
      description: str(item.description, ""),
      quantity: str(item.quantity, "1", 32),
      rate: str(item.rate, "", 32),
    }));
}

function data(value: unknown): InvoiceData {
  const blank = createBlankInvoice(new Date(), createId());
  if (!isObject(value)) return blank;
  const parsedItems = items(value.items);
  return {
    title: str(value.title, blank.title, 60),
    number: str(value.number, blank.number, 60),
    issueDate: str(value.issueDate, blank.issueDate, 10),
    dueDate: str(value.dueDate, blank.dueDate, 10),
    currency: typeof value.currency === "string" && /^[A-Z]{3}$/.test(value.currency) ? value.currency : blank.currency,
    from: party(value.from),
    billTo: party(value.billTo),
    items: parsedItems.length > 0 ? parsedItems : blank.items,
    taxLabel: str(value.taxLabel, blank.taxLabel, 40),
    taxRate: str(value.taxRate, "", 32),
    discountType: value.discountType === "amount" ? "amount" : "percent",
    discount: str(value.discount, "", 32),
    shipping: str(value.shipping, "", 32),
    amountPaid: str(value.amountPaid, "", 32),
    notes: str(value.notes, ""),
    terms: str(value.terms, ""),
    paymentDetails: str(value.paymentDetails, ""),
  };
}

function style(value: unknown): InvoiceStyle {
  if (!isObject(value)) return DEFAULT_STYLE;
  const template = TEMPLATES.find((t) => t.id === value.template)?.id ?? DEFAULT_STYLE.template;
  return {
    template,
    accent: typeof value.accent === "string" && /^#[0-9a-f]{6}$/i.test(value.accent) ? value.accent : DEFAULT_STYLE.accent,
    pageSize: value.pageSize === "LETTER" ? "LETTER" : "A4",
    logo: typeof value.logo === "string" && /^data:image\/(png|jpeg);base64,/.test(value.logo) ? value.logo : null,
  };
}

/**
 * Rebuilds a draft from untrusted JSON (localStorage or an imported file),
 * keeping every valid field and defaulting the rest. Returns null when the
 * input isn't an invoice at all.
 */
export function parseDraft(value: unknown): InvoiceDraft | null {
  if (!isObject(value) || !isObject(value.data)) return null;
  return { data: data(value.data), style: style(value.style) };
}

/** `"INV-0009"` → `"INV-0010"`, `"2026/7"` → `"2026/8"`; appends `-2` when there's no trailing number. */
export function nextInvoiceNumber(number: string): string {
  const match = /^(.*?)(\d+)(\D*)$/.exec(number.trim());
  if (!match) return number.trim() ? `${number.trim()}-2` : "INV-0001";
  const [, prefix, digits, suffix] = match;
  return `${prefix}${String(Number(digits) + 1).padStart(digits.length, "0")}${suffix}`;
}

/**
 * The next invoice for the same business: keeps who you are, how you get paid
 * and the design; clears the client, items and amounts; bumps the number.
 */
export function startNextInvoice({ data, style }: InvoiceDraft, today = new Date()): InvoiceDraft {
  const blank = createBlankInvoice(today, createId());
  return {
    style,
    data: {
      ...blank,
      title: data.title,
      number: nextInvoiceNumber(data.number),
      currency: data.currency,
      from: data.from,
      taxLabel: data.taxLabel,
      taxRate: data.taxRate,
      notes: data.notes,
      terms: data.terms,
      paymentDetails: data.paymentDetails,
    },
  };
}

export function serializeDraft(draft: InvoiceDraft): string {
  return JSON.stringify({ format: FILE_FORMAT, version: FILE_VERSION, ...draft }, null, 2);
}

export class InvoiceImportError extends Error {
  constructor() {
    super("This file isn’t a ProDuk invoice");
    this.name = "InvoiceImportError";
  }
}

export function importDraft(text: string): InvoiceDraft {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new InvoiceImportError();
  }
  if (!isObject(json) || json.format !== FILE_FORMAT) throw new InvoiceImportError();
  const draft = parseDraft(json);
  if (!draft) throw new InvoiceImportError();
  return draft;
}
