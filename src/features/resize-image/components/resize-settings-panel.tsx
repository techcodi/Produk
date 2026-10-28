"use client";

import { SegmentedControl, type SegmentedOption } from "@/components/ui/segmented-control";
import { TextField } from "@/components/ui/text-field";
import type { ResizeFormat, ResizeMode, ResizeSettings } from "../types";

const MODE_OPTIONS: SegmentedOption<ResizeMode>[] = [
  { value: "percent", label: "Percentage" },
  { value: "pixels", label: "Exact size" },
];

const PERCENT_PRESETS = ["25", "50", "75"] as const;

const FORMAT_OPTIONS: SegmentedOption<ResizeFormat>[] = [
  { value: "original", label: "Same" },
  { value: "jpeg", label: "JPG" },
  { value: "png", label: "PNG" },
  { value: "webp", label: "WebP" },
];

const FORMAT_HINTS: Record<ResizeFormat, string> = {
  original: "Keeps JPG, PNG and WebP as they are; other formats become JPG.",
  jpeg: "Opens everywhere. Transparent areas become white.",
  png: "Lossless, keeps transparency. Larger files.",
  webp: "Small files that keep transparency.",
};

const digitsOnly = (value: string) => value.replace(/\D/g, "").slice(0, 5);

interface ResizeSettingsPanelProps {
  settings: ResizeSettings;
  error?: string;
  onChange: (patch: Partial<ResizeSettings>) => void;
  disabled?: boolean;
}

export function ResizeSettingsPanel({ settings, error, onChange, disabled }: ResizeSettingsPanelProps) {
  return (
    <div className="space-y-5">
      <SegmentedControl label="Resize by" value={settings.mode} options={MODE_OPTIONS} onChange={(mode) => onChange({ mode })} disabled={disabled} />

      {settings.mode === "percent" ? (
        <div className="space-y-2">
          <TextField
            label="Scale"
            value={settings.percent}
            onChange={(percent) => onChange({ percent: digitsOnly(percent) })}
            inputMode="numeric"
            suffix="%"
            disabled={disabled}
            error={error}
            hint="Below 100% shrinks, above 100% enlarges."
          />
          <div className="flex gap-1">
            {PERCENT_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onChange({ percent: preset })}
                disabled={disabled}
                aria-pressed={settings.percent === preset}
                className="h-8 flex-1 rounded-md bg-surface-muted text-xs font-medium text-muted transition hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50 aria-pressed:bg-brand-soft aria-pressed:text-brand"
              >
                {preset}%
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Width"
              value={settings.width}
              onChange={(width) => onChange({ width: digitsOnly(width) })}
              inputMode="numeric"
              placeholder="Auto"
              suffix="px"
              disabled={disabled}
            />
            <TextField
              label="Height"
              value={settings.height}
              onChange={(height) => onChange({ height: digitsOnly(height) })}
              inputMode="numeric"
              placeholder="Auto"
              suffix="px"
              disabled={disabled}
            />
          </div>
          <label className="flex items-start gap-2 text-sm has-disabled:opacity-50">
            <input
              type="checkbox"
              checked={settings.keepAspect}
              onChange={(event) => onChange({ keepAspect: event.target.checked })}
              disabled={disabled}
              className="mt-0.5 size-4 accent-brand"
            />
            <span>
              Keep aspect ratio
              <span className="block text-xs text-muted">
                {settings.keepAspect ? "Fits each image inside the size, never stretching it." : "Stretches each image to exactly this size."}
              </span>
            </span>
          </label>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
      )}

      <SegmentedControl
        label="Output format"
        value={settings.format}
        options={FORMAT_OPTIONS}
        onChange={(format) => onChange({ format })}
        disabled={disabled}
        hint={FORMAT_HINTS[settings.format]}
      />
    </div>
  );
}
