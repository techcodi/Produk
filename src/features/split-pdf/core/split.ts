import { yieldToMain } from "@/lib/async";
import { createPdf, readPdf } from "@/lib/pdf/documents";
import type { SplitOutput } from "../types";

interface SplitOptions {
  signal?: AbortSignal;
  onProgress?: (completed: number, total: number) => void;
}

export interface SplitFile {
  name: string;
  bytes: Uint8Array;
}

/** Creates one PDF per planned output by copying pages out of `source`. */
export async function splitPdf(source: Blob, outputs: SplitOutput[], baseName: string, { signal, onProgress }: SplitOptions = {}) {
  const doc = await readPdf(source);
  const files: SplitFile[] = [];

  for (const [index, out] of outputs.entries()) {
    signal?.throwIfAborted();

    const part = await createPdf(`${baseName} (${out.label})`, "Split PDF");
    const pages = await part.copyPages(
      doc,
      out.pages.map((page) => page - 1),
    );
    pages.forEach((page) => part.addPage(page));
    files.push({ name: `${baseName}-${out.label}.pdf`, bytes: await part.save() });

    onProgress?.(index + 1, outputs.length);
    await yieldToMain();
  }

  signal?.throwIfAborted();
  return files;
}
