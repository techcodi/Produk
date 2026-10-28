"use client";

import type { ReactNode } from "react";
import { CheckCircle2, CloudDownload, Square, Trash2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SegmentedControl, type SegmentedOption } from "@/components/ui/segmented-control";
import { SelectField } from "@/components/ui/select-field";
import { formatBytes } from "@/lib/format";
import { CLONE_VOICE_ID, SPEEDS, VOICES } from "../constants";
import type { AudioSettings, Voice } from "../types";

const VOICE_OPTIONS = [
  ...VOICES.map((voice) => ({ value: voice.id, label: `${voice.language} · ${voice.name} (${voice.tone.toLowerCase()})` })),
  { value: CLONE_VOICE_ID, label: "Your own voice (beta, English)" },
];

const SPEED_OPTIONS: SegmentedOption<string>[] = SPEEDS.map((speed) => ({ value: String(speed), label: `${speed}×` }));

interface AudioSettingsPanelProps {
  settings: AudioSettings;
  voice: Voice;
  /** Null while still checking. */
  downloaded: boolean | null;
  onChange: (patch: Partial<AudioSettings>) => void;
  onRemoveVoice: () => void;
  disabled?: boolean;
  /** Quick listen with the device's own voice; hidden when the browser has no speech support. */
  listen?: { playing: boolean; available: boolean; onToggle: () => void };
  /** Replaces the Piper-specific settings when the user's own voice is selected. */
  clonePanel?: ReactNode;
}

export function AudioSettingsPanel({ settings, voice, downloaded, onChange, onRemoveVoice, disabled, listen, clonePanel }: AudioSettingsPanelProps) {
  const voicePicker = (
    <SelectField
      label="Voice"
      value={settings.voiceId}
      options={VOICE_OPTIONS}
      onChange={(voiceId) => onChange({ voiceId })}
      disabled={disabled}
    />
  );
  if (clonePanel) {
    return (
      <div className="space-y-5">
        {voicePicker}
        {clonePanel}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        {voicePicker}
        <div className="mt-1.5 flex min-h-8 items-center justify-between gap-2 text-xs text-muted">
          {downloaded ? (
            <>
              <span className="inline-flex items-center gap-1.5 text-success">
                <CheckCircle2 className="size-3.5" /> On this device · works offline
              </span>
              <Button variant="ghost" size="sm" onClick={onRemoveVoice} disabled={disabled} aria-label={`Remove ${voice.name} from this device`}>
                <Trash2 /> Remove ({formatBytes(voice.sizeBytes)})
              </Button>
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <CloudDownload className="size-3.5" />
              {downloaded === null ? "Checking…" : `One-time download · ${formatBytes(voice.sizeBytes)}`}
            </span>
          )}
        </div>
      </div>

      <SegmentedControl
        label="Speed"
        value={String(settings.speed)}
        options={SPEED_OPTIONS}
        onChange={(speed) => onChange({ speed: Number(speed) })}
        disabled={disabled}
      />

      {listen && (
        <div className="rounded-xl bg-surface-muted p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 text-sm">
              <p className="font-medium">Quick listen</p>
              <p className="text-xs text-muted">
                {listen.available ? "Instant, with your device’s own voice. No download." : `No ${voice.language} voice on this device.`}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={listen.onToggle} disabled={!listen.available && !listen.playing}>
              {listen.playing ? <Square /> : <Volume2 />}
              {listen.playing ? "Stop" : "Listen"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
