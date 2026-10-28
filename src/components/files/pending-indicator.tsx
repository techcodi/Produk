import { Loader2 } from "lucide-react";

export function PendingIndicator({ label }: { label: string }) {
  return (
    <p className="inline-flex items-center gap-2 text-sm text-muted" aria-live="polite">
      <Loader2 className="size-4 animate-spin text-brand" />
      {label}
    </p>
  );
}
