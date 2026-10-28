"use client";

import { useEffect, useRef, useState } from "react";
import { AudioLines, FileText, Trash2 } from "lucide-react";
import { TaskPanel } from "@/components/files/task-panel";
import { ToolWorkspace } from "@/components/files/tool-workspace";
import { Button } from "@/components/ui/button";
import { isOutOfMemory, useTask } from "@/hooks/use-task";
import { cn } from "@/lib/cn";
import { createOutputFile, releaseOutputFile, type OutputFile } from "@/lib/download";
import { sanitizeFileName, stripExtension } from "@/lib/files";
import { CLONE_CHUNK_LENGTH, CLONE_MAX_CHARACTERS, CLONE_VOICE_ID, DEFAULT_SETTINGS, getVoice, MAX_CHARACTERS } from "../constants";
import { generateClonedSpeech } from "../core/clone-engine";
import { pickDeviceVoice, speakWithDevice } from "../core/device-speech";
import { generateSpeech, SpeechEngineError, type SpeechProgress } from "../core/engine";
import { readTextFile, TEXT_FILE_ACCEPT, TextImportError } from "../core/import-text";
import { estimateSeconds, splitIntoChunks } from "../core/text";
import { VoiceDownloadError } from "../core/voice-cache";
import { useCloneStatus } from "../hooks/use-clone-status";
import { useDeviceVoices } from "../hooks/use-device-voices";
import { useVoiceSample } from "../hooks/use-voice-sample";
import { useVoiceStatus } from "../hooks/use-voice-status";
import type { AudioSettings } from "../types";
import { AudioResult, formatDuration } from "./audio-result";
import { AudioSettingsPanel } from "./audio-settings-panel";
import { VoiceClonePanel } from "./voice-clone-panel";
import { VoiceCredits } from "./voice-credits";

interface AudioOutput {
  file: OutputFile;
  durationSeconds: number;
  /** Made with the user's cloned voice; labelled as AI-generated. */
  cloned: boolean;
}

function describeError(error: unknown): string {
  if (error instanceof VoiceDownloadError) return error.message;
  if (isOutOfMemory(error)) return "Your device ran out of memory. Try a shorter text.";
  if (error instanceof SpeechEngineError) return "Something went wrong while creating the audio. Please try again.";
  return "Something went wrong. Please try again.";
}

export function TextToAudioTool() {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [settings, setSettings] = useState<AudioSettings>(DEFAULT_SETTINGS);
  const [importError, setImportError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"download" | "speak">("speak");
  const [playing, setPlaying] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [consent, setConsent] = useState(false);
  const isClone = settings.voiceId === CLONE_VOICE_ID;
  const voiceSample = useVoiceSample();
  const cloneStatus = useCloneStatus(isClone);

  const voice = getVoice(settings.voiceId);
  const voiceStatus = useVoiceStatus(voice);
  const deviceVoices = useDeviceVoices();
  const deviceVoice = pickDeviceVoice(deviceVoices, voice.lang);

  const task = useTask<AudioOutput>({ release: (result) => releaseOutputFile(result.file), describeError });
  const { reset: invalidate, start } = task;
  const busy = task.state.status === "processing";
  const result = task.state.status === "success" ? task.state.result : null;

  const stopListening = () => {
    stopRef.current?.();
    stopRef.current = null;
    setPlaying(false);
  };
  useEffect(() => () => stopRef.current?.(), []);

  const maxCharacters = isClone ? CLONE_MAX_CHARACTERS : MAX_CHARACTERS;
  const chunks = splitIntoChunks(text, isClone ? CLONE_CHUNK_LENGTH : undefined);
  const tooLong = text.length > maxCharacters;

  const edit = (next: string) => {
    invalidate();
    stopListening();
    setText(next);
  };

  const openFile = async (file: File | undefined) => {
    if (!file) return;
    setImportError(null);
    try {
      edit(await readTextFile(file));
      setFileName(stripExtension(file.name));
    } catch (error) {
      setImportError(error instanceof TextImportError ? error.message : "That file couldn’t be read.");
    }
  };

  const toggleListen = () => {
    if (playing) return stopListening();
    stopRef.current = speakWithDevice(chunks, {
      voice: deviceVoice,
      lang: voice.lang,
      rate: settings.speed,
      onEnd: () => setPlaying(false),
    });
    setPlaying(true);
  };

  const handleCreate = async () => {
    stopListening();
    const chosen = voice;
    const sample = voiceSample.sample;
    const device = cloneStatus.status?.device ?? "wasm";
    const base = fileName ?? chunks[0]?.text.slice(0, 40) ?? "";
    // Cloned audio says so in its name, so it stays identifiable once shared.
    const name = sanitizeFileName(isClone ? `${base} (AI voice)` : base, "wav", "speech");
    await start(1, async ({ signal, progress }) => {
      const onProgress = (update: SpeechProgress) => {
        setPhase(update.phase);
        if (update.phase === "download") progress(update.loaded, update.total);
        else progress(update.done, update.total);
      };
      const audio =
        isClone && sample
          ? await generateClonedSpeech({ sample, chunks, exaggeration: settings.expressiveness, device, signal, onProgress })
          : await generateSpeech({ voice: chosen, chunks, speed: settings.speed, signal, onProgress });
      return { file: createOutputFile(audio.blob, name), durationSeconds: audio.durationSeconds, cloned: isClone };
    });
    // A first run downloads the model; reflect that in the settings.
    if (isClone) cloneStatus.refresh();
    else voiceStatus.refresh();
  };

  const estimate = estimateSeconds(text, isClone ? 1 : settings.speed);

  return (
    <div className="space-y-10">
      <ToolWorkspace
        mainLabel="Text"
        settingsTitle="Audio settings"
        settings={
          <AudioSettingsPanel
            settings={settings}
            voice={voice}
            downloaded={voiceStatus.downloaded}
            disabled={busy}
            onChange={(patch) => {
              invalidate();
              stopListening();
              setSettings((prev) => ({ ...prev, ...patch }));
            }}
            onRemoveVoice={() => void voiceStatus.remove()}
            clonePanel={
              isClone ? (
                <VoiceClonePanel
                  voiceSample={voiceSample}
                  consent={consent}
                  onConsentChange={setConsent}
                  engine={cloneStatus.status}
                  onRemoveEngine={() => void cloneStatus.remove()}
                  expressiveness={settings.expressiveness}
                  onExpressivenessChange={(expressiveness) => {
                    invalidate();
                    setSettings((prev) => ({ ...prev, expressiveness }));
                  }}
                  disabled={busy}
                />
              ) : undefined
            }
            listen={
              deviceVoices.length > 0
                ? { playing, available: Boolean(deviceVoice) && chunks.length > 0 && !tooLong, onToggle: toggleListen }
                : undefined
            }
          />
        }
        action={
          <TaskPanel
            state={task.state}
            progressLabel={(completed, total) =>
              phase === "download"
                ? `Downloading ${isClone ? "the voice engine" : `${voice.name}’s voice`}… ${Math.round((completed / total) * 100)}%`
                : completed === 0 && isClone
                  ? "Learning your voice…"
                  : `Reading sentence ${Math.min(completed + 1, total)} of ${total}…`
            }
            describeResult={(done) => ({
              title: "Your audio is ready",
              // No download button here: the player card below offers download and share once it has been heard.
              detail: done.cloned
                ? `${formatDuration(done.durationSeconds)} · your voice · AI-generated`
                : `${formatDuration(done.durationSeconds)} · ${voice.name} · ${settings.speed}×`,
            })}
            actionIcon={<AudioLines />}
            actionLabel="Create audio file"
            disabled={chunks.length === 0 || tooLong || (isClone && !voiceSample.sample)}
            onStart={handleCreate}
            onCancel={invalidate}
          />
        }
      >
        <div className="rounded-2xl border border-border bg-surface focus-within:outline-2 focus-within:outline-brand">
          <label htmlFor="tts-text" className="sr-only">
            Text to read aloud
          </label>
          <textarea
            id="tts-text"
            value={text}
            onChange={(event) => edit(event.target.value)}
            placeholder="Type or paste your text here, or open a .txt or Word file."
            rows={14}
            disabled={busy}
            className="block min-h-72 w-full resize-y rounded-t-2xl bg-transparent p-4 text-base leading-relaxed outline-none disabled:opacity-60"
          />
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2">
            <p className={cn("text-xs tabular-nums", tooLong ? "font-medium text-danger" : "text-muted")}>
              {text.length.toLocaleString("en-US")} / {maxCharacters.toLocaleString("en-US")} characters
              {chunks.length > 0 && !tooLong && <> · about {formatDuration(estimate)} of audio</>}
              {tooLong && " · please shorten your text"}
            </p>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} disabled={busy}>
                <FileText /> Open file
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  edit("");
                  setFileName(null);
                }}
                disabled={busy || !text}
              >
                <Trash2 /> Clear
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={TEXT_FILE_ACCEPT}
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(event) => {
                void openFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </div>
        </div>

        {importError && (
          <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">
            {importError}
          </p>
        )}

        {result && <AudioResult file={result.file} durationSeconds={result.durationSeconds} aiVoice={result.cloned} />}

        <p className="text-xs text-muted">
          Your text never leaves your device. Voices download once from Hugging Face and are stored in your browser.
        </p>
      </ToolWorkspace>

      <VoiceCredits />
    </div>
  );
}
