import { useId, type ComponentProps } from "react";
import { cn } from "@/lib/cn";

interface TextAreaProps extends Omit<ComponentProps<"textarea">, "onChange" | "value"> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}

export function TextArea({ label, value, onChange, hint, className, rows = 3, ...props }: TextAreaProps) {
  const id = useId();
  const hintId = `${id}-hint`;

  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="mb-2 block text-sm font-medium">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={hint ? hintId : undefined}
        className="block w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50"
        {...props}
      />
      {hint && (
        <p id={hintId} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
