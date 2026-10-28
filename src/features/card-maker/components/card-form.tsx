"use client";

import { useRef, useState, type ReactNode } from "react";
import { Check, ImagePlus, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TextArea } from "@/components/ui/text-area";
import { TextField } from "@/components/ui/text-field";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/format";
import { IMAGE_ACCEPT_ATTRIBUTE, isSupportedImage } from "@/lib/images";
import { toEmbeddableDataUrl } from "@/lib/embed-image";
import { PHOTO_MAX_DIMENSION, ACCENT_SWATCHES, DESIGNS, FIELDS, FONTS, FORMATS, MAX_PHOTO_FILE_SIZE_BYTES, PHOTO_DESIGNS } from "../constants";
import type { CardMakerDispatch } from "../hooks/use-card-maker";
import type { CardDraft, CardKind, FontStyle } from "../types";

const FONT_OPTIONS = (Object.keys(FONTS) as FontStyle[]).map((value) => ({ value, label: FONTS[value].label }));

interface CardFormProps {
  kind: CardKind;
  draft: CardDraft;
  dispatch: CardMakerDispatch;
}

export function CardForm({ kind, draft, dispatch }: CardFormProps) {
  const set = (patch: Partial<CardDraft>) => dispatch({ type: "draft", patch });
  const formats = FORMATS[kind];
  const usesPhoto = PHOTO_DESIGNS[kind].includes(draft.design);

  return (
    <div className="space-y-4">
      <Section title="Design">
        <div className="space-y-4">
          <SegmentedControl
            label="Layout"
            value={draft.design}
            options={DESIGNS[kind].map((d) => ({ value: d.id, label: d.name }))}
            onChange={(design) => set({ design })}
          />
          {formats.length > 1 && (
            <SegmentedControl
              label="Size"
              value={draft.format}
              options={formats.map((f) => ({ value: f.id, label: f.label }))}
              onChange={(format) => set({ format })}
              hint={(() => {
                const f = formats.find((format) => format.id === draft.format) ?? formats[0];
                return `${f.widthMm} × ${f.heightMm} mm`;
              })()}
            />
          )}
          <SegmentedControl label="Font" value={draft.font} options={FONT_OPTIONS} onChange={(font) => set({ font })} />
          <AccentPicker value={draft.accent} onChange={(accent) => set({ accent })} />
        </div>
      </Section>

      <Section
        title="Words"
        aside={
          <Button variant="ghost" size="sm" onClick={() => dispatch({ type: "reset" })}>
            <RotateCcw /> Reset
          </Button>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS[kind].map((field) =>
            field.multiline ? (
              <TextArea
                key={field.key}
                label={field.label}
                value={draft.fields[field.key] ?? ""}
                placeholder={field.placeholder}
                maxLength={field.maxLength}
                hint={field.hint}
                rows={field.key === "message" ? 4 : 2}
                onChange={(value) => dispatch({ type: "field", key: field.key, value })}
                className="sm:col-span-2"
              />
            ) : (
              <TextField
                key={field.key}
                label={field.label}
                value={draft.fields[field.key] ?? ""}
                placeholder={field.placeholder}
                maxLength={field.maxLength}
                hint={field.hint}
                spellCheck
                onChange={(value) => dispatch({ type: "field", key: field.key, value })}
                className={field.key === "qr" || field.key === "headline" || field.key === "title" || field.key === "event" ? "sm:col-span-2" : undefined}
              />
            ),
          )}
        </div>
      </Section>

      {PHOTO_DESIGNS[kind].length > 0 && (
        <Section
          title={kind === "membership" ? "Photo or logo" : "Photo"}
          description={usesPhoto ? "Stays on your device." : `Used by the ${DESIGNS[kind].filter((d) => PHOTO_DESIGNS[kind].includes(d.id)).map((d) => d.name).join(" and ")} layout.`}
        >
          <PhotoPicker photo={draft.photo} onChange={(photo) => set({ photo })} />
        </Section>
      )}
    </div>
  );
}

function Section({ title, description, aside, children }: { title: string; description?: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

function AccentPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">Colour</legend>
      <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Colour">
        {ACCENT_SWATCHES.map((color) => {
          const selected = value.toLowerCase() === color;
          return (
            <button
              key={color}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={color}
              onClick={() => onChange(color)}
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
          <span className="size-4 rounded-full ring-1 ring-border" style={{ background: value }} />
          Custom
          <input
            type="color"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Custom colour"
          />
        </label>
      </div>
    </fieldset>
  );
}

function PhotoPicker({ photo, onChange }: { photo: string | null; onChange: (photo: string | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!isSupportedImage(file)) return setError("That file isn’t an image.");
    if (file.size > MAX_PHOTO_FILE_SIZE_BYTES) return setError(`Please use an image under ${formatBytes(MAX_PHOTO_FILE_SIZE_BYTES)}.`);
    setBusy(true);
    try {
      onChange(await toEmbeddableDataUrl(file, { maxDimension: PHOTO_MAX_DIMENSION, quality: 0.85 }));
    } catch (cause) {
      console.error(cause);
      setError("This image couldn’t be read. Try a JPG or PNG.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element -- a local data URL, nothing for next/image to optimise
          <img src={photo} alt="Your photo" className="size-14 rounded-md bg-white object-cover ring-1 ring-border" />
        )}
        <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <ImagePlus />}
          {photo ? "Replace" : "Add photo"}
        </Button>
        {photo && (
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
