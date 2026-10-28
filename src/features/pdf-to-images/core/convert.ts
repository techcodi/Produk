import { yieldToMain } from "@/lib/async";
import { canvasToBlob, extensionForMime, releaseCanvas } from "@/lib/images";
import { PDF_POINTS_PER_INCH, renderPage, type PDFDocumentProxy } from "@/lib/pdf/render";
import { JPEG_QUALITY, RESOLUTION_DPI } from "../constants";
import type { ConvertSettings } from "../types";
import { imageFileName } from "./plan";

interface ConvertOptions {
  signal?: AbortSignal;
  onProgress?: (completed: number, total: number) => void;
}

export interface PageImage {
  name: string;
  blob: Blob;
}

export class PageRenderError extends Error {
  constructor(
    readonly pageNumber: number,
    cause: unknown,
  ) {
    super(`Page ${pageNumber} could not be rendered`, { cause });
    this.name = "PageRenderError";
  }
}

/** Renders each page to a JPG or PNG. Pages are white-backed, so JPG never shows black transparency. */
export async function convertPages(
  doc: PDFDocumentProxy,
  pages: number[],
  baseName: string,
  settings: Pick<ConvertSettings, "format" | "resolution">,
  { signal, onProgress }: ConvertOptions = {},
): Promise<PageImage[]> {
  const scale = RESOLUTION_DPI[settings.resolution] / PDF_POINTS_PER_INCH;
  const mime = settings.format === "png" ? "image/png" : "image/jpeg";
  const images: PageImage[] = [];

  for (const [index, page] of pages.entries()) {
    signal?.throwIfAborted();

    let canvas: HTMLCanvasElement | undefined;
    try {
      canvas = await renderPage(doc, page, scale, signal);
      const blob = await canvasToBlob(canvas, mime, mime === "image/jpeg" ? JPEG_QUALITY : undefined);
      images.push({ name: imageFileName(baseName, page, doc.numPages, extensionForMime(blob.type)), blob });
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new PageRenderError(page, error);
    } finally {
      if (canvas) releaseCanvas(canvas);
    }

    onProgress?.(index + 1, pages.length);
    await yieldToMain();
  }

  signal?.throwIfAborted();
  return images;
}
