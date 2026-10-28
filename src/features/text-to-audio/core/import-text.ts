import { docxToHtml, isDocx, isLegacyDoc, isPlainText } from "@/lib/document/import";
import { formatBytes } from "@/lib/format";
import { MAX_FILE_SIZE_BYTES } from "../constants";

export const TEXT_FILE_ACCEPT = "text/plain,text/markdown,.txt,.md,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export class TextImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TextImportError";
  }
}

const BLOCKS = "p,h1,h2,h3,h4,h5,h6,li,tr,blockquote";

/** Word's HTML → plain text, one paragraph per block. */
function htmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return [...doc.body.querySelectorAll(BLOCKS)]
    .filter((block) => !block.parentElement?.closest(BLOCKS))
    .map((block) => block.textContent?.trim() ?? "")
    .filter(Boolean)
    .join("\n\n");
}

export async function readTextFile(file: File): Promise<string> {
  if (file.size > MAX_FILE_SIZE_BYTES) throw new TextImportError(`Please choose a file under ${formatBytes(MAX_FILE_SIZE_BYTES)}.`);
  if (isLegacyDoc(file)) throw new TextImportError("Old .doc files can’t be read here. Save it as .docx and try again.");
  if (isDocx(file)) return htmlToText(await docxToHtml(file));
  if (isPlainText(file)) return file.text();
  throw new TextImportError("Choose a .txt or .docx file.");
}
