"use client";

import { FileNameField } from "@/components/files/file-name-field";
import { SegmentedControl, type SegmentedOption } from "@/components/ui/segmented-control";
import type { MarginId, Orientation, PageSizeId, PdfSettings, QualityId } from "../types";

const PAGE_SIZE_OPTIONS: SegmentedOption<PageSizeId>[] = [
  { value: "a4", label: "A4" },
  { value: "letter", label: "Letter" },
  { value: "legal", label: "Legal" },
  { value: "fit", label: "Fit image" },
];

const ORIENTATION_OPTIONS: SegmentedOption<Orientation>[] = [
  { value: "auto", label: "Auto" },
  { value: "portrait", label: "Portrait" },
  { value: "landscape", label: "Landscape" },
];

const MARGIN_OPTIONS: SegmentedOption<MarginId>[] = [
  { value: "none", label: "None" },
  { value: "small", label: "Small" },
  { value: "large", label: "Large" },
];

const QUALITY_OPTIONS: SegmentedOption<QualityId>[] = [
  { value: "high", label: "High" },
  { value: "balanced", label: "Balanced" },
  { value: "small", label: "Small file" },
];

const QUALITY_HINTS: Record<QualityId, string> = {
  high: "Sharpest result, largest file. Best for printing.",
  balanced: "Great quality at a sensible size. Recommended.",
  small: "Smallest file — ideal for email and WhatsApp.",
};

interface SettingsPanelProps {
  settings: PdfSettings;
  onChange: (patch: Partial<PdfSettings>) => void;
  disabled?: boolean;
}

export function SettingsPanel({ settings, onChange, disabled }: SettingsPanelProps) {
  return (
    <div className="space-y-5">
      <SegmentedControl label="Page size" value={settings.pageSize} options={PAGE_SIZE_OPTIONS} onChange={(pageSize) => onChange({ pageSize })} disabled={disabled} />
      <SegmentedControl
        label="Orientation"
        value={settings.orientation}
        options={ORIENTATION_OPTIONS}
        onChange={(orientation) => onChange({ orientation })}
        disabled={disabled || settings.pageSize === "fit"}
        hint={settings.pageSize === "fit" ? "Each page matches its image." : settings.orientation === "auto" ? "Matches each image’s shape." : undefined}
      />
      <SegmentedControl label="Margin" value={settings.margin} options={MARGIN_OPTIONS} onChange={(margin) => onChange({ margin })} disabled={disabled} />
      <SegmentedControl
        label="Quality"
        value={settings.quality}
        options={QUALITY_OPTIONS}
        onChange={(quality) => onChange({ quality })}
        disabled={disabled}
        hint={QUALITY_HINTS[settings.quality]}
      />
      <FileNameField value={settings.fileName} extension=".pdf" onChange={(fileName) => onChange({ fileName })} disabled={disabled} />
    </div>
  );
}
