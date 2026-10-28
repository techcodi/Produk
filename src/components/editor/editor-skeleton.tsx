import { Loader2 } from "lucide-react";

/** Placeholder while a browser-only editor tool loads. */
export function EditorSkeleton({ label = "Loading editor…" }: { label?: string }) {
  return (
    <div className="flex min-h-80 items-center justify-center gap-2 rounded-2xl border border-border bg-surface text-sm text-muted" aria-live="polite">
      <Loader2 className="size-4 animate-spin text-brand" />
      {label}
    </div>
  );
}
