"use client";

import { FileNameField } from "@/components/files/file-name-field";
import { SegmentedControl, type SegmentedOption } from "@/components/ui/segmented-control";
import type { DocFont, DocMargin, DocPageSize, DocumentSettings } from "@/lib/document/types";

const PAGE_SIZE_OPTIONS: SegmentedOption<DocPageSize>[] = [
  { value: "a4", label: "A4" },
  { value: "letter", label: "Letter" },
];

const MARGIN_OPTIONS: SegmentedOption<DocMargin>[] = [
  { value: "narrow", label: "Narrow" },
  { value: "normal", label: "Normal" },
  { value: "wide", label: "Wide" },
];

const FONT_OPTIONS: SegmentedOption<DocFont>[] = [
  { value: "sans", label: "Sans" },
  { value: "serif", label: "Serif" },
  { value: "mono", label: "Mono" },
];

const FONT_HINTS: Record<DocFont, string> = {
  sans: "Clean and modern. Supports Latin, Greek and Cyrillic.",
  serif: "Classic, like a printed book. Latin characters only.",
  mono: "Typewriter style. Latin characters only.",
};

const SIZE_OPTIONS: SegmentedOption<`${number}`>[] = [
  { value: "10", label: "10" },
  { value: "11", label: "11" },
  { value: "12", label: "12" },
  { value: "14", label: "14" },
];

interface DocumentSettingsPanelProps {
  settings: DocumentSettings;
  onChange: (patch: Partial<DocumentSettings>) => void;
  disabled?: boolean;
}

export function DocumentSettingsPanel({ settings, onChange, disabled }: DocumentSettingsPanelProps) {
  return (
    <div className="space-y-5">
      <SegmentedControl label="Page size" value={settings.pageSize} options={PAGE_SIZE_OPTIONS} onChange={(pageSize) => onChange({ pageSize })} disabled={disabled} />
      <SegmentedControl label="Margins" value={settings.margin} options={MARGIN_OPTIONS} onChange={(margin) => onChange({ margin })} disabled={disabled} />
      <SegmentedControl
        label="Font"
        value={settings.font}
        options={FONT_OPTIONS}
        onChange={(font) => onChange({ font })}
        disabled={disabled}
        hint={FONT_HINTS[settings.font]}
      />
      <SegmentedControl
        label="Text size (pt)"
        value={`${settings.fontSize}`}
        options={SIZE_OPTIONS}
        onChange={(size) => onChange({ fontSize: Number(size) })}
        disabled={disabled}
      />
      <FileNameField value={settings.fileName} extension=".pdf / .docx" onChange={(fileName) => onChange({ fileName })} disabled={disabled} />
    </div>
  );
}
