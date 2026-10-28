import { describe, expect, it } from "vitest";
import { createBlankInvoice, DEFAULT_STYLE } from "../constants";
import type { InvoiceDraft } from "../types";
import { importDraft, InvoiceImportError, nextInvoiceNumber, parseDraft, serializeDraft, startNextInvoice } from "./draft";

const draft: InvoiceDraft = {
  data: {
    ...createBlankInvoice(new Date(2026, 9, 28)),
    from: { name: "Studio", details: "Lagos" },
    items: [{ id: "a", description: "Design", quantity: "2", rate: "150" }],
  },
  style: { ...DEFAULT_STYLE, template: "modern", accent: "#0f766e" },
};

describe("serializeDraft / importDraft", () => {
  it("round-trips a draft", () => {
    expect(importDraft(serializeDraft(draft))).toEqual(draft);
  });

  it("rejects JSON that is not a ProDuk invoice", () => {
    expect(() => importDraft("not json")).toThrow(InvoiceImportError);
    expect(() => importDraft(JSON.stringify({ data: draft.data }))).toThrow(InvoiceImportError);
  });
});

describe("parseDraft", () => {
  it("returns null for non-invoices", () => {
    expect(parseDraft(null)).toBeNull();
    expect(parseDraft({ style: {} })).toBeNull();
  });

  it("replaces invalid style values with defaults", () => {
    const parsed = parseDraft({
      data: draft.data,
      style: { template: "fancy", accent: "red", pageSize: "A3", logo: "javascript:alert(1)" },
    });
    expect(parsed?.style).toEqual(DEFAULT_STYLE);
  });

  it("fills in missing fields and keeps at least one line item", () => {
    const parsed = parseDraft({ data: { number: 42, items: [] } });
    expect(parsed?.data.number).toBe("42");
    expect(parsed?.data.items).toHaveLength(1);
    expect(parsed?.data.from).toEqual({ name: "", details: "" });
    expect(parsed?.data.currency).toBe("USD");
  });

  it("gives items without an id a fresh one", () => {
    const parsed = parseDraft({ data: { items: [{ description: "x" }, { description: "y" }] } });
    const [a, b] = parsed!.data.items;
    expect(a.id).toBeTruthy();
    expect(a.id).not.toBe(b.id);
  });
});

describe("nextInvoiceNumber", () => {
  it("increments the trailing number and keeps zero padding", () => {
    expect(nextInvoiceNumber("INV-0009")).toBe("INV-0010");
    expect(nextInvoiceNumber("2026/7")).toBe("2026/8");
    expect(nextInvoiceNumber("99")).toBe("100");
    expect(nextInvoiceNumber("A12-B")).toBe("A13-B");
  });

  it("handles numbers without digits", () => {
    expect(nextInvoiceNumber("ACME")).toBe("ACME-2");
    expect(nextInvoiceNumber("")).toBe("INV-0001");
  });
});

describe("startNextInvoice", () => {
  it("keeps the business and design, clears the client and items", () => {
    const filled: InvoiceDraft = {
      ...draft,
      data: { ...draft.data, billTo: { name: "Acme", details: "x" }, amountPaid: "50", paymentDetails: "Bank 123" },
    };
    const next = startNextInvoice(filled, new Date(2026, 10, 1));
    expect(next.style).toEqual(filled.style);
    expect(next.data.from).toEqual(filled.data.from);
    expect(next.data.paymentDetails).toBe("Bank 123");
    expect(next.data.number).toBe("INV-0002");
    expect(next.data.billTo).toEqual({ name: "", details: "" });
    expect(next.data.amountPaid).toBe("");
    expect(next.data.items).toHaveLength(1);
    expect(next.data.items[0].description).toBe("");
    expect(next.data.issueDate).toBe("2026-11-01");
  });
});
