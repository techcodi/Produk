import type { GeneratedAudio, TextChunk, Voice } from "../types";
import type { EngineMessage, SynthesizeRequest } from "./engine-protocol";
import { loadVoice } from "./voice-cache";
import { encodeWav, joinChunks, type SpokenChunk } from "./wav";

export type SpeechProgress =
  | { phase: "download"; loaded: number; total: number }
  | { phase: "speak"; done: number; total: number };

export class SpeechEngineError extends Error {
  constructor(message = "Audio generation failed") {
    super(message);
    this.name = "SpeechEngineError";
  }
}

/** One worker, kept between runs so a loaded voice doesn't have to be set up again. */
let engine: { worker: Worker; voiceId: string | null } | null = null;

function getEngine() {
  engine ??= {
    worker: new Worker(new URL("./tts.worker.ts", import.meta.url), { type: "module", name: "text-to-speech" }),
    voiceId: null,
  };
  return engine;
}

/** Cancelling mid-sentence means stopping the worker outright; the next run starts a fresh one. */
function stopEngine() {
  engine?.worker.terminate();
  engine = null;
}

interface GenerateOptions {
  voice: Voice;
  chunks: TextChunk[];
  speed: number;
  signal: AbortSignal;
  onProgress: (progress: SpeechProgress) => void;
}

export async function generateSpeech({ voice, chunks, speed, signal, onProgress }: GenerateOptions): Promise<GeneratedAudio> {
  if (chunks.length === 0) throw new SpeechEngineError("There’s no text to read");
  const current = getEngine();
  const onAbort = () => stopEngine();
  signal.addEventListener("abort", onAbort);

  try {
    const needsModel = current.voiceId !== voice.id;
    const { model, config } = await loadVoice(
      voice,
      signal,
      (loaded, total) => onProgress({ phase: "download", loaded, total }),
      needsModel,
    );
    signal.throwIfAborted();
    onProgress({ phase: "speak", done: 0, total: chunks.length });

    const spoken: SpokenChunk[] = [];
    const sampleRate = await new Promise<number>((resolve, reject) => {
      current.worker.onmessage = ({ data }: MessageEvent<EngineMessage>) => {
        if (data.type === "chunk") {
          spoken[data.index] = { pcm: data.pcm, pause: chunks[data.index].pause };
          onProgress({ phase: "speak", done: data.index + 1, total: chunks.length });
        } else if (data.type === "done") {
          resolve(data.sampleRate);
        } else if (data.type === "error") {
          reject(new SpeechEngineError(data.message));
        }
      };
      current.worker.onerror = () => reject(new SpeechEngineError("The speech engine failed to start"));
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });

      const request: SynthesizeRequest = {
        type: "synthesize",
        voiceId: voice.id,
        model: model ?? undefined,
        config,
        chunks,
        speed,
      };
      current.worker.postMessage(request, model ? [model.buffer] : []);
    });
    current.voiceId = voice.id;

    const samples = joinChunks(spoken, sampleRate);
    const wav = encodeWav(samples, sampleRate);
    return { blob: new Blob([wav as BlobPart], { type: "audio/wav" }), durationSeconds: samples.length / sampleRate };
  } catch (error) {
    // A failed worker may be in a bad state; start clean next time.
    if (!signal.aborted) stopEngine();
    throw error;
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}
