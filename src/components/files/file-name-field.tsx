import { useId } from "react";

interface FileNameFieldProps {
  value: string;
  extension: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
}

export function FileNameField({ value, extension, onChange, disabled, label = "File name" }: FileNameFieldProps) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium">
        {label}
      </label>
      <div className="flex items-center rounded-lg border border-border bg-surface focus-within:outline-2 focus-within:outline-brand">
        <input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          maxLength={120}
          spellCheck={false}
          className="h-10 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
        />
        <span className="pr-3 text-sm text-muted">{extension}</span>
      </div>
    </div>
  );
}
