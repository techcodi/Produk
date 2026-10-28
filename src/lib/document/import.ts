import { extensionOf } from "../files";

export const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const WORD_ACCEPT_ATTRIBUTE = [DOCX_MIME, "application/msword", ".docx", ".doc"].join(",");
export const TEXT_ACCEPT_ATTRIBUTE = "text/plain,text/markdown,.txt,.md,.text";

export const isDocx = (file: File) => file.type === DOCX_MIME || extensionOf(file.name) === ".docx";

/** Pre-2007 binary Word files, which can't be read in the browser. */
export const isLegacyDoc = (file: File) => file.type === "application/msword" || extensionOf(file.name) === ".doc";

export const isPlainText = (file: File) =>
  file.type.startsWith("text/") || [".txt", ".md", ".text"].includes(extensionOf(file.name));

export class DocumentImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentImportError";
  }
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Plain text → one paragraph per line; blank lines are kept as empty paragraphs. */
export function textToHtml(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
}

/**
 * Reads a .docx into HTML the editor understands: headings, emphasis, lists,
 * tables, links and images (inlined as data URLs). Page layout is not kept.
 */
export async function docxToHtml(file: Blob): Promise<string> {
  const { default: mammoth } = await import("mammoth");
  try {
    const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
    return result.value;
  } catch {
    throw new DocumentImportError("This Word file couldn’t be read. It may be damaged or password-protected.");
  }
}
