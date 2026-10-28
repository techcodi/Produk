import { useId } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
}

/** Native `<select>`, so it gets the platform picker on phones. */
export function SelectField<T extends string>({ label, value, options, onChange, disabled, className }: SelectFieldProps<T>) {
  const id = useId();

  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="mb-2 block text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value as T)}
          disabled={disabled}
          className="h-10 w-full appearance-none rounded-lg border border-border bg-surface pl-3 pr-9 text-sm outline-none focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
      </div>
    </div>
  );
}
