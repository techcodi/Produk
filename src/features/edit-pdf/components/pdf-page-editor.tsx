"use client";

import { memo, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { createId } from "@/lib/id";
import { releaseCanvas } from "@/lib/images";
import { renderPage, type PDFDocumentProxy } from "@/lib/pdf/render";
import {
  BASELINE_RATIO,
  DEFAULT_TEXT,
  DEFAULT_WHITEOUT_COLOR,
  IMAGE_MAX_PAGE_SHARE,
  LINE_HEIGHT,
  SIGNATURE_WIDTH_PT,
} from "../constants";
import { pickBackground, type Rgb } from "../core/background";
import { extractEditableLines, type RawTextItem, type RawTextStyle } from "../core/text-lines";
import type { EditableLine, EditMode, EditObject, PageGeometry, PendingImage, Rect } from "../types";
import { EditObjectView } from "./edit-object-view";

/** Cap on the rendered canvas width; pages are shown at most ~1000 CSS px wide. */
const MAX_RENDER_WIDTH = 2400;

interface PdfPageEditorProps {
  doc: PDFDocumentProxy;
  pageNumber: number;
  geometry: PageGeometry;
  objects: EditObject[];
  selectedId: string | null;
  focusId: string | null;
  mode: EditMode;
  pendingImage: PendingImage | null;
  onSelect: (id: string | null) => void;
  onAdd: (object: EditObject, focus?: boolean) => void;
  onUpdate: (id: string, patch: Partial<EditObject>) => void;
  onRemove: (id: string) => void;
  onPlaced: () => void;
}

export const PdfPageEditor = memo(function PdfPageEditor({
  doc,
  pageNumber,
  geometry,
  objects,
  selectedId,
  focusId,
  mode,
  pendingImage,
  onSelect,
  onAdd,
  onUpdate,
  onRemove,
  onPlaced,
}: PdfPageEditorProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [lines, setLines] = useState<EditableLine[] | null>(null);

  // Render only once the page scrolls near the viewport.
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || visible) return;
    const observer = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setVisible(true), {
      rootMargin: "600px",
    });
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();
    (async () => {
      const cssWidth = wrapperRef.current?.clientWidth ?? 800;
      const pixelWidth = Math.min(cssWidth * Math.min(window.devicePixelRatio || 1, 2), MAX_RENDER_WIDTH);
      const output = await renderPage(doc, pageNumber, pixelWidth / geometry.width, controller.signal);
      const canvas = canvasRef.current;
      if (canvas && !controller.signal.aborted) {
        canvas.width = output.width;
        canvas.height = output.height;
        canvas.getContext("2d", { willReadFrequently: true })?.drawImage(output, 0, 0);
        setRendered(true);
      }
      releaseCanvas(output);
    })().catch((error) => {
      if (!controller.signal.aborted) console.error(error);
    });
    return () => controller.abort();
  }, [doc, pageNumber, geometry.width, visible]);

  // Existing text is only needed in "edit text" mode, and only for pages that have been rendered.
  useEffect(() => {
    if (mode !== "edit-text" || !rendered || lines) return;
    let cancelled = false;
    (async () => {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      const fontNames = new Map<string, string>();
      for (const item of content.items) {
        if (!("fontName" in item) || fontNames.has(item.fontName)) continue;
        try {
          const font = page.commonObjs.has(item.fontName) ? page.commonObjs.get(item.fontName) : null;
          if (font?.name) fontNames.set(item.fontName, font.name as string);
        } catch {
          // Font not loaded on the main thread; classification falls back to the CSS family.
        }
      }
      const items = content.items.filter((item): item is RawTextItem & typeof item => "str" in item);
      const extracted = extractEditableLines(
        items,
        content.styles as Record<string, RawTextStyle>,
        page.getViewport({ scale: 1 }).transform,
        pageNumber,
        fontNames,
      );
      if (!cancelled) setLines(extracted);
    })().catch((error) => console.error(error));
    return () => {
      cancelled = true;
    };
  }, [doc, pageNumber, mode, rendered, lines]);

  const toPagePoint = (event: { clientX: number; clientY: number }) => {
    const rect = wrapperRef.current!.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * geometry.width,
      y: ((event.clientY - rect.top) / rect.height) * geometry.height,
    };
  };

  /** Colour just outside `rect` on the rendered page, so a cover blends into coloured backgrounds too. */
  const sampleBackground = (rect: Rect): string => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !ctx || !rendered) return "#ffffff";
    const scale = canvas.width / geometry.width;
    const samples: Rgb[] = [];
    const points: [number, number][] = [];
    for (let i = 0; i <= 4; i++) {
      const fx = rect.x + (rect.width * i) / 4;
      const fy = rect.y + (rect.height * i) / 4;
      points.push([fx, rect.y - 1.5], [fx, rect.y + rect.height + 1.5], [rect.x - 1.5, fy], [rect.x + rect.width + 1.5, fy]);
    }
    for (const [px, py] of points) {
      const cx = Math.round(px * scale);
      const cy = Math.round(py * scale);
      if (cx < 0 || cy < 0 || cx >= canvas.width || cy >= canvas.height) continue;
      const [r, g, b] = ctx.getImageData(cx, cy, 1, 1).data;
      samples.push([r, g, b]);
    }
    return pickBackground(samples);
  };

  const editLine = (line: EditableLine) => {
    const existing = objects.find((object) => object.kind === "text" && object.id === line.key);
    if (existing) return onSelect(existing.id);
    const pad = line.fontSize * 0.08;
    const cover = {
      x: line.x - pad,
      y: line.baseline - line.ascent * line.fontSize - pad,
      width: line.width + pad * 2,
      height: (line.ascent + line.descent) * line.fontSize + pad * 2,
    };
    onAdd(
      {
        kind: "text",
        // Keyed by the line so clicking it again selects the same edit.
        id: line.key,
        page: pageNumber,
        x: line.x,
        y: line.baseline - BASELINE_RATIO[line.font] * line.fontSize,
        text: line.text,
        original: line.text,
        fontSize: Math.round(line.fontSize * 10) / 10,
        font: line.font,
        bold: line.bold,
        color: DEFAULT_TEXT.color,
        cover: { ...cover, color: sampleBackground(cover) },
      },
      true,
    );
  };

  const handleOverlayPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    const point = toPagePoint(event);

    if (mode === "add-text") {
      event.preventDefault();
      onAdd(
        {
          kind: "text",
          id: createId(),
          page: pageNumber,
          x: point.x,
          // Put the click in the middle of the first line.
          y: Math.max(0, point.y - (DEFAULT_TEXT.fontSize * LINE_HEIGHT) / 2),
          text: "",
          fontSize: DEFAULT_TEXT.fontSize,
          font: DEFAULT_TEXT.font,
          bold: false,
          color: DEFAULT_TEXT.color,
        },
        true,
      );
      return;
    }

    if (mode === "place" && pendingImage) {
      event.preventDefault();
      const maxWidth = pendingImage.signature ? SIGNATURE_WIDTH_PT : geometry.width * IMAGE_MAX_PAGE_SHARE;
      const width = Math.min(pendingImage.width * 0.75, maxWidth);
      const height = (width * pendingImage.height) / pendingImage.width;
      onAdd({
        kind: "image",
        id: createId(),
        page: pageNumber,
        x: point.x - width / 2,
        y: point.y - height / 2,
        width,
        height,
        src: pendingImage.src,
        signature: pendingImage.signature,
      });
      onPlaced();
      return;
    }

    if (mode === "whiteout") {
      event.preventDefault();
      const id = createId();
      onAdd({ kind: "whiteout", id, page: pageNumber, x: point.x, y: point.y, width: 0, height: 0, color: DEFAULT_WHITEOUT_COLOR });
      const move = (e: PointerEvent) => {
        const current = toPagePoint(e);
        onUpdate(id, {
          x: Math.min(point.x, current.x),
          y: Math.min(point.y, current.y),
          width: Math.abs(current.x - point.x),
          height: Math.abs(current.y - point.y),
        });
      };
      const up = (e: PointerEvent) => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        const current = toPagePoint(e);
        if (Math.abs(current.x - point.x) < 3 || Math.abs(current.y - point.y) < 3) onRemove(id);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      return;
    }

    onSelect(null);
  };

  const editedKeys = new Set(objects.map((object) => object.id));

  return (
    <div
      ref={wrapperRef}
      className="relative mx-auto w-full max-w-[1000px] bg-white shadow-md"
      style={{ aspectRatio: `${geometry.width} / ${geometry.height}`, containerType: "inline-size" }}
    >
      <canvas ref={canvasRef} aria-hidden className={cn("absolute inset-0 size-full", !rendered && "invisible")} />
      {!rendered && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="size-5 animate-spin text-neutral-400" aria-hidden />
        </div>
      )}
      <div
        data-page-overlay
        aria-label={`Page ${pageNumber}`}
        onPointerDown={handleOverlayPointerDown}
        className={cn(
          "absolute inset-0 touch-pan-y",
          (mode === "add-text" || mode === "place") && "cursor-crosshair",
          mode === "whiteout" && "cursor-crosshair touch-none",
        )}
      >
        {mode === "edit-text" &&
          lines
            ?.filter((line) => !editedKeys.has(line.key))
            .map((line) => (
              <button
                key={line.key}
                type="button"
                title="Click to edit this text"
                aria-label={`Edit text: ${line.text}`}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  editLine(line);
                }}
                className="absolute cursor-text rounded-[2px] bg-brand/10 outline-1 outline-brand/40 transition-colors hover:bg-brand/20 hover:outline-brand focus-visible:outline-2"
                style={{
                  left: `${(line.x / geometry.width) * 100}%`,
                  top: `${((line.baseline - line.ascent * line.fontSize) / geometry.height) * 100}%`,
                  width: `${(line.width / geometry.width) * 100}%`,
                  height: `${(((line.ascent + line.descent) * line.fontSize) / geometry.height) * 100}%`,
                }}
              />
            ))}
        {objects.map((object) => (
          <EditObjectView
            key={object.id}
            object={object}
            geometry={geometry}
            selected={object.id === selectedId}
            autoFocus={object.id === focusId}
            onSelect={onSelect}
            onUpdate={onUpdate}
          />
        ))}
      </div>
      <span className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs tabular-nums text-muted">
        {pageNumber}
      </span>
    </div>
  );
});
