import { yieldToMain } from "@/lib/async";
import { createPdf } from "@/lib/pdf/documents";
import { MARGINS_PT, QUALITY_PRESETS } from "../constants";
import type { PdfSettings, Rotation } from "../types";
import { processImage } from "./image-processing";
import { computePageLayout } from "./layout";

export interface PageSource {
  name: string;
  source: Blob;
  rotation: Rotation;
}

interface BuildOptions {
  signal?: AbortSignal;
  onProgress?: (completed: number, total: number) => void;
}

export class PageBuildError extends Error {
  constructor(
    readonly pageNumber: number,
    readonly fileName: string,
    cause: unknown,
  ) {
    super(`Page ${pageNumber} (${fileName}) could not be processed`, { cause });
    this.name = "PageBuildError";
  }
}

export async function buildPdf(pages: PageSource[], settings: PdfSettings, { signal, onProgress }: BuildOptions = {}) {
  const doc = await createPdf(settings.fileName, "Images to PDF");

  const preset = QUALITY_PRESETS[settings.quality];
  const margin = MARGINS_PT[settings.margin];

  for (const [index, page] of pages.entries()) {
    signal?.throwIfAborted();

    try {
      const { jpeg, naturalSize } = await processImage(page.source, { rotation: page.rotation, ...preset });
      const embedded = await doc.embedJpg(jpeg);
      const layout = computePageLayout(naturalSize, { pageSize: settings.pageSize, orientation: settings.orientation, margin });
      doc.addPage([layout.page.width, layout.page.height]).drawImage(embedded, layout.frame);
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new PageBuildError(index + 1, page.name, error);
    }

    onProgress?.(index + 1, pages.length);
    await yieldToMain();
  }

  signal?.throwIfAborted();
  return doc.save();
}
