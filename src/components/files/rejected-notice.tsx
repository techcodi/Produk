"use client";

import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pluralize } from "@/lib/format";
import type { RejectedFile } from "@/lib/files";

export function RejectedNotice({ rejected, onDismiss }: { rejected: RejectedFile[]; onDismiss: () => void }) {
  if (rejected.length === 0) return null;

  return (
    <div role="alert" className="flex gap-3 rounded-xl border border-danger/30 bg-danger-soft p-4 text-sm">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-danger">{pluralize(rejected.length, "file")} couldn’t be added</p>
        <ul className="mt-1 space-y-0.5 text-muted">
          {rejected.slice(0, 5).map(({ file, reason }, index) => (
            <li key={`${file.name}-${index}`} className="truncate">
              <span className="text-foreground">{file.name}</span> — {reason}
            </li>
          ))}
          {rejected.length > 5 && <li>…and {rejected.length - 5} more</li>}
        </ul>
      </div>
      <Button variant="ghost" size="icon" aria-label="Dismiss" onClick={onDismiss}>
        <X />
      </Button>
    </div>
  );
}
