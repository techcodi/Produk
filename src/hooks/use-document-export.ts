"use client";

import { useCallback } from "react";
import type { Editor } from "@tiptap/react";
import { createOutputFile, releaseOutputFile, triggerDownload, type OutputFile } from "@/lib/download";
import { exportDocx, exportPdf } from "@/lib/document/export";
import type { DocNode, DocumentSettings } from "@/lib/document/types";
import { sanitizeFileName, stripExtension } from "@/lib/files";
import { isOutOfMemory, useTask } from "./use-task";

export type DocumentFormat = "pdf" | "docx";

export interface DocumentExportResult {
  file: OutputFile;
  format: DocumentFormat;
}

function describeError(error: unknown): string {
  if (isOutOfMemory(error)) return "Your device ran out of memory. Try removing some large images.";
  return "Something went wrong while creating your file. Please try again.";
}

/** Exports the editor's document as PDF or Word, downloading the result. */
export function useDocumentExport(fallbackName: string) {
  const task = useTask<DocumentExportResult>({ release: (result) => releaseOutputFile(result.file), describeError });
  const { start } = task;

  const exportAs = useCallback(
    async (format: DocumentFormat, editor: Editor, settings: DocumentSettings) => {
      // Snapshot now so edits made while exporting don't leak into this file.
      const doc = editor.getJSON() as DocNode;
      const html = editor.getHTML();
      const fileName = sanitizeFileName(settings.fileName, format, fallbackName);
      const title = stripExtension(fileName);

      const result = await start(1, async ({ signal, progress }) => {
        const blob = format === "pdf" ? await exportPdf(doc, settings, title) : await exportDocx(html, doc, settings, title);
        signal.throwIfAborted();
        progress(1, 1);
        return { file: createOutputFile(blob, fileName), format };
      });
      if (result) triggerDownload(result.file.url, result.file.fileName);
    },
    [fallbackName, start],
  );

  return { state: task.state, exportAs, reset: task.reset };
}
