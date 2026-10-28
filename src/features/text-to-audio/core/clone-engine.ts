import { hasFp16WebGpu } from "@/lib/webgpu";
import { CLONE_DTYPES, CLONE_MODEL_BYTES, CLONE_MODEL_ID, CLONE_MODEL_REVISION, CLONE_SAMPLE_RATE } from "../constants";
import type { GeneratedAudio, TextChunk, VoiceSample } from "../types";
import type { CloneMessage, CloneRequest } from "./clone-protocol";
import { SpeechEngineError, type SpeechProgress } from "./engine";
import { encodeWav, joinChunks, type SpokenChunk } from "./wav";

export type CloneDevice = "webgpu" | "wasm";

/**
 * The WebGPU path runs the language model in fp16 (q4f16), which GPUs without
 * `shader-f16` (common on older integrated graphics) run slower than plain WASM.
 */
export const detectCloneDevice = async (): Promise<CloneDevice> => ((await hasFp16WebGpu()) ? "webgpu" : "wasm");

/** transformers.js keeps downloaded models in this Cache Storage bucket, keyed by file URL. */
const TRANSFORMERS_CACHE = "transformers-cache";
const languageModelUrl = (device: CloneDevice) =>
  `https://huggingface.co/${CLONE_MODEL_ID}/resolve/${CLONE_MODEL_REVISION}/onnx/language_model_${CLONE_DTYPES[device].language_model}.onnx_data`;

export async function isCloneModelDownloaded(device: CloneDevice): Promise<boolean> {
  try {
    if (typeof caches === "undefined") return false;
    return Boolean(await (await caches.open(TRANSFORMERS_CACHE)).match(languageModelUrl(device)));
  } catch {
    return false;
  }
}

/** Frees the ~1.5 GB the cloning model takes; other models in the same bucket are left alone. */
export async function removeCloneModel() {
  stopCloneEngine();
  const cache = await caches.open(TRANSFORMERS_CACHE);
  for (const request of await cache.keys()) {
    if (request.url.includes(`/${CLONE_MODEL_ID}/`)) await cache.delete(request);
  }
}

let engine: { worker: Worker; device: CloneDevice; ready: Promise<void>; sampleId: string | null } | null = null;

function stopCloneEngine() {
  engine?.worker.terminate();
  engine = null;
}

interface CloneOptions {
  sample: VoiceSample;
  chunks: TextChunk[];
  exaggeration: number;
  device: CloneDevice;
  signal: AbortSignal;
  onProgress: (progress: SpeechProgress) => void;
}

/** Speaks `chunks` in the voice from `sample`. The model loads on first use and stays loaded. */
export async function generateClonedSpeech({ sample, chunks, exaggeration, device, signal, onProgress }: CloneOptions): Promise<GeneratedAudio> {
  if (chunks.length === 0) throw new SpeechEngineError("There’s no text to read");
  const onAbort = () => stopCloneEngine();
  signal.addEventListener("abort", onAbort);

  // Every handler for this run settles this one promise; cancelling rejects it right away.
  let settle!: { resolve: () => void; reject: (error: unknown) => void };
  const finished = new Promise<void>((resolve, reject) => (settle = { resolve, reject }));
  signal.addEventListener("abort", () => settle.reject(signal.reason), { once: true });
  finished.catch(() => {}); // Rejections are surfaced by the awaits below; this just avoids "unhandled" noise.

  try {
    if (engine?.device !== device) {
      stopCloneEngine();
      const worker = new Worker(new URL("./clone.worker.ts", import.meta.url), { type: "module", name: "voice-clone" });
      const ready = new Promise<void>((resolve, reject) => {
        worker.onmessage = ({ data }: MessageEvent<CloneMessage>) => {
          if (data.type === "download") onProgress({ phase: "download", loaded: data.loaded, total: CLONE_MODEL_BYTES[device] });
          else if (data.type === "loaded") resolve();
          else if (data.type === "error") reject(new SpeechEngineError(data.message));
        };
        worker.onerror = () => reject(new SpeechEngineError("The voice engine failed to start"));
      });
      engine = { worker, device, ready, sampleId: null };
      worker.postMessage({ type: "load", device } satisfies CloneRequest);
    }
    const current = engine;
    onProgress({ phase: "download", loaded: 0, total: CLONE_MODEL_BYTES[device] });
    await Promise.race([current.ready, finished]);

    onProgress({ phase: "speak", done: 0, total: chunks.length });
    const spoken: SpokenChunk[] = [];
    current.worker.onmessage = ({ data }: MessageEvent<CloneMessage>) => {
      if (data.type === "chunk") {
        spoken[data.index] = { pcm: data.pcm, pause: chunks[data.index].pause };
        onProgress({ phase: "speak", done: data.index + 1, total: chunks.length });
      } else if (data.type === "done") settle.resolve();
      else if (data.type === "error") settle.reject(new SpeechEngineError(data.message));
    };
    current.worker.onerror = () => settle.reject(new SpeechEngineError("The voice engine stopped unexpectedly"));

    const needsSample = current.sampleId !== sample.id;
    // Copy, so transferring it doesn't empty the sample the page still holds.
    const samples = needsSample ? sample.samples.slice() : undefined;
    const request: CloneRequest = { type: "generate", sampleId: sample.id, samples, texts: chunks.map((c) => c.text), exaggeration };
    current.worker.postMessage(request, samples ? [samples.buffer] : []);
    await finished;
    current.sampleId = sample.id;

    const pcm = joinChunks(spoken, CLONE_SAMPLE_RATE);
    const wav = encodeWav(pcm, CLONE_SAMPLE_RATE);
    return { blob: new Blob([wav as BlobPart], { type: "audio/wav" }), durationSeconds: pcm.length / CLONE_SAMPLE_RATE };
  } catch (error) {
    if (!signal.aborted) stopCloneEngine();
    throw error;
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}
