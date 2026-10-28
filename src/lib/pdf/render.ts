import type { PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import { clampToCanvasLimits, createCanvas, type Size } from "../images";
import { PdfReadError } from "./documents";

export type { PDFDocumentProxy };

/** CSS pixels per PDF point at 100% zoom. */
export const PDF_POINTS_PER_INCH = 72;

let pdfjsPromise: Promise<typeof import("pdfjs-dist/legacy/build/pdf.mjs")> | null = null;

/** Where scripts/copy-pdfjs-assets.mjs puts the worker, fonts, CMaps and WASM decoders. */
const assetsBase = (version: string) => `/pdfjs/${version}/`;

/** Loads PDF.js on first use — the legacy build, so older phone browsers work too. */
function loadPdfjs() {
  pdfjsPromise ??= import("pdfjs-dist/legacy/build/pdf.mjs").then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = `${assetsBase(pdfjs.version)}pdf.worker.min.mjs`;
    return pdfjs;
  });
  return pdfjsPromise;
}

export interface RenderablePdf {
  doc: PDFDocumentProxy;
  /** Terminates parsing and frees the worker-side document. */
  destroy: () => Promise<void>;
}

/** Opens a PDF for rendering. Call `destroy()` on the result when done with it. */
export async function openPdfForRendering(file: Blob): Promise<RenderablePdf> {
  const pdfjs = await loadPdfjs();
  const base = assetsBase(pdfjs.version);
  const task = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    cMapUrl: `${base}cmaps/`,
    standardFontDataUrl: `${base}standard_fonts/`,
    wasmUrl: `${base}wasm/`,
    iccUrl: `${base}iccs/`,
  });
  try {
    return { doc: await task.promise, destroy: () => task.destroy() };
  } catch (error) {
    void task.destroy();
    if (error instanceof pdfjs.PasswordException) {
      throw new PdfReadError("This PDF is password-protected", "encrypted");
    }
    throw new PdfReadError("This file isn’t a readable PDF", "invalid");
  }
}

/** Page size in PDF points, with the page's own rotation applied. */
export async function getPageSize(doc: PDFDocumentProxy, pageNumber: number): Promise<Size> {
  const page = await doc.getPage(pageNumber);
  const { width, height } = page.getViewport({ scale: 1 });
  return { width, height };
}

/**
 * Renders one page onto a white canvas at `scale` (1 = 72 DPI), shrunk if
 * needed to stay inside canvas limits. The caller owns (and must release) the canvas.
 */
export async function renderPage(
  doc: PDFDocumentProxy,
  pageNumber: number,
  scale: number,
  signal?: AbortSignal,
): Promise<HTMLCanvasElement> {
  const page = await doc.getPage(pageNumber);
  const natural = page.getViewport({ scale });
  const target = clampToCanvasLimits(natural);
  const viewport = page.getViewport({ scale: scale * (target.width / natural.width) });

  const { canvas } = createCanvas({ width: Math.floor(viewport.width), height: Math.floor(viewport.height) });
  const task = page.render({ canvas, viewport, background: "#ffffff" });
  const onAbort = () => task.cancel();
  signal?.addEventListener("abort", onAbort);
  try {
    await task.promise;
  } finally {
    signal?.removeEventListener("abort", onAbort);
    page.cleanup();
  }
  signal?.throwIfAborted();
  return canvas;
}
