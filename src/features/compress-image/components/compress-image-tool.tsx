"use client";

import { useCallback, useMemo, useState } from "react";
import { Download, ImagePlus, Minimize2, Trash2 } from "lucide-react";
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
import { compressImages, ImageCompressError } from "../core/compress";
import type { CompressSettings } from "../types";
import { CompressSettingsPanel } from "./compress-settings-panel";

const DROP_ZONE_TEXT = {
  accept: IMAGE_ACCEPT_ATTRIBUTE,
  icon: ImagePlus,
  title: "Drag & drop photos here",
  dropTitle: "Drop to add your images",
  hint: "JPG, PNG, WebP, HEIC and more · or paste with Ctrl/⌘ + V",
  buttonLabel: "Choose images",
  compactLabel: "Add more images",
};

interface CompressResult {
  output: BatchOutput;
  /** Total size after compression (originals count where they were kept). */
  totalSize: number;
  keptCount: number;
}

function describeError(error: unknown): string {
  if (error instanceof ImageCompressError) return `${error.message}. Try removing it or re-saving it as JPG.`;
  if (isOutOfMemory(error)) return "Your device ran out of memory. Try fewer images at a time.";
  return "Something went wrong while compressing. Please try again.";
}

const percentSaved = (before: number, after: number) => Math.max(0, Math.round((1 - after / before) * 100));

export function CompressImageTool() {
  const images = useImageFiles({ maxFiles: MAX_FILES, maxFileSize: MAX_FILE_SIZE_BYTES });
  const task = useTask<CompressResult>({ release: (result) => releaseBatchOutput(result.output), describeError });
  const [settings, setSettings] = useState<CompressSettings>(DEFAULT_SETTINGS);
  const [rejected, setRejected] = useState<RejectedFile[]>([]);

  const { addFiles, remove, clear } = images;
  const { reset: invalidate, start } = task;
  const isCompressing = task.state.status === "processing";
  const isImporting = images.pendingCount > 0;
  const result = task.state.status === "success" ? task.state.result : null;

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

  const totalSize = images.items.reduce((sum, item) => sum + item.size, 0);

  const handleCompress = async () => {
    const items = images.items;
    const run = await start(items.length, async ({ signal, progress }) => {
      const compressed = await compressImages(items, settings, { signal, onProgress: progress });
      return {
        output: await createBatchOutput(compressed, "produk-compressed.zip"),
        totalSize: compressed.reduce((sum, image) => sum + image.blob.size, 0),
        keptCount: compressed.filter((image) => image.kept).length,
      };
    });
    const download = run && primaryDownload(run.output);
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
      settingsTitle="Compression settings"
      settings={
        <CompressSettingsPanel
          settings={settings}
          disabled={isCompressing}
          onChange={(patch) => {
            invalidate();
            setSettings((prev) => ({ ...prev, ...patch }));
          }}
        />
      }
      action={
        <TaskPanel
          state={task.state}
          progressLabel={(completed, total) => `Compressing image ${Math.min(completed + 1, total)} of ${total}…`}
          describeResult={(done) => ({
            title:
              done.totalSize < totalSize
                ? `Saved ${formatBytes(totalSize - done.totalSize)} (${percentSaved(totalSize, done.totalSize)}%)`
                : "Your images are already well optimised",
            detail: `${formatBytes(totalSize)} → ${formatBytes(done.totalSize)}${
              done.keptCount > 0 ? ` · ${pluralize(done.keptCount, "original")} kept` : ""
            }`,
            download: primaryDownload(done.output),
          })}
          actionIcon={<Minimize2 />}
          actionLabel={`Compress ${pluralize(images.items.length, "image")}`}
          busyLabel={isImporting ? "Preparing images…" : undefined}
          onStart={handleCompress}
          onCancel={invalidate}
        />
      }
    >
      <RejectedNotice rejected={rejected} onDismiss={() => setRejected([])} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          <span className="font-medium text-foreground">{pluralize(images.items.length, "image")}</span> · {formatBytes(totalSize)}
        </p>
        <Button variant="danger" size="sm" onClick={actions.clear} disabled={isCompressing}>
          <Trash2 /> Clear
        </Button>
      </div>

      {isImporting && <PendingIndicator label={`Preparing ${pluralize(images.pendingCount, "image")}…`} />}

      <ul className="space-y-2">
        {images.items.map((item) => {
          const output = result?.output.files.get(item.id);
          return (
            <ImageFileRow
              key={item.id}
              name={item.name}
              previewUrl={item.previewUrl}
              detail={
                output ? (
                  <>
                    {formatBytes(item.size)} → <span className="font-medium text-foreground">{formatBytes(output.size)}</span>{" "}
                    {output.size < item.size ? (
                      <span className="font-medium text-success">−{percentSaved(item.size, output.size)}%</span>
                    ) : (
                      <span>· already optimised</span>
                    )}
                  </>
                ) : (
                  <>
                    {formatBytes(item.size)} · {item.dimensions.width}×{item.dimensions.height}
                  </>
                )
              }
              actions={
                output ? (
                  <a
                    href={output.url}
                    download={output.fileName}
                    aria-label={`Download ${output.fileName}`}
                    className={buttonStyles({ variant: "ghost", size: "icon" })}
                  >
                    <Download />
                  </a>
                ) : (
                  <Button
                    variant="danger"
                    size="icon"
                    aria-label={`Remove ${item.name}`}
                    onClick={() => actions.remove(item.id)}
                    disabled={isCompressing}
                  >
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
