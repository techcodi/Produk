"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Caveat, Dancing_Script } from "next/font/google";
import { Eraser, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TextField } from "@/components/ui/text-field";
import { cn } from "@/lib/cn";
import type { PendingImage } from "../types";

const dancingScript = Dancing_Script({ subsets: ["latin"], weight: "600", display: "swap" });
const caveat = Caveat({ subsets: ["latin"], weight: "600", display: "swap" });

const TYPED_FONTS = [
  { id: "dancing", label: "Script", font: dancingScript },
  { id: "caveat", label: "Handwritten", font: caveat },
] as const;

const INKS = [
  { value: "#111111", label: "Black" },
  { value: "#1d3fb8", label: "Blue" },
] as const;

type Tab = "draw" | "type";

/**
 * Crops a canvas to its non-transparent pixels (plus a little padding) and
 * returns it as a PNG. `pixelRatio` is canvas pixels per CSS pixel.
 */
function cropToInk(source: HTMLCanvasElement, pixelRatio: number): PendingImage | null {
  const ctx = source.getContext("2d");
  if (!ctx) return null;
  const { width, height } = source;
  const { data } = ctx.getImageData(0, 0, width, height);
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;

  const pad = 6;
  const crop = { x: Math.max(0, minX - pad), y: Math.max(0, minY - pad), w: 0, h: 0 };
  crop.w = Math.min(width, maxX + pad) - crop.x;
  crop.h = Math.min(height, maxY + pad) - crop.y;
  const out = document.createElement("canvas");
  out.width = crop.w;
  out.height = crop.h;
  out.getContext("2d")!.drawImage(source, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
  return { src: out.toDataURL("image/png"), width: crop.w / pixelRatio, height: crop.h / pixelRatio, signature: true };
}

interface SignatureDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (signature: PendingImage) => void;
}

export function SignatureDialog({ open, onClose, onCreate }: SignatureDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const padRef = useRef<HTMLCanvasElement>(null);
  const [tab, setTab] = useState<Tab>("draw");
  const [ink, setInk] = useState<string>(INKS[0].value);
  const [hasInk, setHasInk] = useState(false);
  const [name, setName] = useState("");
  const [fontId, setFontId] = useState<(typeof TYPED_FONTS)[number]["id"]>("dancing");
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Size the drawing pad's backing store to its on-screen size for crisp strokes.
  useEffect(() => {
    if (!open || tab !== "draw") return;
    const pad = padRef.current;
    if (!pad) return;
    const ratio = window.devicePixelRatio || 1;
    pad.width = pad.clientWidth * ratio;
    pad.height = pad.clientHeight * ratio;
    setHasInk(false);
  }, [open, tab]);

  const point = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = event.currentTarget.width / rect.width;
    return { x: (event.clientX - rect.left) * ratio, y: (event.clientY - rect.top) * ratio };
  };

  const draw = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const ctx = event.currentTarget.getContext("2d");
    const from = lastPoint.current;
    if (!ctx || !from) return;
    const to = point(event);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2.5 * (window.devicePixelRatio || 1);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    lastPoint.current = to;
    setHasInk(true);
  };

  const clearPad = () => {
    const pad = padRef.current;
    pad?.getContext("2d")?.clearRect(0, 0, pad.width, pad.height);
    setHasInk(false);
  };

  const typedFont = TYPED_FONTS.find((f) => f.id === fontId)!.font;

  const createTyped = async (): Promise<PendingImage | null> => {
    const family = typedFont.style.fontFamily;
    const size = 96;
    await document.fonts.load(`600 ${size}px ${family}`);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    ctx.font = `600 ${size}px ${family}`;
    canvas.width = Math.ceil(ctx.measureText(name).width + size);
    canvas.height = size * 2;
    ctx.font = `600 ${size}px ${family}`;
    ctx.fillStyle = ink;
    ctx.textBaseline = "middle";
    ctx.fillText(name, size / 2, size);
    // Drawn at twice the size it is placed at, so it stays sharp when printed.
    return cropToInk(canvas, 2);
  };

  const confirm = async () => {
    const pad = padRef.current;
    const signature = tab === "draw" ? (pad ? cropToInk(pad, pad.width / pad.clientWidth) : null) : await createTyped();
    if (signature) onCreate(signature);
  };

  const canConfirm = tab === "draw" ? hasInk : name.trim().length > 0;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="signature-title"
      className="m-auto w-[min(560px,calc(100vw-2rem))] rounded-2xl border border-border bg-surface p-0 text-foreground shadow-2xl backdrop:bg-black/40"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 id="signature-title" className="font-semibold">
          Create your signature
        </h2>
        <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
          <X />
        </Button>
      </div>

      <div className="space-y-4 p-5">
        <SegmentedControl
          label="Method"
          value={tab}
          options={[
            { value: "draw", label: "Draw" },
            { value: "type", label: "Type" },
          ]}
          onChange={setTab}
        />

        {tab === "draw" ? (
          <div className="space-y-2">
            <div className="relative overflow-hidden rounded-xl border border-border bg-white">
              <canvas
                ref={padRef}
                aria-label="Signature pad. Draw your signature with a mouse, finger or stylus."
                className="block h-48 w-full cursor-crosshair touch-none"
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  lastPoint.current = point(event);
                }}
                onPointerMove={(event) => lastPoint.current && draw(event)}
                onPointerUp={() => (lastPoint.current = null)}
                onPointerCancel={() => (lastPoint.current = null)}
              />
              <span className="pointer-events-none absolute inset-x-8 bottom-10 border-b border-neutral-300" />
              {!hasInk && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-neutral-400">
                  Sign here
                </span>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={clearPad} disabled={!hasInk}>
              <Eraser /> Clear
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <TextField label="Your name" value={name} onChange={setName} placeholder="e.g. Ada Obi" maxLength={60} autoFocus />
            <div className="grid grid-cols-2 gap-2">
              {TYPED_FONTS.map(({ id, label, font }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={fontId === id}
                  aria-label={`${label} style`}
                  onClick={() => setFontId(id)}
                  className={cn(
                    "h-20 truncate rounded-xl border bg-white px-3 text-3xl text-neutral-900 focus-visible:outline-2 focus-visible:outline-brand",
                    fontId === id ? "border-brand ring-2 ring-brand" : "border-border",
                    font.className,
                  )}
                  style={{ color: ink }}
                >
                  {name.trim() || "Your name"}
                </button>
              ))}
            </div>
          </div>
        )}

        <fieldset className="flex items-center gap-3">
          <legend className="sr-only">Ink colour</legend>
          <span className="text-sm font-medium">Ink</span>
          {INKS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-label={label}
              aria-pressed={ink === value}
              onClick={() => setInk(value)}
              className={cn("size-7 rounded-full border-2", ink === value ? "border-brand" : "border-transparent")}
            >
              <span className="block size-full rounded-full border-2 border-surface" style={{ background: value }} />
            </button>
          ))}
        </fieldset>
      </div>

      <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={confirm} disabled={!canConfirm}>
          Use signature
        </Button>
      </div>
    </dialog>
  );
}
