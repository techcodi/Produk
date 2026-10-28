/// <reference lib="webworker" />
// Runs Piper text-to-speech off the main thread: espeak-ng turns text into
// phoneme IDs, then the voice's ONNX model turns those into audio samples.

import * as ort from "onnxruntime-web/wasm";
import { PHONEMIZER_BASE } from "../constants";
import type { EngineMessage, SynthesizeRequest } from "./engine-protocol";
import type { VoiceConfig } from "../types";

declare const self: DedicatedWorkerGlobalScope;

// The .wasm is served from public/ort (scripts/copy-ml-assets.mjs).
ort.env.wasm.wasmPaths = `/ort/${ort.env.versions.web}/`;
// Threads need cross-origin isolation (SharedArrayBuffer), which static hosting usually lacks.
ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;

interface PhonemizerModule {
  callMain(args: string[]): void;
}
type CreatePhonemizer = (options: {
  print: (line: string) => void;
  printErr: (line: string) => void;
  locateFile: (file: string) => string;
}) => Promise<PhonemizerModule>;

let createPhonemizer: Promise<CreatePhonemizer> | null = null;

/**
 * The phonemizer is an Emscripten CommonJS build whose Node branch requires
 * fs/path/crypto, so it can't go through the bundler. It's served as a static
 * file and evaluated here with stand-in `module`/`exports` objects; in a worker
 * its Node branch never runs.
 */
function loadPhonemizerFactory(): Promise<CreatePhonemizer> {
  createPhonemizer ??= fetch(`${PHONEMIZER_BASE}piper_phonemize.js`)
    .then((response) => {
      if (!response.ok) throw new Error(`Phonemizer script: HTTP ${response.status}`);
      return response.text();
    })
    .then((source) => {
      const cjs = { exports: {} as unknown };
      new Function("module", "exports", source)(cjs, cjs.exports);
      return cjs.exports as CreatePhonemizer;
    });
  return createPhonemizer;
}

/** One phonemizer instance, reused for every sentence; its output arrives through `print`. */
let phonemizer: Promise<{ instance: PhonemizerModule; lines: string[] }> | null = null;

async function getPhonemizer() {
  phonemizer ??= loadPhonemizerFactory().then(async (create) => {
    const lines: string[] = [];
    const instance = await create({
      print: (line) => lines.push(line),
      printErr: (line) => console.warn("[phonemizer]", line),
      locateFile: (file) => `${PHONEMIZER_BASE}${file}`,
    });
    return { instance, lines };
  });
  return phonemizer;
}

async function phonemize(text: string, espeakVoice: string): Promise<number[]> {
  const { instance, lines } = await getPhonemizer();
  lines.length = 0;
  instance.callMain(["-l", espeakVoice, "--input", JSON.stringify([{ text }]), "--espeak_data", "/espeak-ng-data"]);
  const ids = lines.flatMap((line) => (JSON.parse(line) as { phoneme_ids?: number[] }).phoneme_ids ?? []);
  if (ids.length === 0) throw new Error("The phonemizer returned nothing");
  return ids;
}

let voice: { id: string; session: ort.InferenceSession; config: VoiceConfig } | null = null;

async function prepareVoice(request: SynthesizeRequest) {
  if (voice?.id === request.voiceId) return voice;
  if (!request.model) throw new Error("Voice model missing");
  await voice?.session.release();
  voice = null;
  const session = await ort.InferenceSession.create(request.model, {
    executionProviders: ["wasm"],
    graphOptimizationLevel: "all",
  });
  voice = { id: request.voiceId, session, config: request.config };
  return voice;
}

const int64 = (values: number[]) => BigInt64Array.from(values, (v) => BigInt(v));

async function synthesize(request: SynthesizeRequest) {
  const { session, config } = await prepareVoice(request);
  const { noise_scale, length_scale, noise_w } = config.inference;
  // Piper's length scale is the inverse of speed: >1 is slower.
  const scales = new Float32Array([noise_scale, length_scale / request.speed, noise_w]);

  for (const [index, chunk] of request.chunks.entries()) {
    const ids = await phonemize(chunk.text, config.espeak.voice);
    const feeds: Record<string, ort.Tensor> = {
      input: new ort.Tensor("int64", int64(ids), [1, ids.length]),
      input_lengths: new ort.Tensor("int64", int64([ids.length]), [1]),
      scales: new ort.Tensor("float32", scales, [3]),
    };
    if (config.num_speakers > 1) feeds.sid = new ort.Tensor("int64", int64([0]), [1]);

    const { output } = await session.run(feeds);
    const pcm = new Float32Array(output.data as Float32Array);
    output.dispose();
    post({ type: "chunk", index, pcm }, [pcm.buffer]);
  }
  post({ type: "done", sampleRate: config.audio.sample_rate });
}

const post = (message: EngineMessage, transfer: Transferable[] = []) => self.postMessage(message, transfer);

self.onmessage = (event: MessageEvent<SynthesizeRequest>) => {
  synthesize(event.data).catch((error: unknown) => {
    console.error(error);
    post({ type: "error", message: error instanceof Error ? error.message : String(error) });
  });
};

// Warm up the phonemizer (18 MB of language data) while the voice downloads.
getPhonemizer().then(
  () => post({ type: "ready" }),
  (error: unknown) => post({ type: "error", message: error instanceof Error ? error.message : String(error) }),
);
