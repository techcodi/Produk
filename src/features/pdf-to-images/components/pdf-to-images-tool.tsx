"use client";

import { useCallback, useMemo, useState } from "react";
import { FileUp, ImageDown } from "lucide-react";
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
import { PDF_ACCEPT_ATTRIBUTE } from "@/lib/pdf/documents";
import { togglePageInRanges } from "@/lib/pdf/page-ranges";
import { createZip } from "@/lib/zip";
import { DEFAULT_SETTINGS, MAX_FILE_SIZE_BYTES } from "../constants";
import { convertPages, PageRenderError } from "../core/convert";
import { resolvePages } from "../core/plan";
import type { ConvertSettings } from "../types";
import { ConvertSettingsPanel } from "./convert-settings-panel";

const DROP_ZONE_TEXT = {
  accept: PDF_ACCEPT_ATTRIBUTE,
  icon: FileUp,
  title: "Drag & drop a PDF here",
  dropTitle: "Drop to open your PDF",
  hint: "Every page becomes a JPG or PNG image",
  buttonLabel: "Choose PDF",
  multiple: false,
};

interface ConvertResult {
  file: OutputFile;
  count: number;
}

function describeError(error: unknown): string {
  if (error instanceof PageRenderError) return `${error.message}. Try a lower resolution, or leave that page out.`;
  if (isOutOfMemory(error)) return "Your device ran out of memory. Try a lower resolution or fewer pages.";
  return "Something went wrong while converting. Please try again.";
}

export function PdfToImagesTool() {
  const pdf = useSinglePdf({ maxFileSize: MAX_FILE_SIZE_BYTES });
  const task = useTask<ConvertResult>({ release: (result) => releaseOutputFile(result.file), describeError });
  const [settings, setSettings] = useState<ConvertSettings>(DEFAULT_SETTINGS);

  const { reset: invalidate, start } = task;
  const { select } = pdf;
  const isConverting = task.state.status === "processing";
  const pageCount = pdf.document.status === "ready" ? pdf.document.pageCount : 0;
  const selection = useMemo(() => resolvePages(settings, pageCount), [settings, pageCount]);
  const selectedSet = useMemo(() => new Set(selection.ok ? selection.pages : []), [selection]);

  const handleFiles = useCallback(
    (files: File[]) => {
      invalidate();
      if (select(files)) setSettings((prev) => ({ ...prev, scope: "all", ranges: "" }));
    },
    [invalidate, select],
  );

  usePasteFiles(handleFiles);

  const updateSettings = (patch: Partial<ConvertSettings>) => {
    invalidate();
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  const togglePage = useCallback(
    (page: number) => {
      invalidate();
      setSettings((prev) => {
        // The first tap while "All pages" is on starts from everything selected.
        const current = prev.scope === "all" ? `1-${pageCount}` : prev.ranges;
        return { ...prev, scope: "custom", ranges: togglePageInRanges(current, page, pageCount) };
      });
    },
    [invalidate, pageCount],
  );

  const handleConvert = async () => {
    if (!pdf.file || pdf.document.status !== "ready" || !selection.ok) return;
    const doc = pdf.document.doc;
    const pages = selection.pages;
    const base = stripExtension(sanitizeFileName(stripExtension(pdf.file.name), "pdf", "document"));

    const result = await start(pages.length, async ({ signal, progress }) => {
      const images = await convertPages(doc, pages, base, settings, { signal, onProgress: progress });
      if (images.length === 1) return { file: createOutputFile(images[0].blob, images[0].name), count: 1 };

      const entries = await Promise.all(
        images.map(async (image) => ({ name: image.name, data: new Uint8Array(await image.blob.arrayBuffer()) })),
      );
      return { file: createOutputFile(createZip(entries), `${base}-images.zip`, "application/zip"), count: images.length };
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

  const count = selection.ok ? selection.pages.length : 0;
  const formatLabel = settings.format.toUpperCase();

  return (
    <ToolWorkspace
      mainLabel="Pages"
      settingsTitle="Image settings"
      settings={
        <ConvertSettingsPanel
          settings={settings}
          selection={selection}
          pageCount={pageCount}
          disabled={isConverting || pageCount === 0}
          onChange={updateSettings}
        />
      }
      action={
        <TaskPanel
          state={task.state}
          progressLabel={(completed, total) => `Rendering page ${Math.min(completed + 1, total)} of ${total}…`}
          describeResult={(result) => ({
            title: result.count === 1 ? "Your image is ready" : `${pluralize(result.count, "image")} ready in one ZIP`,
            download: result.file,
          })}
          actionIcon={<ImageDown />}
          actionLabel={count > 0 ? `Convert to ${pluralize(count, formatLabel, `${formatLabel}s`)}` : "Convert to images"}
          disabled={!selection.ok}
          busyLabel={pdf.document.status === "loading" ? "Opening PDF…" : undefined}
          onStart={handleConvert}
          onCancel={invalidate}
        />
      }
    >
      <RejectedNotice rejected={pdf.rejected} onDismiss={pdf.dismissRejected} />
      <SelectedFileBar
        name={pdf.file.name}
        detail={[pageCount > 0 && pluralize(pageCount, "page"), formatBytes(pdf.file.size)].filter(Boolean).join(" · ")}
        disabled={isConverting}
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
          <p className="text-sm text-muted">Tap pages to leave them out or add them back.</p>
          <PdfPageGrid
            doc={pdf.document.doc}
            pageCount={pageCount}
            disabled={isConverting}
            onToggle={togglePage}
            isSelected={(page) => selectedSet.has(page)}
          />
        </>
      )}
    </ToolWorkspace>
  );
}
