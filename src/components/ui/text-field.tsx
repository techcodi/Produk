import { useId, type ComponentProps } from "react";
import { cn } from "@/lib/cn";

interface TextFieldProps extends Omit<ComponentProps<"input">, "onChange" | "value"> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Shown under the field; replaced by `error` when there is one. */
  hint?: string;
  error?: string;
  /** Unit or extension shown inside the field, e.g. "px". */
  suffix?: string;
}

export function TextField({ label, value, onChange, hint, error, suffix, className, ...props }: TextFieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? hint;

  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="mb-2 block text-sm font-medium">
        {label}
      </label>
      <div
        className={cn(
          "flex items-center rounded-lg border bg-surface focus-within:outline-2 focus-within:outline-brand has-disabled:opacity-50",
          error ? "border-danger" : "border-border",
        )}
      >
        <input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={message ? messageId : undefined}
          spellCheck={false}
          className="h-10 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
          {...props}
        />
        {suffix && <span className="pr-3 text-sm text-muted">{suffix}</span>}
      </div>
      {message && (
        <p id={messageId} className={cn("mt-1.5 text-xs", error ? "text-danger" : "text-muted")}>
          {message}
        </p>
      )}
    </div>
  );
}
