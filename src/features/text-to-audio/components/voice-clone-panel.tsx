"use client";

import { useId, useMemo, useRef } from "react";
import { AlertTriangle, CheckCircle2, CloudDownload, Loader2, Mic, Square, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { formatBytes } from "@/lib/format";
import { CLONE_MODEL_BYTES, CLONE_SAMPLE_RATE, EXPRESSIVENESS, SAMPLE_ACCEPT, SAMPLE_MAX_SECONDS, SAMPLE_MIN_SECONDS, SAMPLE_SCRIPT } from "../constants";
import type { CloneDevice } from "../core/clone-engine";
import { encodeWav } from "../core/wav";
import { useRecorder } from "../hooks/use-recorder";
import type { useVoiceSample } from "../hooks/use-voice-sample";
import type { VoiceSample } from "../types";
import { formatDuration } from "./audio-result";

interface VoiceClonePanelProps {
  voiceSample: ReturnType<typeof useVoiceSample>;
  consent: boolean;
  onConsentChange: (consent: boolean) => void;
  engine: { device: CloneDevice; downloaded: boolean } | null;
  onRemoveEngine: () => void;
  expressiveness: number;
  onExpressivenessChange: (value: number) => void;
  disabled?: boolean;
}

export function VoiceClonePanel({
  voiceSample,
  consent,
  onConsentChange,
  engine,
  onRemoveEngine,
  expressiveness,
  onExpressivenessChange,
  disabled,
}: VoiceClonePanelProps) {
  const consentId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const { sample, processing, error, add, remove } = voiceSample;
  const recorder = useRecorder((audio) => void add(audio, "recording"));
  const recording = recorder.state.status === "recording";
  const busy = disabled || processing || recording;

  return (
    <div className="space-y-5">
      <div className="space-y-2 rounded-xl border border-border p-3 text-xs text-muted">
        <p>
          <span className="font-medium text-foreground">Beta · English only.</span> Works best in Chrome or Edge on a computer.
          Everything, including your voice, stays on this device.
        </p>
        {engine?.device === "wasm" && (
          <p className="flex gap-2 text-danger">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            This browser can’t use your graphics card (WebGPU), so cloning will be very slow: possibly minutes per sentence.
          </p>
        )}
        <div className="flex min-h-8 items-center justify-between gap-2">
          {engine === null ? (
            <span>Checking…</span>
          ) : engine.downloaded ? (
            <>
              <span className="inline-flex items-center gap-1.5 text-success">
                <CheckCircle2 className="size-3.5" /> Voice engine on this device
              </span>
              <Button variant="ghost" size="sm" onClick={onRemoveEngine} disabled={busy}>
                <Trash2 /> Remove ({formatBytes(CLONE_MODEL_BYTES[engine.device])})
              </Button>
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <CloudDownload className="size-3.5" /> One-time download · {formatBytes(CLONE_MODEL_BYTES[engine.device])}
            </span>
          )}
        </div>
      </div>

      {sample ? (
        <SamplePreview sample={sample} onRemove={() => void remove()} onReplace={() => void remove()} disabled={busy} />
      ) : (
        <div className="space-y-3">
          <div className="flex items-start gap-2.5">
            <input
              id={consentId}
              type="checkbox"
              checked={consent}
              onChange={(event) => onConsentChange(event.target.checked)}
              disabled={busy}
              className="mt-0.5 size-4 shrink-0 accent-brand"
            />
            <label htmlFor={consentId} className="text-sm">
              This is <strong>my own voice</strong>, or I have the speaker’s permission to clone it. I won’t use it to
              impersonate, deceive or harass anyone.
            </label>
          </div>

          {recording ? (
            <div className="space-y-3 rounded-xl bg-brand-soft p-3" aria-live="polite">
              <p className="text-xs font-medium text-muted">Read this aloud in your normal voice:</p>
              <p className="text-sm leading-relaxed">{SAMPLE_SCRIPT}</p>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-sm font-medium tabular-nums">
                  <span className="size-2.5 animate-pulse rounded-full bg-danger" />
                  {formatDuration(recorder.state.status === "recording" ? recorder.state.seconds : 0)} / {formatDuration(SAMPLE_MAX_SECONDS)}
                </span>
                <Button size="sm" onClick={recorder.stop}>
                  <Square /> Stop
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => void recorder.start()} disabled={!consent || busy}>
                <Mic /> Record
              </Button>
              <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={!consent || busy}>
                <Upload /> Upload
              </Button>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept={SAMPLE_ACCEPT}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void add(file, "upload");
              event.target.value = "";
            }}
          />

          {processing && (
            <p className="inline-flex items-center gap-2 text-sm text-muted">
              <Loader2 className="size-4 animate-spin text-brand" /> Preparing your sample…
            </p>
          )}
          {(error || recorder.state.status === "error") && (
            <p role="alert" className="text-sm text-danger">
              {error ?? (recorder.state.status === "error" ? recorder.state.message : null)}
            </p>
          )}
          <p className="text-xs text-muted">
            {SAMPLE_MIN_SECONDS}–{SAMPLE_MAX_SECONDS} seconds of one person speaking clearly, with no music or background noise.
          </p>
        </div>
      )}

      <SegmentedControl
        label="Expressiveness"
        value={String(expressiveness)}
        options={EXPRESSIVENESS}
        onChange={(value) => onExpressivenessChange(Number(value))}
        disabled={disabled}
      />
    </div>
  );
}

function SamplePreview({
  sample,
  onRemove,
  onReplace,
  disabled,
}: {
  sample: VoiceSample;
  onRemove: () => void;
  onReplace: () => void;
  disabled?: boolean;
}) {
  // A data URL (≤ ~1 MB for 15 s) needs no cleanup, unlike a blob URL revoked in an
  // effect, which StrictMode's double-run would revoke while still in use.
  const url = useMemo(() => {
    const wav = encodeWav(sample.samples, CLONE_SAMPLE_RATE);
    let binary = "";
    for (let i = 0; i < wav.length; i += 0x8000) binary += String.fromCharCode(...wav.subarray(i, i + 0x8000));
    return `data:audio/wav;base64,${btoa(binary)}`;
  }, [sample]);

  return (
    <div className="space-y-2 rounded-xl bg-surface-muted p-3">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium">Your voice sample</span>
        <span className="text-xs text-muted tabular-nums">
          {formatDuration(sample.durationSeconds)} · {sample.source === "recording" ? "recorded" : "uploaded"}
        </span>
      </div>
      <audio controls src={url} className="h-9 w-full" preload="metadata" />
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={onReplace} disabled={disabled}>
          <Mic /> Replace
        </Button>
        <Button variant="danger" size="sm" onClick={onRemove} disabled={disabled}>
          <Trash2 /> Delete my voice
        </Button>
      </div>
    </div>
  );
}
