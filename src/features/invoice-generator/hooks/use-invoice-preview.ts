"use client";

import { useEffect, useRef, useState } from "react";
import { openPdfForRendering, type PDFDocumentProxy, type RenderablePdf } from "@/lib/pdf/render";
import { renderInvoicePdf } from "../core/render-pdf";
import type { InvoiceDraft } from "../types";

/** Long enough to skip work between keystrokes, short enough to feel live. */
const PREVIEW_DELAY_MS = 350;

export interface InvoicePreview {
  doc: PDFDocumentProxy | null;
  pageCount: number;
  /** True while a newer version is being generated; the previous one stays on screen meanwhile. */
  updating: boolean;
  error: boolean;
}

/** Generates the real PDF for `draft` (debounced) and opens it with PDF.js, so the preview is exactly the download. */
export function useInvoicePreview(draft: InvoiceDraft): InvoicePreview {
  const [shown, setShown] = useState<{ draft: InvoiceDraft; doc: PDFDocumentProxy; pageCount: number } | null>(null);
  const [failed, setFailed] = useState<InvoiceDraft | null>(null);
  const currentRef = useRef<RenderablePdf | null>(null);

  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        const blob = await renderInvoicePdf(draft);
        if (cancelled) return;
        const opened = await openPdfForRendering(blob);
        if (cancelled) return void opened.destroy();

        const previous = currentRef.current;
        currentRef.current = opened;
        setShown({ draft, doc: opened.doc, pageCount: opened.doc.numPages });
        // Let the new pages mount before tearing down the document they replace.
        if (previous) setTimeout(() => void previous.destroy(), 1000);
      } catch (error) {
        if (cancelled) return;
        console.error(error);
        setFailed(draft);
      }
    }, PREVIEW_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [draft]);

  useEffect(
    () => () => {
      void currentRef.current?.destroy();
      currentRef.current = null;
    },
    [],
  );

  return {
    doc: shown?.doc ?? null,
    pageCount: shown?.pageCount ?? 0,
    updating: shown?.draft !== draft && failed !== draft,
    error: failed === draft,
  };
}
