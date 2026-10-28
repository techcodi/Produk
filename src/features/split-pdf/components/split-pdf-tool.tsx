"use client";

import { useCallback, useMemo, useState } from "react";
import { FileUp, Scissors } from "lucide-react";
import { DropZone } from "@/components/files/drop-zone";
import { PendingIndicator } from "@/components/files/pending-indicator";
import { RejectedNotice } from "@/components/files/rejected-notice";
import { SelectedFileBar } from "@/components/files/selected-file-bar";
import { TaskPanel } from "@/components/files/task-panel";
import { ToolWorkspace } from "@/components/files/tool-workspace";
import { PdfPageGrid } from "@/components/pdf/pdf-page-grid";
import { usePasteFiles } from "@/hooks/use-paste-files";
import { useSinglePdf } from "@/hooks/use-single-pdf";
import { isOutOfMemory, useTask } from "@/hooks/use-task";
import { createOutputFile, releaseOutputFile, triggerDownload, type OutputFile } from "@/lib/download";
import { sanitizeFileName, stripExtension } from "@/lib/files";
import { formatBytes, pluralize } from "@/lib/format";
import { PDF_ACCEPT_ATTRIBUTE, PdfReadError } from "@/lib/pdf/documents";
import { togglePageInRanges } from "@/lib/pdf/page-ranges";
import { createZip } from "@/lib/zip";
import { DEFAULT_SETTINGS, MAX_FILE_SIZE_BYTES } from "../constants";
import { outputIndexByPage, planSplit } from "../core/plan";
import { splitPdf } from "../core/split";
import type { SplitSettings } from "../types";
import { SplitSettingsPanel } from "./split-settings-panel";

const DROP_ZONE_TEXT = {
  accept: PDF_ACCEPT_ATTRIBUTE,
  icon: FileUp,
  title: "Drag & drop a PDF here",
  dropTitle: "Drop to open your PDF",
  hint: "Pick pages to keep, or split into several files",
  buttonLabel: "Choose PDF",
  multiple: false,
};

interface SplitResult {
  file: OutputFile;
  count: number;
}

function describeError(error: unknown): string {
  if (error instanceof PdfReadError) return `${error.message}, so it can’t be split.`;
  if (isOutOfMemory(error)) return "Your device ran out of memory. Try splitting into fewer files.";
  return "Something went wrong while splitting. Please try again.";
}

export function SplitPdfTool() {
  const pdf = useSinglePdf({ maxFileSize: MAX_FILE_SIZE_BYTES });
  const task = useTask<SplitResult>({ release: (result) => releaseOutputFile(result.file), describeError });
  const [settings, setSettings] = useState<SplitSettings>(DEFAULT_SETTINGS);

  const { reset: invalidate, start } = task;
  const { select } = pdf;
  const isSplitting = task.state.status === "processing";
  const pageCount = pdf.document.status === "ready" ? pdf.document.pageCount : 0;
  const plan = useMemo(() => planSplit(settings, pageCount), [settings, pageCount]);
  const pageOutputs = useMemo(() => (plan.ok ? outputIndexByPage(plan.outputs) : new Map<number, number>()), [plan]);

  const handleFiles = useCallback(
    (files: File[]) => {
      invalidate();
      if (select(files)) setSettings(DEFAULT_SETTINGS);
    },
    [invalidate, select],
  );

  usePasteFiles(handleFiles);

  const updateSettings = (patch: Partial<SplitSettings>) => {
    invalidate();
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  const togglePage = useCallback(
    (page: number) => {
      invalidate();
      setSettings((prev) => ({ ...prev, ranges: togglePageInRanges(prev.ranges, page, pageCount) }));
    },
    [invalidate, pageCount],
  );

  const handleSplit = async () => {
    if (!pdf.file || !plan.ok) return;
    const source = pdf.file;
    const outputs = plan.outputs;
    const base = stripExtension(sanitizeFileName(stripExtension(source.name), "pdf", "document"));

    const result = await start(outputs.length, async ({ signal, progress }) => {
      const files = await splitPdf(source, outputs, base, { signal, onProgress: progress });
      if (files.length === 1) {
        return { file: createOutputFile(files[0].bytes, files[0].name, "application/pdf"), count: 1 };
      }
      const zip = createZip(files.map((file) => ({ name: file.name, data: file.bytes })));
      return { file: createOutputFile(zip, `${base}-split.zip`, "application/zip"), count: files.length };
    });
    if (result) triggerDownload(result.file.url, result.file.fileName);
  };

  if (!pdf.file) {
    return (
      <div className="space-y-4">
        <RejectedNotice rejected={pdf.rejected} onDismiss={pdf.dismissRejected} />
        <DropZone {...DROP_ZONE_TEXT} onFiles={handleFiles} />
      </div>
    );
  }

  const outputCount = plan.ok ? plan.outputs.length : 0;
  const selectedPages = plan.ok ? plan.outputs.reduce((sum, out) => sum + out.pages.length, 0) : 0;

  return (
    <ToolWorkspace
      mainLabel="Pages"
      settingsTitle="Split settings"
      settings={
        <SplitSettingsPanel
          settings={settings}
          plan={plan}
          pageCount={pageCount}
          disabled={isSplitting || pageCount === 0}
          onChange={updateSettings}
        />
      }
      action={
        <TaskPanel
          state={task.state}
          progressLabel={(completed, total) => `Creating file ${Math.min(completed + 1, total)} of ${total}…`}
          describeResult={(result) => ({
            title: result.count === 1 ? "Your PDF is ready" : `${pluralize(result.count, "PDF")} ready in one ZIP`,
            download: result.file,
          })}
          actionIcon={<Scissors />}
          actionLabel={
            outputCount === 1
              ? `Extract ${pluralize(selectedPages, "page")}`
              : outputCount > 1
                ? `Split into ${pluralize(outputCount, "PDF")}`
                : "Split PDF"
          }
          disabled={!plan.ok}
          busyLabel={pdf.document.status === "loading" ? "Opening PDF…" : undefined}
          onStart={handleSplit}
          onCancel={invalidate}
        />
      }
    >
      <RejectedNotice rejected={pdf.rejected} onDismiss={pdf.dismissRejected} />
      <SelectedFileBar
        name={pdf.file.name}
        detail={[pageCount > 0 && pluralize(pageCount, "page"), formatBytes(pdf.file.size)].filter(Boolean).join(" · ")}
        disabled={isSplitting}
        onReplace={() => {
          invalidate();
          pdf.clear();
        }}
      />

      {pdf.document.status === "loading" && <PendingIndicator label="Opening PDF…" />}
      {pdf.document.status === "error" && (
        <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">
          {pdf.document.message}. Try another file.
        </p>
      )}
      {pdf.document.status === "ready" && (
        <>
          <p className="text-sm text-muted">
            {settings.mode === "select"
              ? "Tap pages to choose which ones to keep."
              : "Numbers show which file each page goes into."}
          </p>
          <PdfPageGrid
            doc={pdf.document.doc}
            pageCount={pageCount}
            disabled={isSplitting}
            onToggle={settings.mode === "select" ? togglePage : undefined}
            isSelected={settings.mode === "every" ? undefined : (page) => pageOutputs.has(page)}
            badge={settings.mode === "select" ? undefined : (page) => pageOutputs.get(page)?.toString()}
          />
        </>
      )}
    </ToolWorkspace>
  );
}
