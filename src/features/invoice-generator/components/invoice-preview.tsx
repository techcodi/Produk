"use client";

import { memo, useEffect, useRef } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { releaseCanvas } from "@/lib/images";
import { renderPage, type PDFDocumentProxy } from "@/lib/pdf/render";
import { PAGE_SIZES } from "../constants";
import type { InvoicePreview as PreviewState } from "../hooks/use-invoice-preview";
import type { PageSize } from "../types";

interface InvoicePreviewProps {
  preview: PreviewState;
  pageSize: PageSize;
}

export function InvoicePreview({ preview, pageSize }: InvoicePreviewProps) {
  const { width, height } = PAGE_SIZES[pageSize];
  const pages = Array.from({ length: preview.pageCount }, (_, index) => index + 1);

  return (
    <div className="relative" aria-label="Invoice preview" role="region">
      {preview.updating && preview.doc && (
        <span className="absolute right-2 top-2 z-10 inline-flex items-center gap-1.5 rounded-full bg-surface/90 px-2.5 py-1 text-xs font-medium text-muted shadow-sm backdrop-blur">
          <Loader2 className="size-3.5 animate-spin text-brand" /> Updating
        </span>
      )}

      {preview.error && (
        <div role="alert" className="mb-3 flex items-start gap-3 rounded-lg bg-danger-soft p-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          The preview could not be generated. Check your connection and try editing again.
        </div>
      )}

      {preview.doc ? (
        <ol className="space-y-4">
          {pages.map((page) => (
            <li key={page}>
              <PreviewPage doc={preview.doc!} page={page} aspect={width / height} />
            </li>
          ))}
        </ol>
      ) : (
        !preview.error && (
          <div
            className="flex items-center justify-center rounded-lg bg-white shadow-md ring-1 ring-border"
            style={{ aspectRatio: `${width} / ${height}` }}
          >
            <Loader2 className="size-6 animate-spin text-brand" />
          </div>
        )
      )}
    </div>
  );
}

/** Pixels per PDF point. Enough for crisp text on high-DPI phones without huge canvases. */
const renderScale = () => Math.min(2.5, Math.max(1.5, (globalThis.devicePixelRatio ?? 1) * 1.25));

const PreviewPage = memo(function PreviewPage({ doc, page, aspect }: { doc: PDFDocumentProxy; page: number; aspect: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    let rendered: HTMLCanvasElement | null = null;

    renderPage(doc, page, renderScale(), controller.signal)
      .then((offscreen) => {
        rendered = offscreen;
        const visible = canvasRef.current;
        if (!visible || controller.signal.aborted) return;
        // Draw into the on-screen canvas in one go, so there's never a blank frame.
        visible.width = offscreen.width;
        visible.height = offscreen.height;
        visible.getContext("2d")?.drawImage(offscreen, 0, 0);
      })
      .catch(() => {
        // Superseded by a newer document, or that document was destroyed — nothing to show.
      })
      .finally(() => {
        if (rendered) releaseCanvas(rendered);
      });

    return () => controller.abort();
  }, [doc, page]);

  return (
    <canvas
      ref={canvasRef}
      aria-label={`Page ${page}`}
      className="block h-auto w-full rounded-sm bg-white shadow-md ring-1 ring-border"
      style={{ aspectRatio: aspect }}
    />
  );
});
