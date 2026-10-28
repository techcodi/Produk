import type { ReactNode } from "react";

interface FormSectionProps {
  title: string;
  description?: string;
  /** Right-aligned header content, e.g. a small action button. */
  aside?: ReactNode;
  children: ReactNode;
}

export function FormSection({ title, description, aside, children }: FormSectionProps) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}
