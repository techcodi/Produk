"use client";

import { useRef, useState } from "react";
import { FileUp } from "lucide-react";
import { DocumentEditor } from "@/components/editor/document-editor";
import { DocumentExportPanel } from "@/components/editor/document-export-panel";
import { DocumentSettingsPanel } from "@/components/editor/document-settings-panel";
import { ToolWorkspace } from "@/components/files/tool-workspace";
import { Button } from "@/components/ui/button";
import { useDocumentEditor } from "@/hooks/use-document-editor";
import { useDocumentExport } from "@/hooks/use-document-export";
import { isPlainText, TEXT_ACCEPT_ATTRIBUTE, textToHtml } from "@/lib/document/import";
import type { DocNode, DocumentSettings } from "@/lib/document/types";
import { isDocumentEmpty } from "@/lib/document/walk";
import { DEFAULT_SETTINGS, MAX_TEXT_FILE_BYTES } from "../constants";

export function TextToPdfWorkspace() {
  const exporter = useDocumentExport(DEFAULT_SETTINGS.fileName);
  const { reset: invalidate } = exporter;
  const [settings, setSettings] = useState<DocumentSettings>(DEFAULT_SETTINGS);
  const [empty, setEmpty] = useState(true);
  const [importError, setImportError] = useState<string | null>(null);
  const textInput = useRef<HTMLInputElement>(null);

  const editor = useDocumentEditor({
    placeholder: "Start typing, or paste your text here…",
    onChange: (current) => {
      invalidate();
      setEmpty(isDocumentEmpty(current.getJSON() as DocNode));
    },
  });

  const isExporting = exporter.state.status === "processing";

  const importText = async (file: File) => {
    setImportError(null);
    if (!isPlainText(file)) return setImportError(`${file.name} isn’t a text file. Use Word to PDF for .docx files.`);
    if (file.size > MAX_TEXT_FILE_BYTES) return setImportError(`${file.name} is too large to edit comfortably here.`);
    editor?.chain().focus().insertContent(textToHtml(await file.text())).run();
  };

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
          blockedReason={empty ? "Type or paste some text first" : undefined}
          busyLabel={editor ? undefined : "Loading editor…"}
          onExport={(format) => editor && exporter.exportAs(format, editor, settings)}
          onCancel={invalidate}
        />
      }
    >
      {importError && (
        <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">
          {importError}
        </p>
      )}
      <DocumentEditor
        editor={editor}
        settings={settings}
        disabled={isExporting}
        toolbarExtras={
          <>
            <Button variant="ghost" size="sm" onClick={() => textInput.current?.click()} disabled={isExporting}>
              <FileUp /> Open .txt
            </Button>
            <input
              ref={textInput}
              type="file"
              accept={TEXT_ACCEPT_ATTRIBUTE}
              className="sr-only"
              tabIndex={-1}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void importText(file);
              }}
            />
          </>
        }
      />
    </ToolWorkspace>
  );
}
