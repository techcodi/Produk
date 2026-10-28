"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, ImagePlus, Loader2, Sparkles, Wand2 } from "lucide-react";
import { DropZone } from "@/components/files/drop-zone";
import { RejectedNotice } from "@/components/files/rejected-notice";
import { SelectedFileBar } from "@/components/files/selected-file-bar";
import { TaskPanel } from "@/components/files/task-panel";
import { ToolWorkspace } from "@/components/files/tool-workspace";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { usePasteFiles } from "@/hooks/use-paste-files";
import { isOutOfMemory, useTask } from "@/hooks/use-task";
import { triggerDownload } from "@/lib/download";
import { partitionFiles, sanitizeFileName, stripExtension, type RejectedFile } from "@/lib/files";
import { formatBytes } from "@/lib/format";
import { IMAGE_ACCEPT_ATTRIBUTE, isSupportedImage, readImageSize, type Size } from "@/lib/images";
import { cn } from "@/lib/cn";
import { hasFp16WebGpu } from "@/lib/webgpu";
import { isModelCached, ModelDownloadError } from "@/lib/background-removal/model-store";
import { MODELS, type ModelId, type RemovalStage } from "@/lib/background-removal/models";
import { BackgroundRemovalError, removeBackground, toDecodable } from "@/lib/background-removal/remove-background";
import { BACKGROUND_PRESETS, MAX_FILE_SIZE_BYTES } from "../constants";
import { composeOutput } from "../core/compose";
import type { BackgroundChoice, Cutout } from "../types";
import { CompareView } from "./compare-view";

const DROP_ZONE_TEXT = {
  accept: IMAGE_ACCEPT_ATTRIBUTE,
  icon: ImagePlus,
  title: "Drag & drop a photo here",
  dropTitle: "Drop to remove its background",
  hint: "JPG, PNG, WebP, HEIC · or paste with Ctrl/⌘ + V",
  buttonLabel: "Choose image",
  multiple: false,
};

interface Source {
  file: File;
  /** Browser-decodable copy (HEIC converted). */
  blob: Blob;
  url: string;
  size: Size;
}

function describeError(error: unknown): string {
  if (error instanceof ModelDownloadError || error instanceof BackgroundRemovalError) return error.message;
  if (isOutOfMemory(error)) return "Your device ran out of memory. Try the Fast model or a smaller image.";
  return "Something went wrong while removing the background. Please try again.";
}

function stageLabel(stage: RemovalStage | null, model: ModelId): string {
  if (!stage) return "Starting…";
  if (stage.stage === "download") {
    return `Downloading the AI model… ${formatBytes(stage.loaded)} of ${formatBytes(stage.total)}`;
  }
  if (stage.stage === "prepare") return "Loading the AI model…";
  return model === "hd" ? "Removing background (high quality)…" : "Removing background…";
}

export function RemoveBackgroundTool() {
  const [source, setSource] = useState<Source | null>(null);
  const [rejected, setRejected] = useState<RejectedFile[]>([]);
  const [model, setModel] = useState<ModelId>("fast");
  const [background, setBackground] = useState<BackgroundChoice>("transparent");
  const [stage, setStage] = useState<RemovalStage | null>(null);
  const [hdCached, setHdCached] = useState(false);
  const [gpu, setGpu] = useState<boolean | null>(null);
  const [downloading, setDownloading] = useState(false);
  const sourceUrl = useRef<string | null>(null);

  const task = useTask<Cutout>({ release: (cutout) => URL.revokeObjectURL(cutout.url), describeError });
  const { start, reset } = task;
  const cutout = task.state.status === "success" ? task.state.result : null;
  const working = task.state.status === "processing";

  useEffect(() => {
    void isModelCached(MODELS.hd).then(setHdCached);
    void hasFp16WebGpu().then(setGpu);
    return () => {
      if (sourceUrl.current) URL.revokeObjectURL(sourceUrl.current);
    };
  }, []);

  const run = useCallback(
    async (input: Source, modelId: ModelId) => {
      setStage(null);
      await start(1, async ({ signal, progress }) => {
        const result = await removeBackground(input.blob, modelId, { signal, onStage: setStage });
        progress(1, 1);
        return { ...result, url: URL.createObjectURL(result.blob), model: modelId };
      });
      if (modelId === "hd") setHdCached(await isModelCached(MODELS.hd));
    },
    [start],
  );

  const handleFiles = useCallback(
    async (files: File[]) => {
      const { accepted, rejected } = partitionFiles(files.slice(0, 1), 0, {
        isAccepted: isSupportedImage,
        typeError: "Not a supported image type",
        maxFiles: 1,
        maxFileSize: MAX_FILE_SIZE_BYTES,
        noun: "images",
      });
      setRejected(rejected);
      const file = accepted[0];
      if (!file) return;

      reset();
      try {
        const blob = await toDecodable(file);
        const url = URL.createObjectURL(blob);
        const size = await readImageSize(url);
        if (sourceUrl.current) URL.revokeObjectURL(sourceUrl.current);
        sourceUrl.current = url;
        const next = { file, blob, url, size };
        setSource(next);
        // Start straight away: removing the background is the only thing to do here.
        void run(next, model);
      } catch {
        setRejected([{ file, reason: "This image couldn’t be read" }]);
      }
    },
    [model, reset, run],
  );

  usePasteFiles(handleFiles);

  const download = async () => {
    if (!cutout || !source) return;
    setDownloading(true);
    try {
      const blob = await composeOutput(cutout.blob, background);
      const base = stripExtension(sanitizeFileName(stripExtension(source.file.name), "png", "image"));
      const name = background === "transparent" ? `${base}-no-background.png` : `${base}-new-background.jpg`;
      const url = URL.createObjectURL(blob);
      triggerDownload(url, name);
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } finally {
      setDownloading(false);
    }
  };

  if (!source) {
    return (
      <div className="space-y-4">
        <RejectedNotice rejected={rejected} onDismiss={() => setRejected([])} />
        <DropZone {...DROP_ZONE_TEXT} onFiles={handleFiles} />
        <p className="text-center text-xs text-muted">
          Runs on your device with a small AI model ({formatBytes(MODELS.fast.bytes)}), downloaded once the first time.
        </p>
      </div>
    );
  }

  // On the CPU the HD model takes many minutes, so it is only offered with a GPU that runs it well.
  const hdUnavailable = gpu === false;
  const hdHint =
    model !== "hd"
      ? "Fast and light. Great for clear subjects on simple backgrounds."
      : hdUnavailable
        ? "High quality needs a graphics card this browser can use for AI (WebGPU with fp16), such as recent Chrome or Edge on a laptop or desktop. Fast mode works everywhere."
        : `Sharper edges on hair, fur and fine detail. ${hdCached ? "Model already downloaded." : `One-time ${formatBytes(MODELS.hd.bytes)} download — best on Wi-Fi.`}`;

  return (
    <ToolWorkspace
      mainLabel="Image"
      settingsTitle="Background removal"
      settings={
        <div className="space-y-5">
          <SegmentedControl
            label="Quality"
            value={model}
            options={[
              { value: "fast", label: "Fast" },
              { value: "hd", label: "High quality" },
            ]}
            // Changing quality keeps the current result; a new run (and any 94 MB download) waits for a button press.
            onChange={setModel}
            disabled={working}
            hint={hdHint}
          />
          <fieldset disabled={!cutout} className="min-w-0 disabled:opacity-50">
            <legend className="mb-2 text-sm font-medium">New background</legend>
            <div className="flex flex-wrap items-center gap-2">
              {BACKGROUND_PRESETS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  aria-label={label}
                  aria-pressed={background === value}
                  title={label}
                  onClick={() => setBackground(value)}
                  className={cn(
                    "size-9 rounded-lg border focus-visible:outline-2 focus-visible:outline-brand",
                    background === value ? "border-brand ring-2 ring-brand" : "border-border",
                  )}
                  style={
                    value === "transparent"
                      ? { backgroundImage: "conic-gradient(#d1d5db 25%, #fff 0 50%, #d1d5db 0 75%, #fff 0)", backgroundSize: "10px 10px" }
                      : { background: value }
                  }
                />
              ))}
              <label
                className={cn(
                  "relative size-9 cursor-pointer overflow-hidden rounded-lg border bg-[conic-gradient(red,yellow,lime,aqua,blue,magenta,red)]",
                  background.startsWith("#") && !BACKGROUND_PRESETS.some((p) => p.value === background) ? "border-brand ring-2 ring-brand" : "border-border",
                )}
              >
                <span className="sr-only">Custom colour</span>
                <input
                  type="color"
                  value={background === "transparent" ? "#ffffff" : background}
                  onChange={(event) => setBackground(event.target.value as BackgroundChoice)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>
            </div>
            <p className="mt-1.5 text-xs text-muted">
              {background === "transparent" ? "Downloads as a transparent PNG." : "Downloads as a JPG with this colour behind the subject."}
            </p>
          </fieldset>
        </div>
      }
      action={
        cutout ? (
          <div className="space-y-3">
            <Button size="lg" className="w-full" onClick={download} disabled={downloading}>
              {downloading ? <Loader2 className="animate-spin" /> : <Download />}
              Download {background === "transparent" ? "PNG" : "JPG"}
            </Button>
            {cutout.model === "fast" && !hdUnavailable && (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  setModel("hd");
                  void run(source, "hd");
                }}
              >
                <Sparkles /> Try high quality{hdCached ? "" : ` (${formatBytes(MODELS.hd.bytes)} once)`}
              </Button>
            )}
          </div>
        ) : (
          <TaskPanel
            state={task.state}
            progressLabel={() => stageLabel(stage, model)}
            describeResult={() => ({ title: "Done" })}
            actionIcon={<Wand2 />}
            actionLabel={
              model === "hd" && hdUnavailable
                ? "High quality isn’t available here"
                : model === "hd" && !hdCached
                  ? `Remove background (${formatBytes(MODELS.hd.bytes)} download)`
                  : "Remove background"
            }
            disabled={model === "hd" && (hdUnavailable || gpu === null)}
            onStart={() => void run(source, model)}
            onCancel={reset}
          />
        )
      }
    >
      <RejectedNotice rejected={rejected} onDismiss={() => setRejected([])} />
      <SelectedFileBar
        name={source.file.name}
        detail={`${source.size.width}×${source.size.height} · ${formatBytes(source.file.size)}`}
        disabled={working}
        onReplace={() => {
          reset();
          setSource(null);
        }}
      />
      <CompareView
        originalUrl={source.url}
        resultUrl={cutout?.url ?? null}
        background={background}
        width={source.size.width}
        height={source.size.height}
        overlay={
          working ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              {stageLabel(stage, model)}
            </span>
          ) : null
        }
      />
      {cutout && <p className="text-center text-xs text-muted">Drag across the image to compare before and after.</p>}
    </ToolWorkspace>
  );
}
