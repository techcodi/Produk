import { useId } from "react";
import { cn } from "@/lib/cn";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  label: string;
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  hint?: string;
}

/** Native radio group styled as a segmented control — keyboard + screen-reader support for free. */
export function SegmentedControl<T extends string>({ label, value, options, onChange, disabled, hint }: SegmentedControlProps<T>) {
  const name = useId();

  return (
    <fieldset disabled={disabled} className="min-w-0 disabled:opacity-50">
      <legend className="mb-2 text-sm font-medium text-foreground">{label}</legend>
      <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-lg bg-surface-muted p-1">
        {options.map((option) => (
          <label key={option.value} className="relative">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span
              className={cn(
                "flex h-8 cursor-pointer items-center justify-center rounded-md px-2 text-xs font-medium text-muted transition",
                "peer-checked:bg-surface peer-checked:text-foreground peer-checked:shadow-sm",
                "peer-focus-visible:outline-2 peer-focus-visible:outline-brand",
              )}
            >
              {option.label}
            </span>
          </label>
        ))}
      </div>
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </fieldset>
  );
}
