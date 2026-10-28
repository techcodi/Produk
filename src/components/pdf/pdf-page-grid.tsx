"use client";

import { memo, useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { releaseCanvas } from "@/lib/images";
import { getPageSize, renderPage, type PDFDocumentProxy } from "@/lib/pdf/render";

const THUMBNAIL_CSS_WIDTH = 180;

interface PdfPageGridProps {
  doc: PDFDocumentProxy;
  pageCount: number;
  /** When given, pages become toggle buttons. */
  onToggle?: (page: number) => void;
  isSelected?: (page: number) => boolean;
  /** Small label in the corner, e.g. which output file a page goes to. */
  badge?: (page: number) => string | undefined;
  disabled?: boolean;
}

export function PdfPageGrid({ doc, pageCount, onToggle, isSelected, badge, disabled }: PdfPageGridProps) {
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);
  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 xl:grid-cols-5">
      {pages.map((page) => (
        <li key={page}>
          <PdfPageCell
            doc={doc}
            page={page}
            selected={isSelected?.(page)}
            badge={badge?.(page)}
            onToggle={onToggle}
            disabled={disabled}
          />
        </li>
      ))}
    </ul>
  );
}

interface PdfPageCellProps {
  doc: PDFDocumentProxy;
  page: number;
  selected?: boolean;
  badge?: string;
  onToggle?: (page: number) => void;
  disabled?: boolean;
}

const PdfPageCell = memo(function PdfPageCell({ doc, page, selected, badge, onToggle, disabled }: PdfPageCellProps) {
  const dimmed = selected === false;
  const body = (
    <>
      <div
        className={cn(
          "relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg border bg-surface-muted p-2 transition",
          selected ? "border-brand ring-2 ring-brand" : "border-border",
        )}
      >
        <PdfPageThumbnail doc={doc} page={page} className={cn("transition-opacity", dimmed && "opacity-40")} />
        {badge && (
          <span className="absolute right-1.5 top-1.5 rounded-md bg-brand px-1.5 py-0.5 text-[11px] font-semibold text-brand-foreground">
            {badge}
          </span>
        )}
        {selected && (
          <span className="absolute left-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-brand text-brand-foreground">
            <Check className="size-3.5" strokeWidth={3} />
          </span>
        )}
      </div>
      <span className={cn("mt-1.5 block text-center text-xs tabular-nums", dimmed ? "text-muted" : "font-medium")}>{page}</span>
    </>
  );

  if (!onToggle) return <div>{body}</div>;

  return (
    <button
      type="button"
      onClick={() => onToggle(page)}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={`Page ${page}`}
      className="block w-full rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed"
    >
      {body}
    </button>
  );
});

/** Renders a page preview only once it scrolls near the viewport, so long PDFs stay cheap. */
export function PdfPageThumbnail({ doc, page, className }: { doc: PDFDocumentProxy; page: number; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<"pending" | "done" | "error">("pending");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || visible) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setVisible(true);
      },
      { rootMargin: "400px" },
    );
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();

    (async () => {
      const size = await getPageSize(doc, page);
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const rendered = await renderPage(doc, page, (THUMBNAIL_CSS_WIDTH * pixelRatio) / size.width, controller.signal);
      const canvas = canvasRef.current;
      if (canvas && !controller.signal.aborted) {
        canvas.width = rendered.width;
        canvas.height = rendered.height;
        canvas.getContext("2d")?.drawImage(rendered, 0, 0);
        setStatus("done");
      }
      releaseCanvas(rendered);
    })().catch(() => {
      if (!controller.signal.aborted) setStatus("error");
    });

    return () => controller.abort();
  }, [doc, page, visible]);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden
        className={cn("max-h-full max-w-full bg-white shadow-sm", status !== "done" && "invisible absolute", className)}
      />
      {status === "pending" && <Loader2 className="size-4 animate-spin text-muted" aria-hidden />}
      {status === "error" && <span className="text-xs text-muted">No preview</span>}
    </>
  );
}
