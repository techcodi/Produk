"use client";

import { useCallback, useMemo, useState } from "react";
import { ArrowDownAZ, ArrowUpDown, ImagePlus, Trash2 } from "lucide-react";
import { DropZone } from "@/components/files/drop-zone";
import { PendingIndicator } from "@/components/files/pending-indicator";
import { RejectedNotice } from "@/components/files/rejected-notice";
import { ToolWorkspace } from "@/components/files/tool-workspace";
import { Button } from "@/components/ui/button";
import { usePasteFiles } from "@/hooks/use-paste-files";
import { formatBytes, pluralize } from "@/lib/format";
import { IMAGE_ACCEPT_ATTRIBUTE } from "@/lib/images";
import { DEFAULT_SETTINGS } from "../constants";
import { useImageCollection } from "../hooks/use-image-collection";
import { usePdfExport } from "../hooks/use-pdf-export";
import type { PdfSettings, RejectedFile } from "../types";
import { ExportPanel } from "./export-panel";
import { ImageGrid } from "./image-grid";
import { SettingsPanel } from "./settings-panel";

const DROP_ZONE_TEXT = {
  accept: IMAGE_ACCEPT_ATTRIBUTE,
  icon: ImagePlus,
  title: "Drag & drop photos here",
  dropTitle: "Drop to add your images",
  hint: "JPG, PNG, WebP, HEIC, GIF and more · or paste with Ctrl/⌘ + V",
  buttonLabel: "Choose images",
  compactLabel: "Add images",
};

export function ImagesToPdfTool() {
  const images = useImageCollection();
  const exporter = usePdfExport();
  const [settings, setSettings] = useState<PdfSettings>(DEFAULT_SETTINGS);
  const [rejected, setRejected] = useState<RejectedFile[]>([]);

  const { addFiles, remove, rotate, move, sortByName, reverse, clear } = images;
  const { reset: invalidateExport, start: startExport } = exporter;
  const isExporting = exporter.state.status === "processing";
  const isImporting = images.pendingCount > 0;

  // Any edit makes a previously generated PDF stale, so each action drops it.
  // Memoised so ImageCard's memo() isn't defeated by fresh callbacks.
  const actions = useMemo(() => {
    const withInvalidate =
      <A extends unknown[]>(fn: (...args: A) => void) =>
      (...args: A) => {
        invalidateExport();
        fn(...args);
      };
    return {
      move: withInvalidate(move),
      rotate: withInvalidate(rotate),
      remove: withInvalidate(remove),
      sortByName: withInvalidate(sortByName),
      reverse: withInvalidate(reverse),
      clear: withInvalidate(clear),
    };
  }, [invalidateExport, move, rotate, remove, sortByName, reverse, clear]);

  const handleFiles = useCallback(
    async (files: File[]) => {
      invalidateExport();
      setRejected(await addFiles(files));
    },
    [addFiles, invalidateExport],
  );

  usePasteFiles(handleFiles);

  const totalSize = images.items.reduce((sum, item) => sum + item.size, 0);

  if (images.items.length === 0) {
    return (
      <div className="space-y-4">
        <RejectedNotice rejected={rejected} onDismiss={() => setRejected([])} />
        <DropZone {...DROP_ZONE_TEXT} onFiles={handleFiles} />
        {isImporting && <ImportingIndicator count={images.pendingCount} />}
      </div>
    );
  }

  return (
    <ToolWorkspace
      mainLabel="Pages"
      settingsTitle="PDF settings"
      settings={
        <SettingsPanel
          settings={settings}
          disabled={isExporting}
          onChange={(patch) => {
            invalidateExport();
            setSettings((prev) => ({ ...prev, ...patch }));
          }}
        />
      }
      action={
        <ExportPanel
          state={exporter.state}
          imageCount={images.items.length}
          busy={isImporting}
          onExport={() => startExport(images.items, settings)}
          onCancel={invalidateExport}
        />
      }
    >
      <RejectedNotice rejected={rejected} onDismiss={() => setRejected([])} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          <span className="font-medium text-foreground">{pluralize(images.items.length, "image")}</span> · {formatBytes(totalSize)}
          <span className="hidden sm:inline"> · Drag to reorder</span>
        </p>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={actions.sortByName} disabled={isExporting}>
            <ArrowDownAZ /> Sort A–Z
          </Button>
          <Button variant="ghost" size="sm" onClick={actions.reverse} disabled={isExporting}>
            <ArrowUpDown /> Reverse
          </Button>
          <Button variant="danger" size="sm" onClick={actions.clear} disabled={isExporting}>
            <Trash2 /> Clear
          </Button>
        </div>
      </div>

      {isImporting && <ImportingIndicator count={images.pendingCount} />}

      <ImageGrid
        items={images.items}
        onMove={actions.move}
        onRotate={actions.rotate}
        onRemove={actions.remove}
        trailing={<DropZone {...DROP_ZONE_TEXT} variant="compact" className="aspect-[3/4]" onFiles={handleFiles} />}
      />
    </ToolWorkspace>
  );
}

function ImportingIndicator({ count }: { count: number }) {
  return <PendingIndicator label={`Preparing ${pluralize(count, "photo")}…`} />;
}
