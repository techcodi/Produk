import type { InvoiceDraft } from "../types";
import { buildInvoiceDocument } from "./document";

type PdfMake = typeof import("pdfmake/build/pdfmake");

let pdfMakePromise: Promise<PdfMake> | null = null;

/** CommonJS/UMD modules usually arrive as `{ default }` from a dynamic import, depending on the bundler. */
const interop = <T>(mod: T | { default: T }): T => (mod as { default?: T }).default ?? (mod as T);

/**
 * Loads pdfmake and its bundled Roboto fonts on first use (~1 MB), keeping both
 * out of the initial page load. Roboto covers ₦, ₹, € and most currency symbols.
 */
function loadPdfMake() {
  pdfMakePromise ??= Promise.all([import("pdfmake/build/pdfmake"), import("pdfmake/build/vfs_fonts")])
    .then(([pdfMakeModule, vfsModule]) => {
      const pdfMake = interop(pdfMakeModule);
      pdfMake.addVirtualFileSystem(interop(vfsModule));
      return pdfMake;
    })
    .catch((error: unknown) => {
      pdfMakePromise = null; // Let a later attempt retry, e.g. after a flaky connection.
      throw error;
    });
  return pdfMakePromise;
}

export async function renderInvoicePdf(draft: InvoiceDraft): Promise<Blob> {
  const pdfMake = await loadPdfMake();
  return pdfMake.createPdf(buildInvoiceDocument(draft)).getBlob();
}
