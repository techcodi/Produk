"use client";

import { SegmentedControl, type SegmentedOption } from "@/components/ui/segmented-control";
import { TextField } from "@/components/ui/text-field";
import { pluralize } from "@/lib/format";
import { RESOLUTION_DPI } from "../constants";
import type { ConvertSettings, ImageFormat, PageScope, PageSelection, ResolutionId } from "../types";

const FORMAT_OPTIONS: SegmentedOption<ImageFormat>[] = [
  { value: "jpg", label: "JPG" },
  { value: "png", label: "PNG" },
];

const FORMAT_HINTS: Record<ImageFormat, string> = {
  jpg: "Smaller files. Best for photos and sharing.",
  png: "Lossless and crisp. Best for text and diagrams.",
};

const RESOLUTION_OPTIONS: SegmentedOption<ResolutionId>[] = [
  { value: "screen", label: "Screen" },
  { value: "standard", label: "Standard" },
  { value: "print", label: "Print" },
];

const SCOPE_OPTIONS: SegmentedOption<PageScope>[] = [
  { value: "all", label: "All pages" },
  { value: "custom", label: "Choose pages" },
];

interface ConvertSettingsPanelProps {
  settings: ConvertSettings;
  selection: PageSelection;
  pageCount: number;
  onChange: (patch: Partial<ConvertSettings>) => void;
  disabled?: boolean;
}

export function ConvertSettingsPanel({ settings, selection, pageCount, onChange, disabled }: ConvertSettingsPanelProps) {
  const error = !selection.ok && settings.ranges.trim() !== "" && pageCount > 0 ? selection.error : undefined;

  return (
    <div className="space-y-5">
      <SegmentedControl
        label="Format"
        value={settings.format}
        options={FORMAT_OPTIONS}
        onChange={(format) => onChange({ format })}
        disabled={disabled}
        hint={FORMAT_HINTS[settings.format]}
      />
      <SegmentedControl
        label="Resolution"
        value={settings.resolution}
        options={RESOLUTION_OPTIONS}
        onChange={(resolution) => onChange({ resolution })}
        disabled={disabled}
        hint={`${RESOLUTION_DPI[settings.resolution]} DPI`}
      />
      <SegmentedControl
        label="Pages"
        value={settings.scope}
        options={SCOPE_OPTIONS}
        onChange={(scope) => onChange({ scope })}
        disabled={disabled}
      />
      {settings.scope === "custom" && (
        <TextField
          label="Pages to convert"
          value={settings.ranges}
          onChange={(ranges) => onChange({ ranges })}
          placeholder="e.g. 1-3, 5, 8-"
          disabled={disabled}
          error={error}
          hint={selection.ok ? `${pluralize(selection.pages.length, "page")} of ${pageCount}` : "Use commas between ranges. “8-” means page 8 to the end."}
        />
      )}
    </div>
  );
}
