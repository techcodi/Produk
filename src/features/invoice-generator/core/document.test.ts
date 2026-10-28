import { describe, expect, it } from "vitest";
import { createBlankInvoice, DEFAULT_STYLE, TEMPLATES } from "../constants";
import type { InvoiceDraft } from "../types";
import { buildInvoiceDocument, invoiceFileName } from "./document";

const draft: InvoiceDraft = {
  data: {
    ...createBlankInvoice(new Date(2026, 9, 28)),
    currency: "NGN",
    from: { name: "Studio Ltd", details: "Lagos" },
    billTo: { name: "Acme", details: "" },
    items: [
      { id: "a", description: "Design", quantity: "2", rate: "150" },
      { id: "b", description: "", quantity: "1", rate: "" },
    ],
    amountPaid: "100",
  },
  style: DEFAULT_STYLE,
};

/** Every string pdfmake will print, in document order. */
function texts(node: unknown): string[] {
  if (typeof node === "string") return [node];
  if (Array.isArray(node)) return node.flatMap(texts);
  if (node && typeof node === "object") return Object.values(node).flatMap(texts);
  return [];
}

describe("buildInvoiceDocument", () => {
  it.each(TEMPLATES.map((t) => t.id))("%s shows the parties, items and balance", (template) => {
    const doc = buildInvoiceDocument({ ...draft, style: { ...DEFAULT_STYLE, template } });
    const printed = texts(doc.content).join("\n");
    expect(printed.toLowerCase()).toContain("studio ltd"); // Some templates print the name in capitals.
    expect(printed).toContain("Acme");
    expect(printed).toContain("Design");
    expect(printed).toContain("₦300.00");
    expect(printed).toContain("₦200.00"); // balance after the ₦100 payment
  });

  it("leaves untouched blank rows out of the table", () => {
    const doc = buildInvoiceDocument(draft);
    expect(texts(doc.content).filter((text) => text === "₦0.00")).toHaveLength(0);
  });

  it("uses the chosen page size and sets document metadata", () => {
    const doc = buildInvoiceDocument({ ...draft, style: { ...DEFAULT_STYLE, pageSize: "LETTER" } });
    expect(doc.pageSize).toBe("LETTER");
    expect(doc.info?.title).toBe("Invoice INV-0001");
  });
});

describe("invoiceFileName", () => {
  it("combines title and number into a safe file name", () => {
    expect(invoiceFileName(draft.data)).toBe("Invoice INV-0001.pdf");
    expect(invoiceFileName({ ...draft.data, title: "Quote", number: "Q/12" })).toBe("Quote Q-12.pdf");
    expect(invoiceFileName({ ...draft.data, title: "", number: "" })).toBe("invoice.pdf");
  });
});
