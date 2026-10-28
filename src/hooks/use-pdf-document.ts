"use client";

import { useEffect, useState } from "react";
import { PdfReadError } from "@/lib/pdf/documents";
import { openPdfForRendering, type PDFDocumentProxy, type RenderablePdf } from "@/lib/pdf/render";

type Opened = { status: "ready"; doc: PDFDocumentProxy; pageCount: number } | { status: "error"; message: string };

export type PdfDocumentState = { status: "empty" } | { status: "loading" } | Opened;

/** Opens `file` with PDF.js for previews, and destroys it when the file changes or on unmount. */
export function usePdfDocument(file: File | null): PdfDocumentState {
  // Keyed by file, so a stale result is never shown for a newly chosen file.
  const [opened, setOpened] = useState<{ file: File; state: Opened } | null>(null);

  useEffect(() => {
    if (!file) return;

    let cancelled = false;
    let pdf: RenderablePdf | null = null;

    openPdfForRendering(file)
      .then((result) => {
        pdf = result;
        if (cancelled) return void result.destroy();
        setOpened({ file, state: { status: "ready", doc: result.doc, pageCount: result.doc.numPages } });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error(error);
        const message = error instanceof PdfReadError ? error.message : "This PDF could not be opened";
        setOpened({ file, state: { status: "error", message } });
      });

    return () => {
      cancelled = true;
      void pdf?.destroy();
    };
  }, [file]);

  if (!file) return { status: "empty" };
  if (opened?.file !== file) return { status: "loading" };
  return opened.state;
}
