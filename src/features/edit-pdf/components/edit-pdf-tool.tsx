"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FilePen, FileUp } from "lucide-react";
import { DropZone } from "@/components/files/drop-zone";
import { PendingIndicator } from "@/components/files/pending-indicator";
import { RejectedNotice } from "@/components/files/rejected-notice";
import { SelectedFileBar } from "@/components/files/selected-file-bar";
import { TaskPanel } from "@/components/files/task-panel";
import { ToolWorkspace } from "@/components/files/tool-workspace";
import { usePasteFiles } from "@/hooks/use-paste-files";
import { useSinglePdf } from "@/hooks/use-single-pdf";
import { isOutOfMemory, useTask } from "@/hooks/use-task";
import { createOutputFile, releaseOutputFile, triggerDownload, type OutputFile } from "@/lib/download";
import { sanitizeFileName, stripExtension } from "@/lib/files";
import { formatBytes, pluralize } from "@/lib/format";
import { IMAGE_ACCEPT_ATTRIBUTE } from "@/lib/images";
import { PDF_ACCEPT_ATTRIBUTE, PdfReadError } from "@/lib/pdf/documents";
import { MAX_FILE_SIZE_BYTES } from "../constants";
import { prepareImage } from "../core/prepare-image";
import { applyEdits, UnsupportedTextError } from "../core/save";
import { useEditObjects } from "../hooks/use-edit-objects";
import { usePageGeometry } from "../hooks/use-page-geometry";
import type { EditMode, EditObject, PendingImage } from "../types";
import { EditToolbar } from "./edit-toolbar";
import { PdfPageEditor } from "./pdf-page-editor";
import { SignatureDialog } from "./signature-dialog";

const DROP_ZONE_TEXT = {
  accept: PDF_ACCEPT_ATTRIBUTE,
  icon: FileUp,
  title: "Drag & drop a PDF here",
  dropTitle: "Drop to open your PDF",
  hint: "Edit text, sign, add images and cover things up",
  buttonLabel: "Choose PDF",
  multiple: false,
};

function describeError(error: unknown): string {
  if (error instanceof UnsupportedTextError) return `${error.message}. Try removing them.`;
  if (error instanceof PdfReadError) return `${error.message}, so it can’t be edited.`;
  if (isOutOfMemory(error)) return "Your device ran out of memory. Try smaller images.";
  return "Something went wrong while saving. Please try again.";
}

const isTyping = (target: EventTarget | null) => target instanceof HTMLElement && Boolean(target.closest("input, textarea, select, [contenteditable='true']"));

export function EditPdfTool() {
  const pdf = useSinglePdf({ maxFileSize: MAX_FILE_SIZE_BYTES });
  const doc = pdf.document.status === "ready" ? pdf.document.doc : null;
  const geometry = usePageGeometry(doc);
  const edits = useEditObjects();
  const task = useTask<OutputFile>({ release: releaseOutputFile, describeError });
  const [mode, setMode] = useState<EditMode>("select");
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const imageInput = useRef<HTMLInputElement>(null);

  const { reset: invalidate, start } = task;
  const { select: selectObject, add, update, remove, clear } = edits;
  const isSaving = task.state.status === "processing";
  const selected = edits.objects.find((object) => object.id === edits.selectedId) ?? null;

  // Every change makes a saved copy stale. Memoised so PdfPageEditor's memo() holds.
  const actions = useMemo(
    () => ({
      add: (object: EditObject, focus = false) => {
        invalidate();
        add(object);
        setFocusId(focus ? object.id : null);
      },
      update: (id: string, patch: Partial<EditObject>) => {
        invalidate();
        update(id, patch);
      },
      remove: (id: string) => {
        invalidate();
        remove(id);
      },
      select: (id: string | null) => {
        selectObject(id);
        setFocusId(null);
      },
      placed: () => {
        setPendingImage(null);
        setMode("select");
      },
    }),
    [invalidate, add, update, remove, selectObject],
  );

  const handleFiles = useCallback(
    (files: File[]) => {
      if (edits.objects.length > 0 && !window.confirm("Open another PDF? Your edits to this one will be lost.")) return;
      invalidate();
      if (pdf.select(files)) {
        clear();
        setMode("select");
        setPendingImage(null);
      }
    },
    [clear, edits.objects.length, invalidate, pdf],
  );

  usePasteFiles(handleFiles);

  // Delete removes the selected object; Escape drops the selection and any pending placement.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        actions.select(null);
        setPendingImage(null);
        setMode((current) => (current === "place" ? "select" : current));
      } else if ((event.key === "Delete" || event.key === "Backspace") && edits.selectedId && !isTyping(event.target)) {
        event.preventDefault();
        actions.remove(edits.selectedId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [actions, edits.selectedId]);

  // Edits live only in this tab; warn before they are thrown away.
  useEffect(() => {
    if (edits.objects.length === 0 || task.state.status === "success") return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [edits.objects.length, task.state.status]);

  const beginPlacing = (image: PendingImage) => {
    actions.select(null);
    setPendingImage(image);
    setMode("place");
  };

  const handleImageFile = async (file: File) => {
    setImageError(null);
    try {
      beginPlacing(await prepareImage(file));
    } catch {
      setImageError(`${file.name} couldn’t be read as an image.`);
    }
  };

  const handleSave = async () => {
    if (!pdf.file || !geometry) return;
    const source = pdf.file;
    const objects = edits.objects;
    const pages = geometry;
    const base = stripExtension(sanitizeFileName(stripExtension(source.name), "pdf", "document"));
    actions.select(null);

    const result = await start(1, async ({ signal, progress }) => {
      const bytes = await applyEdits(source, objects, pages, base);
      signal.throwIfAborted();
      progress(1, 1);
      return createOutputFile(bytes, `${base}-edited.pdf`, "application/pdf");
    });
    if (result) triggerDownload(result.url, result.fileName);
  };

  if (!pdf.file) {
    return (
      <div className="space-y-4">
        <RejectedNotice rejected={pdf.rejected} onDismiss={pdf.dismissRejected} />
        <DropZone {...DROP_ZONE_TEXT} onFiles={handleFiles} />
      </div>
    );
  }

  const pageCount = pdf.document.status === "ready" ? pdf.document.pageCount : 0;
  const editCount = edits.objects.length;

  return (
    <ToolWorkspace
      mainLabel="Pages"
      settingsTitle="Your edits"
      settings={
        <div className="space-y-2 text-sm text-muted">
          <p>
            {editCount === 0 ? "No changes yet." : <span className="font-medium text-foreground">{pluralize(editCount, "change")}</span>}
          </p>
          <p>Edited text is redrawn in a standard font over the original, so it may look slightly different.</p>
          <p>Edits and whiteout cover the original rather than delete it, so it can still be copied out of the file.</p>
        </div>
      }
      action={
        <TaskPanel
          state={task.state}
          progressLabel={() => "Saving your PDF…"}
          describeResult={(file) => ({ title: "Your edited PDF is ready", download: file })}
          actionIcon={<FilePen />}
          actionLabel={editCount > 0 ? "Save & download PDF" : "Make a change first"}
          disabled={editCount === 0 || !geometry}
          busyLabel={pdf.document.status === "loading" ? "Opening PDF…" : undefined}
          onStart={handleSave}
          onCancel={invalidate}
        />
      }
    >
      <RejectedNotice rejected={pdf.rejected} onDismiss={pdf.dismissRejected} />
      <SelectedFileBar
        name={pdf.file.name}
        detail={[pageCount > 0 && pluralize(pageCount, "page"), formatBytes(pdf.file.size)].filter(Boolean).join(" · ")}
        disabled={isSaving}
        onReplace={() => {
          if (edits.objects.length > 0 && !window.confirm("Close this PDF? Your edits will be lost.")) return;
          invalidate();
          clear();
          pdf.clear();
        }}
      />

      {pdf.document.status === "error" && (
        <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">
          {pdf.document.message}. Try another file.
        </p>
      )}
      {(pdf.document.status === "loading" || (doc && !geometry)) && <PendingIndicator label="Opening PDF…" />}

      {doc && geometry && (
        <>
          <EditToolbar
            mode={mode}
            selected={selected}
            disabled={isSaving}
            onModeChange={(next) => {
              actions.select(null);
              setPendingImage(null);
              setMode(next);
            }}
            onSign={() => setSigning(true)}
            onAddImage={() => imageInput.current?.click()}
            onUpdate={(patch) => selected && actions.update(selected.id, patch)}
            onDelete={() => selected && actions.remove(selected.id)}
          />
          {imageError && (
            <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">
              {imageError}
            </p>
          )}
          <div className="space-y-10 rounded-2xl bg-surface-muted px-2 pb-10 pt-4 sm:px-6">
            {geometry.map((pageGeometry, index) => (
              <PdfPageEditor
                key={index}
                doc={doc}
                pageNumber={index + 1}
                geometry={pageGeometry}
                objects={edits.objects.filter((object) => object.page === index + 1)}
                selectedId={edits.selectedId}
                focusId={focusId}
                mode={mode}
                pendingImage={pendingImage}
                onSelect={actions.select}
                onAdd={actions.add}
                onUpdate={actions.update}
                onRemove={actions.remove}
                onPlaced={actions.placed}
              />
            ))}
          </div>
        </>
      )}

      <input
        ref={imageInput}
        type="file"
        accept={IMAGE_ACCEPT_ATTRIBUTE}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void handleImageFile(file);
        }}
      />
      <SignatureDialog
        open={signing}
        onClose={() => setSigning(false)}
        onCreate={(signature) => {
          setSigning(false);
          beginPlacing(signature);
        }}
      />
    </ToolWorkspace>
  );
}
