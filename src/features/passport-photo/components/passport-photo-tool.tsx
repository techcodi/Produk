"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, CheckCircle2, Download, FileDown, ImagePlus, Loader2, RotateCcw, TriangleAlert, ZoomIn } from "lucide-react";
import { DropZone } from "@/components/files/drop-zone";
import { RejectedNotice } from "@/components/files/rejected-notice";
import { SelectedFileBar } from "@/components/files/selected-file-bar";
import { TaskPanel } from "@/components/files/task-panel";
import { ToolWorkspace } from "@/components/files/tool-workspace";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { usePasteFiles } from "@/hooks/use-paste-files";
import { isOutOfMemory, useTask } from "@/hooks/use-task";
import { ModelDownloadError } from "@/lib/background-removal/model-store";
import { MODELS, type RemovalStage } from "@/lib/background-removal/models";
import { BackgroundRemovalError, removeBackground, toDecodable } from "@/lib/background-removal/remove-background";
import { cn } from "@/lib/cn";
import { triggerDownload } from "@/lib/download";
import { partitionFiles, type RejectedFile } from "@/lib/files";
import { formatBytes } from "@/lib/format";
import { decodeImage, IMAGE_ACCEPT_ATTRIBUTE, isSupportedImage, readImageSize, type DecodedImage, type Size } from "@/lib/images";
import { BACKGROUNDS, CUSTOM_PRESET_ID, MAX_FILE_SIZE_BYTES, MAX_ZOOM, MIN_ZOOM, PRESETS, SHEET_GAP_MM, SHEET_MARGIN_MM, SHEETS, type SheetId } from "../constants";
import { customSpec, estimateHead, headHeightMm, initialFraming, layoutSheet } from "../core/framing";
import { renderPhoto, renderSheet, sheetPdf, toJpeg } from "../core/render";
import type { Framing, HeadEstimate, PhotoBackground, PhotoSpec } from "../types";
import { PhotoEditor } from "./photo-editor";

const DROP_ZONE_TEXT = {
  accept: IMAGE_ACCEPT_ATTRIBUTE,
  icon: ImagePlus,
  title: "Drag & drop a photo of yourself",
  dropTitle: "Drop to make your passport photo",
  hint: "Face the camera, even light, neutral expression · JPG, PNG, HEIC",
  buttonLabel: "Choose photo",
  multiple: false,
};

interface Source {
  file: File;
  url: string;
  size: Size;
  blob: Blob;
}

/** What the editor shows and prints: the cut-out (or the original photo, if removal was skipped). */
interface Subject {
  url: string;
  size: Size;
  decoded: DecodedImage;
  /** The original photo, decoded, for the "keep original background" option. */
  original: DecodedImage | null;
  originalUrl: string;
  head: HeadEstimate | null;
  backgroundRemoved: boolean;
}

function describeError(error: unknown): string {
  if (error instanceof ModelDownloadError || error instanceof BackgroundRemovalError) return error.message;
  if (isOutOfMemory(error)) return "Your device ran out of memory. Try a smaller photo.";
  return "Something went wrong while preparing your photo. Please try again.";
}

function stageLabel(stage: RemovalStage | null) {
  if (stage?.stage === "download") return `Downloading the AI model… ${formatBytes(stage.loaded)} of ${formatBytes(stage.total)}`;
  return "Removing the background…";
}

const releaseSubject = (subject: Subject) => {
  subject.decoded.release();
  subject.original?.release();
  if (subject.url !== subject.originalUrl) URL.revokeObjectURL(subject.url);
};

const fileStamp = () => new Date().toISOString().slice(0, 10);

export function PassportPhotoTool() {
  const [source, setSource] = useState<Source | null>(null);
  const [rejected, setRejected] = useState<RejectedFile[]>([]);
  const [stage, setStage] = useState<RemovalStage | null>(null);
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [custom, setCustom] = useState({ width: "35", height: "45" });
  const [background, setBackground] = useState<PhotoBackground>("#ffffff");
  /** The user's own adjustment, valid only for the photo and size it was made for. */
  const [adjusted, setAdjusted] = useState<{ key: string; framing: Framing } | null>(null);
  const [showGuides, setShowGuides] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const sourceUrl = useRef<string | null>(null);

  const task = useTask<Subject>({ release: releaseSubject, describeError });
  const { start, reset } = task;
  const subject = task.state.status === "success" ? task.state.result : null;
  const working = task.state.status === "processing";

  const spec: PhotoSpec = useMemo(() => {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (preset) return preset;
    const width = Math.min(Math.max(Number(custom.width) || 35, 15), 100);
    const height = Math.min(Math.max(Number(custom.height) || 45, 15), 100);
    return customSpec(width, height);
  }, [presetId, custom]);

  useEffect(
    () => () => {
      if (sourceUrl.current) URL.revokeObjectURL(sourceUrl.current);
    },
    [],
  );

  // A new photo or a new size starts again from the automatic framing.
  const framingKey = subject ? `${subject.url}|${spec.widthMm}x${spec.heightMm}` : "";
  const initial = useMemo(() => (subject ? initialFraming(subject.head, subject.size, spec) : null), [subject, spec]);
  const framing = adjusted?.key === framingKey ? adjusted.framing : initial;
  const setFraming = (next: Framing) => setAdjusted({ key: framingKey, framing: next });

  const prepare = useCallback(
    async (input: Source, removeBg: boolean) => {
      setStage(null);
      await start(1, async ({ signal, progress }) => {
        const original = await decodeImage(input.blob);
        if (!removeBg) {
          progress(1, 1);
          return { url: input.url, originalUrl: input.url, size: input.size, decoded: original, original: null, head: null, backgroundRemoved: false };
        }
        try {
          const result = await removeBackground(input.blob, "fast", { signal, onStage: setStage });
          const decoded = await decodeImage(result.blob);
          const head = estimateHead(result.mask.alpha, result.mask.size, result.width / result.height);
          progress(1, 1);
          return {
            url: URL.createObjectURL(result.blob),
            originalUrl: input.url,
            size: { width: result.width, height: result.height },
            decoded,
            original,
            head,
            backgroundRemoved: true,
          };
        } catch (error) {
          original.release();
          throw error;
        }
      });
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
        noun: "photos",
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
        const next = { file, url, size, blob };
        setSource(next);
        void prepare(next, true);
      } catch {
        setRejected([{ file, reason: "This photo couldn’t be read" }]);
      }
    },
    [prepare, reset],
  );

  usePasteFiles(handleFiles);

  const effectiveBackground: PhotoBackground = subject?.backgroundRemoved ? background : "original";

  /** Renders the framed photo; the cut-out goes on a colour, the original keeps its own background. */
  const renderCurrent = () => {
    if (!subject || !framing) throw new Error("Nothing to render");
    const useOriginal = effectiveBackground === "original" && subject.original;
    return renderPhoto(useOriginal ? subject.original!.drawable : subject.decoded.drawable, subject.size, spec, framing, effectiveBackground);
  };

  const download = async (kind: "photo" | SheetId) => {
    setBusy(kind);
    try {
      const photo = renderCurrent();
      const label = PRESETS.find((p) => p.id === presetId)?.id ?? `${spec.widthMm}x${spec.heightMm}mm`;
      const base = `passport-photo-${label}-${fileStamp()}`;
      let blob: Blob;
      let name: string;
      if (kind === "photo") {
        blob = await toJpeg(photo);
        name = `${base}.jpg`;
      } else {
        const layout = layoutSheet(SHEETS[kind], spec, SHEET_GAP_MM, SHEET_MARGIN_MM);
        if (kind === "a4") {
          const jpeg = new Uint8Array(await (await toJpeg(photo)).arrayBuffer());
          blob = new Blob([(await sheetPdf(jpeg, layout, spec)) as BlobPart], { type: "application/pdf" });
          name = `${base}-a4-sheet.pdf`;
        } else {
          blob = await toJpeg(renderSheet(photo, layout, spec));
          name = `${base}-4x6-sheet.jpg`;
        }
      }
      const url = URL.createObjectURL(blob);
      triggerDownload(url, name);
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } finally {
      setBusy(null);
    }
  };

  const sheetCounts = useMemo(
    () => ({
      "4x6": layoutSheet(SHEETS["4x6"], spec, SHEET_GAP_MM, SHEET_MARGIN_MM).positions.length,
      a4: layoutSheet(SHEETS.a4, spec, SHEET_GAP_MM, SHEET_MARGIN_MM).positions.length,
    }),
    [spec],
  );

  if (!source) {
    return (
      <div className="space-y-4">
        <RejectedNotice rejected={rejected} onDismiss={() => setRejected([])} />
        <DropZone {...DROP_ZONE_TEXT} onFiles={handleFiles} />
        <div className="flex flex-col items-center gap-2 text-center">
          <Button variant="secondary" onClick={() => cameraInput.current?.click()}>
            <Camera /> Take a photo now
          </Button>
          <input
            ref={cameraInput}
            type="file"
            accept="image/*"
            capture="user"
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              event.target.value = "";
              if (files.length > 0) void handleFiles(files);
            }}
          />
          <p className="max-w-md text-xs text-muted">
            Stand against a plain wall, look straight at the camera, and keep your shoulders in the shot. Your photo stays on your device.
          </p>
        </div>
      </div>
    );
  }

  const zoom = framing && initial ? framing.mmPerPx / initial.mmPerPx : 1;
  const headMm = subject?.head && framing ? headHeightMm(subject.head, subject.size.height, framing) : null;
  const headOk = headMm !== null && headMm >= spec.headMm[0] && headMm <= spec.headMm[1];

  return (
    <ToolWorkspace
      mainLabel="Photo"
      settingsTitle="Photo settings"
      settings={
        <div className="space-y-5">
          <div>
            <label htmlFor="passport-size" className="mb-2 block text-sm font-medium">
              Document size
            </label>
            <select
              id="passport-size"
              value={presetId}
              onChange={(event) => setPresetId(event.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-brand"
            >
              {PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label} — {preset.usage}
                </option>
              ))}
              <option value={CUSTOM_PRESET_ID}>Custom size…</option>
            </select>
            {presetId === CUSTOM_PRESET_ID && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <TextField label="Width" value={custom.width} onChange={(width) => setCustom((c) => ({ ...c, width: width.replace(/[^\d.]/g, "") }))} suffix="mm" inputMode="decimal" />
                <TextField label="Height" value={custom.height} onChange={(height) => setCustom((c) => ({ ...c, height: height.replace(/[^\d.]/g, "") }))} suffix="mm" inputMode="decimal" />
              </div>
            )}
            <p className="mt-1.5 text-xs text-muted">Rules change — always check the latest requirements for your document.</p>
          </div>

          <fieldset disabled={!subject?.backgroundRemoved} className="min-w-0 disabled:opacity-50">
            <legend className="mb-2 text-sm font-medium">Background</legend>
            <div className="flex flex-wrap gap-2">
              {BACKGROUNDS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={effectiveBackground === value}
                  onClick={() => setBackground(value)}
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-medium focus-visible:outline-2 focus-visible:outline-brand",
                    effectiveBackground === value ? "border-brand ring-2 ring-brand" : "border-border",
                  )}
                >
                  {value !== "original" && <span className="size-4 rounded border border-border" style={{ background: value }} />}
                  {label}
                </button>
              ))}
            </div>
            {subject && !subject.backgroundRemoved && <p className="mt-1.5 text-xs text-muted">The background wasn’t removed, so the original is kept.</p>}
          </fieldset>

          {subject && framing && (
            <div className="space-y-3">
              <label className="block text-sm font-medium" htmlFor="passport-zoom">
                <span className="inline-flex items-center gap-1.5">
                  <ZoomIn className="size-4" /> Zoom
                </span>
              </label>
              <input
                id="passport-zoom"
                type="range"
                min={Math.log(MIN_ZOOM)}
                max={Math.log(MAX_ZOOM)}
                step={0.01}
                value={Math.log(zoom)}
                onChange={(event) => initial && setFraming({ ...framing, mmPerPx: initial.mmPerPx * Math.exp(Number(event.target.value)) })}
                className="w-full accent-brand"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => initial && setFraming(initial)}>
                  <RotateCcw /> Reset position
                </Button>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={showGuides} onChange={(event) => setShowGuides(event.target.checked)} className="size-4 accent-brand" />
                  Show guides
                </label>
              </div>
            </div>
          )}
        </div>
      }
      action={
        subject && framing ? (
          <div className="space-y-2">
            <Button size="lg" className="w-full" onClick={() => download("photo")} disabled={busy !== null}>
              {busy === "photo" ? <Loader2 className="animate-spin" /> : <Download />} Download photo (JPG)
            </Button>
            <Button variant="secondary" className="w-full" onClick={() => download("4x6")} disabled={busy !== null || sheetCounts["4x6"] === 0}>
              {busy === "4x6" ? <Loader2 className="animate-spin" /> : <Download />} 4×6 print sheet · {sheetCounts["4x6"]} photos
            </Button>
            <Button variant="secondary" className="w-full" onClick={() => download("a4")} disabled={busy !== null || sheetCounts.a4 === 0}>
              {busy === "a4" ? <Loader2 className="animate-spin" /> : <FileDown />} A4 sheet (PDF) · {sheetCounts.a4} photos
            </Button>
            <p className="text-center text-xs text-muted max-lg:hidden">Print at 100% / “actual size” so each photo measures exactly {spec.widthMm}×{spec.heightMm} mm.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <TaskPanel
              state={task.state}
              progressLabel={() => stageLabel(stage)}
              describeResult={() => ({ title: "Ready" })}
              actionIcon={<RotateCcw />}
              actionLabel="Try again"
              onStart={() => void prepare(source, true)}
              onCancel={reset}
            />
            {task.state.status === "error" && (
              <Button variant="ghost" className="w-full" onClick={() => void prepare(source, false)}>
                Continue without removing the background
              </Button>
            )}
          </div>
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

      {subject && framing ? (
        <>
          <PhotoEditor
            imageUrl={effectiveBackground === "original" ? subject.originalUrl : subject.url}
            imageSize={subject.size}
            spec={spec}
            framing={framing}
            background={effectiveBackground}
            showGuides={showGuides}
            onChange={setFraming}
          />
          <div className="space-y-1 text-center text-sm">
            {headMm !== null ? (
              <p className={cn("inline-flex items-center gap-1.5 font-medium", headOk ? "text-success" : "text-danger")}>
                {headOk ? <CheckCircle2 className="size-4" /> : <TriangleAlert className="size-4" />}
                Head ≈ {headMm.toFixed(1)} mm · needs {spec.headMm[0]}–{spec.headMm[1]} mm
              </p>
            ) : (
              <p className="text-muted">Line up the top of the head and the chin with the guides.</p>
            )}
            <p className="text-xs text-muted">Drag to move · scroll, pinch or use the slider to zoom. The head size is an estimate — check it against the guides.</p>
          </div>
        </>
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-border bg-surface-muted p-6 text-center text-sm text-muted">
          {working ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin text-brand" /> {stageLabel(stage)}
            </span>
          ) : (
            "The background couldn’t be removed from this photo."
          )}
        </div>
      )}
      {subject?.backgroundRemoved && (
        <p className="text-center text-xs text-muted">Background removed on your device with a {formatBytes(MODELS.fast.bytes)} AI model.</p>
      )}
    </ToolWorkspace>
  );
}
