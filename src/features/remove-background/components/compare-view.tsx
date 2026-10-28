"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { BackgroundChoice } from "../types";

/** Grey/white checks, the usual way to show transparency. */
const CHECKERBOARD: CSSProperties = {
  backgroundColor: "#ffffff",
  backgroundImage: "conic-gradient(#e5e7eb 25%, transparent 0 50%, #e5e7eb 0 75%, transparent 0)",
  backgroundSize: "20px 20px",
};

interface CompareViewProps {
  originalUrl: string;
  resultUrl: string | null;
  background: BackgroundChoice;
  width: number;
  height: number;
  /** Shown over the image while working, e.g. a progress label. */
  overlay?: ReactNode;
}

/** Before/after view: drag the handle to reveal the original on the left. */
export function CompareView({ originalUrl, resultUrl, background, width, height, overlay }: CompareViewProps) {
  const [split, setSplit] = useState(50);
  const backdrop = background === "transparent" ? CHECKERBOARD : { backgroundColor: background };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface-muted p-3 sm:p-6">
      <div className="relative mx-auto max-h-[70vh] w-fit max-w-full" style={{ aspectRatio: `${width} / ${height}` }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- local blob URL, next/image adds nothing here */}
        <img src={originalUrl} alt="Original" className="block max-h-[70vh] max-w-full rounded-lg object-contain" />

        {resultUrl && (
          <div className="absolute inset-0 overflow-hidden rounded-lg" style={{ ...backdrop, clipPath: `inset(0 0 0 ${split}%)` }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob URL, next/image adds nothing here */}
            <img src={resultUrl} alt="Background removed" className="size-full object-contain" />
          </div>
        )}

        {resultUrl && (
          <>
            <div aria-hidden className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.2)]" style={{ left: `${split}%` }}>
              <span className="absolute top-1/2 left-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white text-xs text-neutral-700 shadow">
                ⇆
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={split}
              onChange={(event) => setSplit(Number(event.target.value))}
              aria-label="Compare original and result"
              className="absolute inset-0 size-full cursor-ew-resize opacity-0"
            />
            <span className="pointer-events-none absolute top-2 left-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-white">Before</span>
            <span className="pointer-events-none absolute top-2 right-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-white">After</span>
          </>
        )}

        {overlay && (
          <div className={cn("absolute inset-0 flex items-center justify-center rounded-lg bg-black/45 p-4 text-center text-sm font-medium text-white backdrop-blur-[1px]")}>
            {overlay}
          </div>
        )}
      </div>
    </div>
  );
}
