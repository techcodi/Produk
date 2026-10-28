"use client";

import { SegmentedControl, type SegmentedOption } from "@/components/ui/segmented-control";
import { TextField } from "@/components/ui/text-field";
import { pluralize } from "@/lib/format";
import type { SplitMode, SplitPlan, SplitSettings } from "../types";

const MODE_OPTIONS: SegmentedOption<SplitMode>[] = [
  { value: "select", label: "Pick pages" },
  { value: "ranges", label: "By ranges" },
  { value: "every", label: "Every N" },
];

const MODE_HINTS: Record<SplitMode, string> = {
  select: "Keep the pages you choose, as one new PDF.",
  ranges: "Each range becomes its own PDF.",
  every: "Cut the PDF into equal parts.",
};

interface SplitSettingsPanelProps {
  settings: SplitSettings;
  plan: SplitPlan;
  pageCount: number;
  onChange: (patch: Partial<SplitSettings>) => void;
  disabled?: boolean;
}

export function SplitSettingsPanel({ settings, plan, pageCount, onChange, disabled }: SplitSettingsPanelProps) {
  // Only flag errors once the user has typed something; an empty field just shows the hint.
  const hasInput = settings.mode === "every" ? settings.everyN.trim() !== "" : settings.ranges.trim() !== "";
  const error = !plan.ok && hasInput && pageCount > 0 ? plan.error : undefined;

  return (
    <div className="space-y-5">
      <SegmentedControl
        label="Mode"
        value={settings.mode}
        options={MODE_OPTIONS}
        onChange={(mode) => onChange({ mode })}
        disabled={disabled}
        hint={MODE_HINTS[settings.mode]}
      />

      {settings.mode === "every" ? (
        <TextField
          label="Pages per file"
          value={settings.everyN}
          onChange={(everyN) => onChange({ everyN: everyN.replace(/\D/g, "") })}
          inputMode="numeric"
          suffix="pages"
          disabled={disabled}
          error={error}
          hint={plan.ok ? `Creates ${pluralize(plan.outputs.length, "PDF")}` : undefined}
        />
      ) : (
        <TextField
          label={settings.mode === "select" ? "Pages to keep" : "Ranges"}
          value={settings.ranges}
          onChange={(ranges) => onChange({ ranges })}
          placeholder={settings.mode === "select" ? "e.g. 1-3, 5, 8-" : "e.g. 1-3, 4-6, 7-"}
          disabled={disabled}
          error={error}
          hint={
            plan.ok
              ? settings.mode === "select"
                ? `Keeps ${pluralize(plan.outputs[0].pages.length, "page")} of ${pageCount}`
                : `Creates ${pluralize(plan.outputs.length, "PDF")}`
              : "Use commas between ranges. “8-” means page 8 to the end."
          }
        />
      )}
    </div>
  );
}
