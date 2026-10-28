"use client";

import { FileDown, FileText } from "lucide-react";
import { TaskPanel } from "@/components/files/task-panel";
import { Button } from "@/components/ui/button";
import type { TaskState } from "@/hooks/use-task";
import type { DocumentExportResult, DocumentFormat } from "@/hooks/use-document-export";

interface DocumentExportPanelProps {
  state: TaskState<DocumentExportResult>;
  /** Why exporting isn't possible yet (e.g. "Type something first"), or undefined when it is. */
  blockedReason?: string;
  busyLabel?: string;
  onExport: (format: DocumentFormat) => void;
  onCancel: () => void;
}

const FORMAT_LABEL: Record<DocumentFormat, string> = { pdf: "PDF", docx: "Word document" };

export function DocumentExportPanel({ state, blockedReason, busyLabel, onExport, onCancel }: DocumentExportPanelProps) {
  const otherFormat: DocumentFormat = state.status === "success" && state.result.format === "pdf" ? "docx" : "pdf";

  return (
    <TaskPanel
      state={state}
      progressLabel={() => "Creating your file…"}
      describeResult={(result) => ({ title: `Your ${FORMAT_LABEL[result.format]} is ready`, download: result.file })}
      actionIcon={<FileDown />}
      actionLabel={blockedReason ?? "Download PDF"}
      disabled={Boolean(blockedReason)}
      busyLabel={busyLabel}
      onStart={() => onExport("pdf")}
      onCancel={onCancel}
      extraActions={
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => onExport(state.status === "success" ? otherFormat : "docx")}
          disabled={Boolean(blockedReason) || Boolean(busyLabel)}
        >
          <FileText />
          {state.status === "success" && otherFormat === "pdf" ? "Download as PDF" : "Download as Word (.docx)"}
        </Button>
      }
    />
  );
}
