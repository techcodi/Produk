"use client";

import { useRef, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import { cn } from "@/lib/cn";
import type { Framing, PhotoBackground, PhotoSpec } from "../types";

interface PhotoEditorProps {
  imageUrl: string;
  imageSize: { width: number; height: number };
  spec: PhotoSpec;
  framing: Framing;
  background: PhotoBackground;
  showGuides: boolean;
  onChange: (framing: Framing) => void;
  disabled?: boolean;
}

const pct = (value: number, total: number) => `${(value / total) * 100}%`;

/**
 * The photo inside a frame with the document's proportions. Drag to move it;
 * wheel or pinch to zoom. Everything is positioned in percentages of the
 * frame, computed from the same Framing used when printing.
 */
export function PhotoEditor({ imageUrl, imageSize, spec, framing, background, showGuides, onChange, disabled }: PhotoEditorProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ framing: Framing; distance: number; x: number; y: number } | null>(null);

  /** On-screen pixels per millimetre of the frame. */
  const pxPerMm = () => (frameRef.current?.getBoundingClientRect().width ?? 1) / spec.widthMm;

  const startGesture = () => {
    const points = [...pointers.current.values()];
    const [a, b] = points;
    gesture.current = {
      framing,
      distance: b ? Math.hypot(a.x - b.x, a.y - b.y) : 0,
      x: b ? (a.x + b.x) / 2 : a.x,
      y: b ? (a.y + b.y) / 2 : a.y,
    };
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    startGesture();
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId) || !gesture.current) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...pointers.current.values()];
    const start = gesture.current;
    const [a, b] = points;
    const x = b ? (a.x + b.x) / 2 : a.x;
    const y = b ? (a.y + b.y) / 2 : a.y;
    const zoom = b && start.distance > 0 ? Math.hypot(a.x - b.x, a.y - b.y) / start.distance : 1;
    const mmPerPx = start.framing.mmPerPx * zoom;
    // Moving the photo right means the frame's centre shows a point further left in the source.
    const shift = (pixels: number) => pixels / pxPerMm() / mmPerPx;
    onChange({
      mmPerPx,
      centerX: start.framing.centerX - shift(x - start.x),
      centerY: start.framing.centerY - shift(y - start.y),
    });
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size > 0) startGesture();
    else gesture.current = null;
  };

  const onWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.preventDefault();
    onChange({ ...framing, mmPerPx: framing.mmPerPx * Math.exp(-event.deltaY * 0.0015) });
  };

  // Photo placement in mm relative to the frame's top-left corner.
  const left = spec.widthMm / 2 - framing.centerX * framing.mmPerPx;
  const top = spec.heightMm / 2 - framing.centerY * framing.mmPerPx;
  const crown = spec.crownMarginMm;
  const [chinMin, chinMax] = [crown + spec.headMm[0], crown + spec.headMm[1]];

  return (
    <div className="flex justify-center rounded-2xl border border-border bg-surface-muted p-4 sm:p-8">
      <div
        ref={frameRef}
        role="application"
        aria-label="Photo position. Drag to move, scroll or pinch to zoom."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        className={cn("relative w-full max-w-[min(340px,100%)] touch-none overflow-hidden shadow-lg select-none", !disabled && "cursor-grab active:cursor-grabbing")}
        style={{
          aspectRatio: `${spec.widthMm} / ${spec.heightMm}`,
          background: background === "original" ? "#ffffff" : background,
          maxHeight: "60vh",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- local blob URL, next/image adds nothing here */}
        <img
          src={imageUrl}
          alt=""
          draggable={false}
          className="pointer-events-none absolute max-w-none"
          style={{
            left: pct(left, spec.widthMm),
            top: pct(top, spec.heightMm),
            width: pct(imageSize.width * framing.mmPerPx, spec.widthMm),
            height: pct(imageSize.height * framing.mmPerPx, spec.heightMm),
          }}
        />

        {showGuides && (
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute inset-y-0 left-1/2 border-l border-dashed border-sky-500/60" />
            <Guide at={pct(crown, spec.heightMm)} label="Top of head" />
            <div
              className="absolute inset-x-0 border-y border-dashed border-sky-500/80 bg-sky-500/10"
              style={{ top: pct(chinMin, spec.heightMm), height: pct(chinMax - chinMin, spec.heightMm) }}
            >
              <span className="absolute right-1 top-0.5 rounded bg-sky-600/90 px-1 text-[10px] font-medium text-white">Chin</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Guide({ at, label }: { at: string; label: string }) {
  return (
    <div className="absolute inset-x-0 border-t border-dashed border-sky-500/80" style={{ top: at }}>
      <span className="absolute right-1 top-0.5 rounded bg-sky-600/90 px-1 text-[10px] font-medium text-white">{label}</span>
    </div>
  );
}
