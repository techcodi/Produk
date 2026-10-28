import { describe, expect, it } from "vitest";
import { createBlankInvoice } from "../constants";
import type { InvoiceData, LineItem } from "../types";
import { computeTotals, lineTotal, parseAmount } from "./totals";

const item = (quantity: string, rate: string): LineItem => ({ id: `${quantity}x${rate}`, description: "", quantity, rate });

const invoice = (patch: Partial<InvoiceData>): InvoiceData => ({ ...createBlankInvoice(new Date(2026, 0, 1)), ...patch });

describe("parseAmount", () => {
  it("accepts thousands separators and stray spaces", () => {
    expect(parseAmount("1,250.50")).toBe(1250.5);
    expect(parseAmount(" 2 000 ")).toBe(2000);
  });

  it("treats blank, junk and negatives as zero", () => {
    expect(parseAmount("")).toBe(0);
    expect(parseAmount("abc")).toBe(0);
    expect(parseAmount("-5")).toBe(0);
  });

  it("keeps half-typed decimals usable", () => {
    expect(parseAmount("1.")).toBe(1);
  });
});

describe("lineTotal", () => {
  it("rounds to cents", () => {
    expect(lineTotal(item("3", "0.1"))).toBe(0.3);
    expect(lineTotal(item("1.5", "19.99"))).toBe(29.99);
  });
});

describe("computeTotals", () => {
  it("applies percent discount before tax, and adds shipping untaxed", () => {
    const totals = computeTotals(
      invoice({ items: [item("2", "50"), item("1", "100")], discount: "10", taxRate: "7.5", shipping: "20" }),
    );
    expect(totals).toMatchObject({ subtotal: 200, discount: 20, tax: 13.5, shipping: 20, total: 213.5, balance: 213.5 });
  });

  it("supports a fixed discount and caps it at the subtotal", () => {
    expect(computeTotals(invoice({ items: [item("1", "80")], discountType: "amount", discount: "30" })).total).toBe(50);
    expect(computeTotals(invoice({ items: [item("1", "80")], discountType: "amount", discount: "500" })).total).toBe(0);
  });

  it("caps a percent discount at 100%", () => {
    expect(computeTotals(invoice({ items: [item("1", "80")], discount: "150" })).discount).toBe(80);
  });

  it("subtracts payments from the balance", () => {
    const totals = computeTotals(invoice({ items: [item("1", "100")], amountPaid: "40" }));
    expect(totals).toMatchObject({ total: 100, paid: 40, balance: 60 });
  });

  it("is all zeros for an empty invoice", () => {
    expect(computeTotals(invoice({ items: [item("1", "")] })).total).toBe(0);
  });
});
