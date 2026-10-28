"use client";

import { useMemo } from "react";
import { cn } from "@/lib/cn";

/**
 * Shows the card exactly as exported: the same SVG, drawn as an image (so it
 * uses the same system fonts as the PNG/PDF and can't run anything). A data URL
 * rather than a blob URL: nothing to revoke, so it survives re-renders and
 * StrictMode's double effects.
 */
export function CardPreview({ svg, aspect, className }: { svg: string; aspect: number; className?: string }) {
  const src = useMemo(() => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, [svg]);

  return (
    <div className={cn("flex items-center justify-center rounded-2xl bg-surface-muted p-4 sm:p-6", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- a generated SVG, nothing for next/image to optimise */}
      <img
        src={src}
        alt="Card preview"
        className="h-auto max-h-[60vh] w-auto max-w-full rounded-md shadow-lg ring-1 ring-black/5"
        style={{ aspectRatio: aspect }}
      />
    </div>
  );
}
