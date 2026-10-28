"use client";

import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Download, Loader2, X } from "lucide-react";
import { Button, buttonStyles } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { TaskState } from "@/hooks/use-task";
import { cn } from "@/lib/cn";
import type { OutputFile } from "@/lib/download";
import { formatBytes } from "@/lib/format";

interface TaskPanelProps<R> {
  state: TaskState<R>;
  /** e.g. `(done, total) => \`Converting page ${done + 1} of ${total}…\`` */
  progressLabel: (completed: number, total: number) => string;
  /** The file offered by "Download again", plus a one-line summary of the result. */
  describeResult: (result: R) => { title: string; detail?: string; download?: OutputFile };
  actionLabel: ReactNode;
  actionIcon: ReactNode;
  disabled?: boolean;
  /** Replaces the action label (with a spinner) while inputs are still being prepared. */
  busyLabel?: string;
  /** Secondary controls under the main button (and under "Download again"), e.g. another output format. */
  extraActions?: ReactNode;
  onStart: () => void;
  onCancel: () => void;
}

/** The "do it" area of a tool: start button, live progress with cancel, then the result. */
export function TaskPanel<R>({
  state,
  progressLabel,
  describeResult,
  actionLabel,
  actionIcon,
  disabled,
  busyLabel,
  extraActions,
  onStart,
  onCancel,
}: TaskPanelProps<R>) {
  if (state.status === "processing") {
    return (
      <div className="space-y-3" aria-live="polite">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="inline-flex min-w-0 items-center gap-2 font-medium">
            <Loader2 className="size-4 shrink-0 animate-spin text-brand" />
            <span className="truncate">{progressLabel(state.completed, state.total)}</span>
          </span>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X /> Cancel
          </Button>
        </div>
        <ProgressBar value={state.completed} max={state.total} label="Progress" />
      </div>
    );
  }

  if (state.status === "success") {
    const { title, detail, download } = describeResult(state.result);
    return (
      <div className="space-y-3" aria-live="polite">
        <div className="flex items-start gap-3 rounded-lg bg-success-soft p-3 text-sm">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
          <div className="min-w-0">
            <p className="font-medium">{title}</p>
            {(detail || download) && (
              <p className="truncate text-muted">{detail ?? `${download!.fileName} · ${formatBytes(download!.size)}`}</p>
            )}
          </div>
        </div>
        {download && (
          <a href={download.url} download={download.fileName} className={cn(buttonStyles({ size: "lg" }), "w-full")}>
            <Download /> Download again
          </a>
        )}
        {extraActions}
      </div>
    );
  }

  const busy = Boolean(busyLabel);
  return (
    <div className="space-y-3">
      {state.status === "error" && (
        <div role="alert" className="flex items-start gap-3 rounded-lg bg-danger-soft p-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {state.message}
        </div>
      )}
      <Button size="lg" className="w-full" onClick={onStart} disabled={disabled || busy}>
        {busy ? <Loader2 className="animate-spin" /> : actionIcon}
        {busy ? busyLabel : actionLabel}
      </Button>
      {extraActions}
    </div>
  );
}
