"use client";

import type { ReactNode } from "react";
import { Bold, ImagePlus, Minus, MousePointer2, PenLine, Plus, Square, TextCursorInput, Trash2, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { COLOR_SWATCHES } from "../constants";
import type { EditMode, EditObject, FontFamily } from "../types";

const MODE_HINTS: Record<EditMode, string> = {
  select: "Click anything you’ve added to move or change it.",
  "edit-text": "Click any highlighted text to change it.",
  "add-text": "Click anywhere on a page to add text.",
  whiteout: "Drag over anything to cover it up. It’s hidden, not removed — don’t rely on this to redact private information.",
  place: "Click where it should go on the page.",
};

interface EditToolbarProps {
  mode: EditMode;
  selected: EditObject | null;
  disabled?: boolean;
  onModeChange: (mode: EditMode) => void;
  onSign: () => void;
  onAddImage: () => void;
  onUpdate: (patch: Partial<EditObject>) => void;
  onDelete: () => void;
}

export function EditToolbar({ mode, selected, disabled, onModeChange, onSign, onAddImage, onUpdate, onDelete }: EditToolbarProps) {
  return (
    <div className="sticky top-16 z-20 space-y-2 rounded-xl border border-border bg-surface/95 p-2 shadow-sm backdrop-blur">
      <div role="toolbar" aria-label="Editing tools" className="flex flex-wrap items-center gap-1">
        <ModeButton icon={<MousePointer2 />} label="Select" active={mode === "select"} onClick={() => onModeChange("select")} disabled={disabled} />
        <ModeButton icon={<TextCursorInput />} label="Edit text" active={mode === "edit-text"} onClick={() => onModeChange("edit-text")} disabled={disabled} />
        <ModeButton icon={<Type />} label="Add text" active={mode === "add-text"} onClick={() => onModeChange("add-text")} disabled={disabled} />
        <ModeButton icon={<PenLine />} label="Sign" onClick={onSign} disabled={disabled} />
        <ModeButton icon={<ImagePlus />} label="Image" onClick={onAddImage} disabled={disabled} />
        <ModeButton icon={<Square />} label="Whiteout" active={mode === "whiteout"} onClick={() => onModeChange("whiteout")} disabled={disabled} />
      </div>

      {selected ? (
        <ObjectProperties object={selected} disabled={disabled} onUpdate={onUpdate} onDelete={onDelete} />
      ) : (
        <p className={cn("px-1 text-xs", mode === "place" ? "font-medium text-brand" : "text-muted")} aria-live="polite">
          {MODE_HINTS[mode]}
        </p>
      )}
    </div>
  );
}

function ModeButton({ icon, label, active, disabled, onClick }: { icon: ReactNode; label: string; active?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors [&_svg]:size-4",
        "focus-visible:outline-2 focus-visible:outline-brand disabled:pointer-events-none disabled:opacity-50",
        active ? "bg-brand text-brand-foreground" : "text-muted hover:bg-surface-muted hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

const FONT_LABELS: Record<FontFamily, string> = { sans: "Sans", serif: "Serif", mono: "Mono" };

interface ObjectPropertiesProps {
  object: EditObject;
  disabled?: boolean;
  onUpdate: (patch: Partial<EditObject>) => void;
  onDelete: () => void;
}

function ObjectProperties({ object, disabled, onUpdate, onDelete }: ObjectPropertiesProps) {
  const label = object.kind === "text" ? (object.cover ? "Edited text" : "Text") : object.kind === "image" ? (object.signature ? "Signature" : "Image") : "Whiteout";

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border px-1 pt-2 text-sm">
      <span className="font-medium">{label}</span>

      {object.kind === "text" && (
        <>
          <select
            aria-label="Font"
            value={object.font}
            onChange={(event) => onUpdate({ font: event.target.value as FontFamily })}
            disabled={disabled}
            className="h-8 rounded-md border border-border bg-surface px-2 focus-visible:outline-2 focus-visible:outline-brand"
          >
            {(Object.keys(FONT_LABELS) as FontFamily[]).map((font) => (
              <option key={font} value={font}>
                {FONT_LABELS[font]}
              </option>
            ))}
          </select>
          <div className="flex items-center rounded-md border border-border">
            <Button variant="ghost" size="icon" aria-label="Smaller text" onClick={() => onUpdate({ fontSize: Math.max(4, object.fontSize - 1) })} disabled={disabled}>
              <Minus />
            </Button>
            <span className="w-10 text-center tabular-nums" aria-label="Font size">
              {Math.round(object.fontSize)}
            </span>
            <Button variant="ghost" size="icon" aria-label="Larger text" onClick={() => onUpdate({ fontSize: Math.min(144, object.fontSize + 1) })} disabled={disabled}>
              <Plus />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Bold"
            aria-pressed={object.bold}
            className={cn(object.bold && "bg-brand-soft text-brand")}
            onClick={() => onUpdate({ bold: !object.bold })}
            disabled={disabled}
          >
            <Bold />
          </Button>
          <ColorPicker value={object.color} onChange={(color) => onUpdate({ color })} disabled={disabled} label="Text colour" />
        </>
      )}

      {object.kind === "whiteout" && (
        <ColorPicker value={object.color} onChange={(color) => onUpdate({ color })} disabled={disabled} label="Box colour" />
      )}

      {object.kind === "text" && object.cover && (
        <ColorPicker
          value={object.cover.color}
          onChange={(color) => onUpdate({ cover: { ...object.cover!, color } })}
          disabled={disabled}
          label="Background"
        />
      )}

      <Button variant="danger" size="sm" className="ml-auto" onClick={onDelete} disabled={disabled}>
        <Trash2 /> {object.kind === "text" && object.cover ? "Undo edit" : "Delete"}
      </Button>
    </div>
  );
}

function ColorPicker({ value, onChange, disabled, label }: { value: string; onChange: (color: string) => void; disabled?: boolean; label: string }) {
  return (
    <fieldset className="flex items-center gap-1" disabled={disabled}>
      <legend className="sr-only">{label}</legend>
      <span className="mr-1 text-xs text-muted">{label}</span>
      {COLOR_SWATCHES.map((swatch) => (
        <button
          key={swatch}
          type="button"
          aria-label={swatch}
          aria-pressed={value.toLowerCase() === swatch}
          onClick={() => onChange(swatch)}
          className={cn("size-6 rounded-full border", value.toLowerCase() === swatch ? "border-brand ring-2 ring-brand" : "border-border")}
          style={{ background: swatch }}
        />
      ))}
      <label className="relative size-6 cursor-pointer overflow-hidden rounded-full border border-border bg-[conic-gradient(red,yellow,lime,aqua,blue,magenta,red)]">
        <span className="sr-only">Custom colour</span>
        <input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
      </label>
    </fieldset>
  );
}
