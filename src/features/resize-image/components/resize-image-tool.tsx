"use client";

import { useCallback, useMemo, useState } from "react";
import { Download, ImagePlus, Scaling, Trash2 } from "lucide-react";
import { DropZone } from "@/components/files/drop-zone";
import { ImageFileRow } from "@/components/files/image-file-row";
import { PendingIndicator } from "@/components/files/pending-indicator";
import { RejectedNotice } from "@/components/files/rejected-notice";
import { TaskPanel } from "@/components/files/task-panel";
import { ToolWorkspace } from "@/components/files/tool-workspace";
import { Button, buttonStyles } from "@/components/ui/button";
import { useImageFiles } from "@/hooks/use-image-files";
import { usePasteFiles } from "@/hooks/use-paste-files";
import { isOutOfMemory, useTask } from "@/hooks/use-task";
import { createBatchOutput, primaryDownload, releaseBatchOutput, type BatchOutput } from "@/lib/batch";
import { triggerDownload } from "@/lib/download";
import type { RejectedFile } from "@/lib/files";
import { formatBytes, pluralize } from "@/lib/format";
import { IMAGE_ACCEPT_ATTRIBUTE } from "@/lib/images";
import { DEFAULT_SETTINGS, MAX_FILE_SIZE_BYTES, MAX_FILES } from "../constants";
import { ImageResizeError, resizeImages } from "../core/resize";
import { computeTargetSize, validateResizeSettings } from "../core/target-size";
import type { ResizeSettings } from "../types";
import { ResizeSettingsPanel } from "./resize-settings-panel";

const DROP_ZONE_TEXT = {
  accept: IMAGE_ACCEPT_ATTRIBUTE,
  icon: ImagePlus,
  title: "Drag & drop photos here",
  dropTitle: "Drop to add your images",
  hint: "JPG, PNG, WebP, HEIC and more · or paste with Ctrl/⌘ + V",
  buttonLabel: "Choose images",
  compactLabel: "Add more images",
};

function describeError(error: unknown): string {
  if (error instanceof ImageResizeError) return `${error.message}. Try removing it or re-saving it as JPG.`;
  if (isOutOfMemory(error)) return "Your device ran out of memory. Try a smaller size or fewer images.";
  return "Something went wrong while resizing. Please try again.";
}

export function ResizeImageTool() {
  const images = useImageFiles({ maxFiles: MAX_FILES, maxFileSize: MAX_FILE_SIZE_BYTES });
  const task = useTask<BatchOutput>({ release: releaseBatchOutput, describeError });
  const [settings, setSettings] = useState<ResizeSettings>(DEFAULT_SETTINGS);
  const [rejected, setRejected] = useState<RejectedFile[]>([]);

  const { addFiles, remove, clear } = images;
  const { reset: invalidate, start } = task;
  const isResizing = task.state.status === "processing";
  const isImporting = images.pendingCount > 0;
  const output = task.state.status === "success" ? task.state.result : null;
  const settingsError = validateResizeSettings(settings);

  const actions = useMemo(
    () => ({
      remove: (id: string) => {
        invalidate();
        remove(id);
      },
      clear: () => {
        invalidate();
        clear();
      },
    }),
    [invalidate, remove, clear],
  );

  const handleFiles = useCallback(
    async (files: File[]) => {
      invalidate();
      setRejected(await addFiles(files));
    },
    [addFiles, invalidate],
  );

  usePasteFiles(handleFiles);

  const handleResize = async () => {
    if (settingsError) return;
    const items = images.items;
    const result = await start(items.length, async ({ signal, progress }) => {
      const resized = await resizeImages(items, settings, { signal, onProgress: progress });
      return createBatchOutput(resized, "produk-resized.zip");
    });
    const download = result && primaryDownload(result);
    if (download) triggerDownload(download.url, download.fileName);
  };

  if (images.items.length === 0) {
    return (
      <div className="space-y-4">
        <RejectedNotice rejected={rejected} onDismiss={() => setRejected([])} />
        <DropZone {...DROP_ZONE_TEXT} onFiles={handleFiles} />
        {isImporting && <PendingIndicator label={`Preparing ${pluralize(images.pendingCount, "image")}…`} />}
      </div>
    );
  }

  return (
    <ToolWorkspace
      mainLabel="Images"
      settingsTitle="Resize settings"
      settings={
        <ResizeSettingsPanel
          settings={settings}
          error={settingsError}
          disabled={isResizing}
          onChange={(patch) => {
            invalidate();
            setSettings((prev) => ({ ...prev, ...patch }));
          }}
        />
      }
      action={
        <TaskPanel
          state={task.state}
          progressLabel={(completed, total) => `Resizing image ${Math.min(completed + 1, total)} of ${total}…`}
          describeResult={(done) => ({
            title: done.archive ? `${pluralize(done.files.size, "image")} ready in one ZIP` : "Your image is ready",
            download: primaryDownload(done),
          })}
          actionIcon={<Scaling />}
          actionLabel={`Resize ${pluralize(images.items.length, "image")}`}
          disabled={Boolean(settingsError)}
          busyLabel={isImporting ? "Preparing images…" : undefined}
          onStart={handleResize}
          onCancel={invalidate}
        />
      }
    >
      <RejectedNotice rejected={rejected} onDismiss={() => setRejected([])} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          <span className="font-medium text-foreground">{pluralize(images.items.length, "image")}</span>
        </p>
        <Button variant="danger" size="sm" onClick={actions.clear} disabled={isResizing}>
          <Trash2 /> Clear
        </Button>
      </div>

      {isImporting && <PendingIndicator label={`Preparing ${pluralize(images.pendingCount, "image")}…`} />}

      <ul className="space-y-2">
        {images.items.map((item) => {
          const target = settingsError ? null : computeTargetSize(item.dimensions, settings);
          const file = output?.files.get(item.id);
          return (
            <ImageFileRow
              key={item.id}
              name={item.name}
              previewUrl={item.previewUrl}
              detail={
                <>
                  {item.dimensions.width}×{item.dimensions.height}
                  {target && (
                    <>
                      {" → "}
                      <span className="font-medium text-foreground">
                        {target.width}×{target.height}
                      </span>
                      {target.limited && <span title="Reduced to stay within what browsers can draw"> (max size)</span>}
                    </>
                  )}
                  {file && <> · {formatBytes(file.size)}</>}
                </>
              }
              actions={
                file ? (
                  <a
                    href={file.url}
                    download={file.fileName}
                    aria-label={`Download ${file.fileName}`}
                    className={buttonStyles({ variant: "ghost", size: "icon" })}
                  >
                    <Download />
                  </a>
                ) : (
                  <Button variant="danger" size="icon" aria-label={`Remove ${item.name}`} onClick={() => actions.remove(item.id)} disabled={isResizing}>
                    <Trash2 />
                  </Button>
                )
              }
            />
          );
        })}
      </ul>
      <DropZone {...DROP_ZONE_TEXT} variant="compact" className="h-24" onFiles={handleFiles} />
    </ToolWorkspace>
  );
}
