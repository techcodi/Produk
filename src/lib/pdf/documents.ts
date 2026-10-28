import type { PDFDocument } from "pdf-lib";
import { extensionOf } from "../files";

export const PDF_ACCEPT_ATTRIBUTE = "application/pdf,.pdf";

export const isPdf = (file: File) => file.type === "application/pdf" || extensionOf(file.name) === ".pdf";

export class PdfReadError extends Error {
  constructor(
    message: string,
    readonly reason: "encrypted" | "invalid",
  ) {
    super(message);
    this.name = "PdfReadError";
  }
}

/** Loaded on demand so pdf-lib never weighs down the initial page load. */
export const loadPdfLib = () => import("pdf-lib");

/**
 * Parses a PDF with pdf-lib. Password-protected files are rejected up front:
 * pdf-lib can't decrypt them, and copying their pages produces blank output.
 */
export async function readPdf(data: Blob | ArrayBuffer): Promise<PDFDocument> {
  const { PDFDocument } = await loadPdfLib();
  const bytes = data instanceof Blob ? await data.arrayBuffer() : data;

  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  } catch {
    throw new PdfReadError("This file isn’t a readable PDF", "invalid");
  }
  if (doc.isEncrypted) throw new PdfReadError("This PDF is password-protected", "encrypted");
  return doc;
}

export async function createPdf(title: string, tool: string) {
  const { PDFDocument } = await loadPdfLib();
  const doc = await PDFDocument.create();
  doc.setTitle(title);
  doc.setCreator(`ProDuk — ${tool}`);
  doc.setProducer("ProDuk");
  return doc;
}
