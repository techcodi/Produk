import type { InvoiceData, InvoiceTotals, LineItem } from "../types";

/** Lenient number parsing for typed input: "1,250.50" → 1250.5; blank or junk → 0. Never negative. */
export function parseAmount(input: string): number {
  const value = Number.parseFloat(input.replace(/[\s,]/g, ""));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/** Rounds to cents so every figure on the invoice adds up exactly as printed. */
const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export const lineTotal = (item: LineItem) => roundMoney(parseAmount(item.quantity) * parseAmount(item.rate));

/**
 * Discount comes off the subtotal, tax applies to what's left, shipping is
 * added untaxed. A discount can never take the subtotal below zero.
 */
export function computeTotals(data: InvoiceData): InvoiceTotals {
  const subtotal = roundMoney(data.items.reduce((sum, item) => sum + lineTotal(item), 0));
  const discountValue = parseAmount(data.discount);
  const discount = roundMoney(
    Math.min(subtotal, data.discountType === "percent" ? (subtotal * Math.min(discountValue, 100)) / 100 : discountValue),
  );
  const tax = roundMoney(((subtotal - discount) * parseAmount(data.taxRate)) / 100);
  const shipping = roundMoney(parseAmount(data.shipping));
  const total = roundMoney(subtotal - discount + tax + shipping);
  const paid = roundMoney(parseAmount(data.amountPaid));
  return { subtotal, discount, tax, shipping, total, paid, balance: roundMoney(total - paid) };
}
