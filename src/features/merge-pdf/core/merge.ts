import { yieldToMain } from "@/lib/async";
import { createPdf, readPdf } from "@/lib/pdf/documents";

export interface MergeSource {
  name: string;
  file: Blob;
}

interface MergeOptions {
  signal?: AbortSignal;
  onProgress?: (completed: number, total: number) => void;
}

export class MergeFileError extends Error {
  constructor(
    readonly fileName: string,
    cause: unknown,
  ) {
    super(`${fileName} could not be added`, { cause });
    this.name = "MergeFileError";
  }
}

/** Appends every page of every source, in order, into one new PDF. */
export async function mergePdfs(sources: MergeSource[], title: string, { signal, onProgress }: MergeOptions = {}) {
  const output = await createPdf(title, "Merge PDF");

  for (const [index, source] of sources.entries()) {
    signal?.throwIfAborted();

    try {
      const doc = await readPdf(source.file);
      const pages = await output.copyPages(doc, doc.getPageIndices());
      pages.forEach((page) => output.addPage(page));
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new MergeFileError(source.name, error);
    }

    onProgress?.(index + 1, sources.length);
    await yieldToMain();
  }

  signal?.throwIfAborted();
  return output.save();
}
