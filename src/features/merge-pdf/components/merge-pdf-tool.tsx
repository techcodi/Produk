"use client";

import { useCallback, useMemo, useState } from "react";
import { ArrowDownAZ, ArrowUpDown, Combine, FilePlus2, Trash2 } from "lucide-react";
import { DropZone } from "@/components/files/drop-zone";
import { FileNameField } from "@/components/files/file-name-field";
import { PendingIndicator } from "@/components/files/pending-indicator";
import { RejectedNotice } from "@/components/files/rejected-notice";
import { TaskPanel } from "@/components/files/task-panel";
import { ToolWorkspace } from "@/components/files/tool-workspace";
import { Button } from "@/components/ui/button";
import { usePasteFiles } from "@/hooks/use-paste-files";
import { isOutOfMemory, useTask } from "@/hooks/use-task";
import { createOutputFile, releaseOutputFile, triggerDownload, type OutputFile } from "@/lib/download";
import { stripExtension, type RejectedFile } from "@/lib/files";
import { formatBytes, pluralize } from "@/lib/format";
import { PDF_ACCEPT_ATTRIBUTE } from "@/lib/pdf/documents";
import { DEFAULT_FILE_NAME } from "../constants";
import { toPdfFileName } from "../core/file-validation";
import { MergeFileError, mergePdfs } from "../core/merge";
import { usePdfFiles } from "../hooks/use-pdf-files";
import { PdfFileList } from "./pdf-file-list";

const DROP_ZONE_TEXT = {
  accept: PDF_ACCEPT_ATTRIBUTE,
  icon: FilePlus2,
  title: "Drag & drop PDFs here",
  dropTitle: "Drop to add your PDFs",
  hint: "Add two or more PDF files · they’re merged in the order shown",
  buttonLabel: "Choose PDFs",
  compactLabel: "Add more PDFs",
};

interface MergeResult {
  file: OutputFile;
  pageCount: number;
}

function describeError(error: unknown): string {
  if (error instanceof MergeFileError) return `${error.message}. Try removing it and merging again.`;
  if (isOutOfMemory(error)) return "Your device ran out of memory. Try merging fewer or smaller files.";
  return "Something went wrong while merging. Please try again.";
}

export function MergePdfTool() {
  const files = usePdfFiles();
  const task = useTask<MergeResult>({ release: (result) => releaseOutputFile(result.file), describeError });
  const [fileName, setFileName] = useState(DEFAULT_FILE_NAME);
  const [rejected, setRejected] = useState<RejectedFile[]>([]);

  const { addFiles, remove, move, sortByName, reverse, clear } = files;
  const { reset: invalidate, start } = task;
  const isMerging = task.state.status === "processing";
  const isImporting = files.pendingCount > 0;

  // Any edit makes a previously merged PDF stale, so each action drops it.
  // Memoised so PdfFileRow's memo() isn't defeated by fresh callbacks.
  const actions = useMemo(() => {
    const withInvalidate =
      <A extends unknown[]>(fn: (...args: A) => void) =>
      (...args: A) => {
        invalidate();
        fn(...args);
      };
    return {
      move: withInvalidate(move),
      remove: withInvalidate(remove),
      sortByName: withInvalidate(sortByName),
      reverse: withInvalidate(reverse),
      clear: withInvalidate(clear),
    };
  }, [invalidate, move, remove, sortByName, reverse, clear]);

  const handleFiles = useCallback(
    async (added: File[]) => {
      invalidate();
      setRejected(await addFiles(added));
    },
    [addFiles, invalidate],
  );

  usePasteFiles(handleFiles);

  const totalPages = files.items.reduce((sum, item) => sum + item.pageCount, 0);
  const totalSize = files.items.reduce((sum, item) => sum + item.size, 0);
  const canMerge = files.items.length >= 2;

  const handleMerge = async () => {
    const items = files.items;
    const name = toPdfFileName(fileName);
    const result = await start(items.length, async ({ signal, progress }) => {
      const bytes = await mergePdfs(items, stripExtension(name), { signal, onProgress: progress });
      return { file: createOutputFile(bytes, name, "application/pdf"), pageCount: totalPages };
    });
    if (result) triggerDownload(result.file.url, result.file.fileName);
  };

  if (files.items.length === 0) {
    return (
      <div className="space-y-4">
        <RejectedNotice rejected={rejected} onDismiss={() => setRejected([])} />
        <DropZone {...DROP_ZONE_TEXT} onFiles={handleFiles} />
        {isImporting && <PendingIndicator label={`Reading ${pluralize(files.pendingCount, "file")}…`} />}
      </div>
    );
  }

  return (
    <ToolWorkspace
      mainLabel="Files to merge"
      settingsTitle="Merge settings"
      settings={
        <FileNameField
          value={fileName}
          extension=".pdf"
          disabled={isMerging}
          onChange={(value) => {
            invalidate();
            setFileName(value);
          }}
        />
      }
      action={
        <TaskPanel
          state={task.state}
          progressLabel={(completed, total) => `Adding file ${Math.min(completed + 1, total)} of ${total}…`}
          describeResult={(result) => ({
            title: "Your PDF is ready",
            detail: `${result.file.fileName} · ${pluralize(result.pageCount, "page")} · ${formatBytes(result.file.size)}`,
            download: result.file,
          })}
          actionIcon={<Combine />}
          actionLabel={canMerge ? `Merge ${pluralize(files.items.length, "file")} · ${pluralize(totalPages, "page")}` : "Add at least 2 PDFs"}
          disabled={!canMerge}
          busyLabel={isImporting ? "Reading files…" : undefined}
          onStart={handleMerge}
          onCancel={invalidate}
        />
      }
    >
      <RejectedNotice rejected={rejected} onDismiss={() => setRejected([])} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          <span className="font-medium text-foreground">{pluralize(files.items.length, "file")}</span> · {pluralize(totalPages, "page")} ·{" "}
          {formatBytes(totalSize)}
          <span className="hidden sm:inline"> · Drag to reorder</span>
        </p>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={actions.sortByName} disabled={isMerging}>
            <ArrowDownAZ /> Sort A–Z
          </Button>
          <Button variant="ghost" size="sm" onClick={actions.reverse} disabled={isMerging}>
            <ArrowUpDown /> Reverse
          </Button>
          <Button variant="danger" size="sm" onClick={actions.clear} disabled={isMerging}>
            <Trash2 /> Clear
          </Button>
        </div>
      </div>

      {isImporting && <PendingIndicator label={`Reading ${pluralize(files.pendingCount, "file")}…`} />}

      <PdfFileList items={files.items} onMove={actions.move} onRemove={actions.remove} disabled={isMerging} />
      <DropZone {...DROP_ZONE_TEXT} variant="compact" className="h-24" onFiles={handleFiles} />
    </ToolWorkspace>
  );
}
