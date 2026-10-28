"use client";

import { useRef, useState } from "react";
import { Check, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SegmentedControl, type SegmentedOption } from "@/components/ui/segmented-control";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/format";
import { IMAGE_ACCEPT_ATTRIBUTE, isSupportedImage } from "@/lib/images";
import { toEmbeddableDataUrl } from "@/lib/embed-image";
import { ACCENT_SWATCHES, LOGO_MAX_DIMENSION, MAX_LOGO_FILE_SIZE_BYTES, PAGE_SIZES, TEMPLATES } from "../constants";
import type { InvoiceDispatch } from "../hooks/use-invoice-draft";
import type { InvoiceStyle, PageSize } from "../types";
import { FormSection } from "./form-section";
import { TemplateThumbnail } from "./template-thumbnail";

const PAGE_SIZE_OPTIONS: SegmentedOption<PageSize>[] = (Object.keys(PAGE_SIZES) as PageSize[]).map((size) => ({
  value: size,
  label: PAGE_SIZES[size].label,
}));

interface DesignPanelProps {
  style: InvoiceStyle;
  dispatch: InvoiceDispatch;
}

export function DesignPanel({ style, dispatch }: DesignPanelProps) {
  const setStyle = (patch: Partial<InvoiceStyle>) => dispatch({ type: "style", patch });

  return (
    <div className="space-y-4">
      <FormSection title="Template" description="Pick a layout. Your details carry over.">
        <div role="radiogroup" aria-label="Template" className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-3 xl:grid-cols-5">
          {TEMPLATES.map((template) => {
            const selected = style.template === template.id;
            return (
              <button
                key={template.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => dispatch({ type: "template", template: template.id })}
                className="group text-left focus-visible:outline-none"
              >
                <div
                  className={cn(
                    "relative rounded-lg p-1 ring-2 transition group-focus-visible:ring-brand",
                    selected ? "ring-brand" : "ring-transparent group-hover:ring-border",
                  )}
                >
                  <TemplateThumbnail template={template.id} accent={selected ? style.accent : template.accent} />
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
      </FormSection>

      <FormSection title="Colour">
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
                onClick={() => setStyle({ accent: color })}
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
              onChange={(event) => setStyle({ accent: event.target.value })}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="Custom accent colour"
            />
          </label>
        </div>
      </FormSection>

      <FormSection title="Logo" description="PNG, JPG or any photo. Stays on your device.">
        <LogoPicker logo={style.logo} onChange={(logo) => setStyle({ logo })} />
      </FormSection>

      <FormSection title="Paper">
        <SegmentedControl
          label="Page size"
          value={style.pageSize}
          options={PAGE_SIZE_OPTIONS}
          onChange={(pageSize) => setStyle({ pageSize })}
          hint={style.pageSize === "A4" ? "Standard in most of the world." : "Standard in the US and Canada."}
        />
      </FormSection>
    </div>
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
      onChange(await toEmbeddableDataUrl(file, { maxDimension: LOGO_MAX_DIMENSION }));
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
