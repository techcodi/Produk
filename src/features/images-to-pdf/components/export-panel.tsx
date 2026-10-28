"use client";

import { AlertCircle, CheckCircle2, Download, FileDown, Loader2, X } from "lucide-react";
import { Button, buttonStyles } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { cn } from "@/lib/cn";
import { formatBytes, pluralize } from "@/lib/format";
import type { ExportState } from "../hooks/use-pdf-export";

interface ExportPanelProps {
  state: ExportState;
  imageCount: number;
  busy: boolean;
  onExport: () => void;
  onCancel: () => void;
}

export function ExportPanel({ state, imageCount, busy, onExport, onCancel }: ExportPanelProps) {
  if (state.status === "processing") {
    return (
      <div className="space-y-3" aria-live="polite">
        <div className="flex items-center justify-between text-sm">
          <span className="inline-flex items-center gap-2 font-medium">
            <Loader2 className="size-4 animate-spin text-brand" />
            Building page {Math.min(state.completed + 1, state.total)} of {state.total}…
          </span>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X /> Cancel
          </Button>
        </div>
        <ProgressBar value={state.completed} max={state.total} label="PDF progress" />
      </div>
    );
  }

  if (state.status === "success") {
    return (
      <div className="space-y-3" aria-live="polite">
        <div className="flex items-start gap-3 rounded-lg bg-success-soft p-3 text-sm">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
          <div className="min-w-0">
            <p className="font-medium">Your PDF is ready</p>
            <p className="truncate text-muted">
              {state.fileName} · {pluralize(state.pageCount, "page")} · {formatBytes(state.size)}
            </p>
          </div>
        </div>
        <a href={state.url} download={state.fileName} className={cn(buttonStyles({ size: "lg" }), "w-full")}>
          <Download /> Download again
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {state.status === "error" && (
        <div role="alert" className="flex items-start gap-3 rounded-lg bg-danger-soft p-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {state.message}
        </div>
      )}
      <Button size="lg" className="w-full" onClick={onExport} disabled={imageCount === 0 || busy}>
        {busy ? <Loader2 className="animate-spin" /> : <FileDown />}
        {busy ? "Preparing images…" : `Create PDF · ${pluralize(imageCount, "page")}`}
      </Button>
    </div>
  );
}
