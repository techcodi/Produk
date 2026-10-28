"use client";

import { useCallback, useState } from "react";
import { FileUp, Info } from "lucide-react";
import { DocumentEditor } from "@/components/editor/document-editor";
import { DocumentExportPanel } from "@/components/editor/document-export-panel";
import { DocumentSettingsPanel } from "@/components/editor/document-settings-panel";
import { DropZone } from "@/components/files/drop-zone";
import { PendingIndicator } from "@/components/files/pending-indicator";
import { RejectedNotice } from "@/components/files/rejected-notice";
import { SelectedFileBar } from "@/components/files/selected-file-bar";
import { ToolWorkspace } from "@/components/files/tool-workspace";
import { useDocumentEditor } from "@/hooks/use-document-editor";
import { useDocumentExport } from "@/hooks/use-document-export";
import { DocumentImportError, docxToHtml, isDocx, isLegacyDoc, WORD_ACCEPT_ATTRIBUTE } from "@/lib/document/import";
import type { DocumentSettings } from "@/lib/document/types";
import type { RejectedFile } from "@/lib/files";
import { stripExtension } from "@/lib/files";
import { formatBytes } from "@/lib/format";
import { usePasteFiles } from "@/hooks/use-paste-files";
import { DEFAULT_SETTINGS, MAX_FILE_SIZE_BYTES } from "../constants";

const DROP_ZONE_TEXT = {
  accept: WORD_ACCEPT_ATTRIBUTE,
  icon: FileUp,
  title: "Drag & drop a Word file here",
  dropTitle: "Drop to open your document",
  hint: "Word .docx files · edit, then save as PDF or Word",
  buttonLabel: "Choose Word file",
  multiple: false,
};

function rejectionReason(file: File): string | null {
  if (isLegacyDoc(file)) return "Old .doc files can’t be opened in the browser. Open it in Word and use Save As → .docx.";
  if (!isDocx(file)) return "Not a Word (.docx) file";
  if (file.size > MAX_FILE_SIZE_BYTES) return "Too large to edit in the browser";
  return null;
}

export function WordToPdfWorkspace() {
  const exporter = useDocumentExport(DEFAULT_SETTINGS.fileName);
  const { reset: invalidate } = exporter;
  const [settings, setSettings] = useState<DocumentSettings>(DEFAULT_SETTINGS);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [rejected, setRejected] = useState<RejectedFile[]>([]);

  const editor = useDocumentEditor({ placeholder: "This document is empty. Start typing…", onChange: invalidate });
  const isExporting = exporter.state.status === "processing";

  const open = useCallback(
    async (files: File[]) => {
      const chosen = files[0];
      if (!chosen || !editor) return;
      const reason = rejectionReason(chosen);
      if (reason) return setRejected([{ file: chosen, reason }]);

      invalidate();
      setRejected([]);
      setLoading(true);
      try {
        const html = await docxToHtml(chosen);
        // Replacing content shouldn't be undoable back into the previous file.
        editor.chain().setContent(html, { emitUpdate: false }).setMeta("addToHistory", false).run();
        setFile(chosen);
        setSettings((prev) => ({ ...prev, fileName: stripExtension(chosen.name) }));
      } catch (error) {
        setRejected([
          { file: chosen, reason: error instanceof DocumentImportError ? error.message : "This file couldn’t be opened" },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [editor, invalidate],
  );

  usePasteFiles(open);

  if (!file) {
    return (
      <div className="space-y-4">
        <RejectedNotice rejected={rejected} onDismiss={() => setRejected([])} />
        <DropZone {...DROP_ZONE_TEXT} onFiles={open} />
        {(loading || !editor) && <PendingIndicator label={loading ? "Opening document…" : "Loading editor…"} />}
      </div>
    );
  }

  return (
    <ToolWorkspace
      mainLabel="Document"
      settingsTitle="Page settings"
      settings={
        <DocumentSettingsPanel
          settings={settings}
          disabled={isExporting}
          onChange={(patch) => {
            invalidate();
            setSettings((prev) => ({ ...prev, ...patch }));
          }}
        />
      }
      action={
        <DocumentExportPanel
          state={exporter.state}
          busyLabel={loading ? "Opening document…" : undefined}
          onExport={(format) => editor && exporter.exportAs(format, editor, settings)}
          onCancel={invalidate}
        />
      }
    >
      <RejectedNotice rejected={rejected} onDismiss={() => setRejected([])} />
      <SelectedFileBar
        name={file.name}
        detail={formatBytes(file.size)}
        disabled={isExporting || loading}
        onReplace={() => {
          invalidate();
          setFile(null);
        }}
      />
      <p className="flex items-start gap-2 text-sm text-muted">
        <Info className="mt-0.5 size-4 shrink-0" />
        Text, headings, lists, tables and images are kept. Page layout, headers and footers, and Word’s exact fonts are not.
      </p>
      <DocumentEditor editor={editor} settings={settings} disabled={isExporting || loading} />
    </ToolWorkspace>
  );
}
