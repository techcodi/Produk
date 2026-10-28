"use client";

import { useRef, useState, type ReactNode } from "react";
import { Check, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/format";
import { IMAGE_ACCEPT_ATTRIBUTE, isSupportedImage } from "@/lib/images";
import { toEmbeddableDataUrl } from "@/lib/embed-image";
import { LOGO_MAX_DIMENSION, ACCENT_SWATCHES, CARD_SIZES, MAX_LOGO_FILE_SIZE_BYTES, QR_OPTIONS, TEMPLATES } from "../constants";
import { renderCard, type Measurer } from "../core/templates";
import type { CardDetails, CardSizeId, CardStyle, QrMode } from "../types";
import { CardSvg } from "./card-svg";

const SIZE_OPTIONS = (Object.keys(CARD_SIZES) as CardSizeId[]).map((value) => ({ value, label: CARD_SIZES[value].label }));

interface CardDesignPanelProps {
  style: CardStyle;
  /** What the template thumbnails show: the user's details, or the sample while the form is empty. */
  previewDetails: CardDetails;
  measure: Measurer;
  qrNotice: string | null;
  onChange: (patch: Partial<CardStyle>) => void;
}

export function CardDesignPanel({ style, previewDetails, measure, qrNotice, onChange }: CardDesignPanelProps) {
  return (
    <div className="space-y-4">
      <Section title="Template">
        <div role="radiogroup" aria-label="Template" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {TEMPLATES.map((template) => {
            const selected = style.template === template.id;
            const { front } = renderCard({ details: previewDetails, style: { ...style, template: template.id }, qr: null, measure });
            return (
              <button
                key={template.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange({ template: template.id })}
                className="group text-left focus-visible:outline-none"
              >
                <div
                  className={cn(
                    "relative rounded-lg p-1 ring-2 transition group-focus-visible:ring-brand",
                    selected ? "ring-brand" : "ring-transparent group-hover:ring-border",
                  )}
                >
                  <CardSvg svg={front} label={`${template.name} template`} className="shadow-sm" />
                  {selected && (
                    <span className="absolute right-0 top-0 flex size-5 -translate-y-1/3 translate-x-1/3 items-center justify-center rounded-full bg-brand text-brand-foreground">
                      <Check className="size-3" />
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-sm font-medium">{template.name}</p>
                <p className="text-xs text-muted">{template.description}</p>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Colour">
        <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Accent colour">
          {ACCENT_SWATCHES.map((color) => {
            const selected = style.accent.toLowerCase() === color;
            return (
              <button
                key={color}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={color}
                onClick={() => onChange({ accent: color })}
                className={cn(
                  "flex size-8 items-center justify-center rounded-full ring-offset-2 ring-offset-surface transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                  selected && "ring-2 ring-foreground",
                )}
                style={{ background: color }}
              >
                {selected && <Check className="size-4 text-white mix-blend-difference" />}
              </button>
            );
          })}
          <label className="relative inline-flex h-8 cursor-pointer items-center gap-2 rounded-full border border-border px-3 text-sm font-medium hover:bg-surface-muted focus-within:outline-2 focus-within:outline-brand">
            <span className="size-4 rounded-full ring-1 ring-border" style={{ background: style.accent }} />
            Custom
            <input
              type="color"
              value={style.accent}
              onChange={(event) => onChange({ accent: event.target.value })}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="Custom accent colour"
            />
          </label>
        </div>
      </Section>

      <Section title="Logo" description="PNG with a transparent background looks best.">
        <LogoPicker logo={style.logo} onChange={(logo) => onChange({ logo })} />
      </Section>

      <Section title="QR code" description="On the back of the card.">
        <SegmentedControl<QrMode>
          label="QR code content"
          value={style.qr}
          options={QR_OPTIONS}
          onChange={(qr) => onChange({ qr })}
          hint={
            qrNotice ??
            (style.qr === "vcard"
              ? "Scanning it adds you to their contacts."
              : style.qr === "website"
                ? "Scanning it opens your website."
                : undefined)
          }
        />
      </Section>

      <Section title="Size">
        <SegmentedControl<CardSizeId>
          label="Card size"
          value={style.size}
          options={SIZE_OPTIONS}
          onChange={(size) => onChange({ size })}
          hint={CARD_SIZES[style.size].hint}
        />
      </Section>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function LogoPicker({ logo, onChange }: { logo: string | null; onChange: (logo: string | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!isSupportedImage(file)) return setError("That file isn’t an image.");
    if (file.size > MAX_LOGO_FILE_SIZE_BYTES) return setError(`Please use an image under ${formatBytes(MAX_LOGO_FILE_SIZE_BYTES)}.`);
    setBusy(true);
    try {
      onChange(await toEmbeddableDataUrl(file, { maxDimension: LOGO_MAX_DIMENSION, quality: 0.92 }));
    } catch (cause) {
      console.error(cause);
      setError("This image couldn’t be read. Try a PNG or JPG.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {logo && (
          // eslint-disable-next-line @next/next/no-img-element -- a local data URL, nothing for next/image to optimise
          <img src={logo} alt="Your logo" className="h-14 max-w-40 rounded-md bg-white object-contain p-1 ring-1 ring-border" />
        )}
        <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <ImagePlus />}
          {logo ? "Replace logo" : "Add logo"}
        </Button>
        {logo && (
          <Button variant="danger" size="sm" onClick={() => onChange(null)} disabled={busy}>
            <Trash2 /> Remove
          </Button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={IMAGE_ACCEPT_ATTRIBUTE}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(event) => {
            void handleFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
