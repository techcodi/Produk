export type TemplateId = "classic" | "modern" | "minimal" | "bold" | "elegant";
export type PageSize = "A4" | "LETTER";
export type DiscountType = "percent" | "amount";

export interface Party {
  name: string;
  /** Free-form lines: address, email, phone, tax ID… */
  details: string;
}

export interface LineItem {
  id: string;
  description: string;
  /** Kept as typed so half-entered numbers like "1." survive editing; parsed with `parseAmount`. */
  quantity: string;
  rate: string;
}

export interface InvoiceData {
  /** "Invoice", "Quote", "Receipt"… printed as the document heading. */
  title: string;
  number: string;
  /** ISO dates (yyyy-mm-dd) straight from `<input type="date">`; empty when unset. */
  issueDate: string;
  dueDate: string;
  currency: string;
  from: Party;
  billTo: Party;
  items: LineItem[];
  taxLabel: string;
  taxRate: string;
  discountType: DiscountType;
  discount: string;
  shipping: string;
  amountPaid: string;
  notes: string;
  terms: string;
  paymentDetails: string;
}

export interface InvoiceStyle {
  template: TemplateId;
  /** `#rrggbb` */
  accent: string;
  pageSize: PageSize;
  /** PNG or JPEG data URL, already downscaled. */
  logo: string | null;
}

export interface InvoiceDraft {
  data: InvoiceData;
  style: InvoiceStyle;
}

export interface InvoiceTotals {
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
  paid: number;
  balance: number;
}
