"use client";

import { SegmentedControl, type SegmentedOption } from "@/components/ui/segmented-control";
import type { CompressFormat, CompressionLevel, CompressSettings } from "../types";

const LEVEL_OPTIONS: SegmentedOption<CompressionLevel>[] = [
  { value: "light", label: "Light" },
  { value: "balanced", label: "Balanced" },
  { value: "strong", label: "Strong" },
];

const LEVEL_HINTS: Record<CompressionLevel, string> = {
  light: "Barely touches quality. Good for printing.",
  balanced: "Big savings with no visible difference. Recommended.",
  strong: "Smallest files, also shrinks very large photos. Ideal for email.",
};

const FORMAT_OPTIONS: SegmentedOption<CompressFormat>[] = [
  { value: "auto", label: "Auto" },
  { value: "jpeg", label: "JPG" },
  { value: "webp", label: "WebP" },
];

const FORMAT_HINTS: Record<CompressFormat, string> = {
  auto: "JPG for photos; WebP when an image has transparency.",
  jpeg: "Opens everywhere. Transparent areas become white.",
  webp: "Smaller than JPG and keeps transparency.",
};

interface CompressSettingsPanelProps {
  settings: CompressSettings;
  onChange: (patch: Partial<CompressSettings>) => void;
  disabled?: boolean;
}

export function CompressSettingsPanel({ settings, onChange, disabled }: CompressSettingsPanelProps) {
  return (
    <div className="space-y-5">
      <SegmentedControl
        label="Compression"
        value={settings.level}
        options={LEVEL_OPTIONS}
        onChange={(level) => onChange({ level })}
        disabled={disabled}
        hint={LEVEL_HINTS[settings.level]}
      />
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
