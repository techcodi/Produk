/// <reference lib="webworker" />
// Zero-shot voice cloning with Chatterbox (Resemble AI, MIT) through
// transformers.js: the user's sample is encoded into speaker embeddings once,
// then each chunk of text is generated in that voice.

import { AutoProcessor, ChatterboxModel, env, Tensor, type PreTrainedTokenizer, type Processor } from "@huggingface/transformers";
import { CLONE_DTYPES, CLONE_MAX_NEW_TOKENS, CLONE_MODEL_ID, CLONE_MODEL_REVISION, CLONE_ORT_BASE } from "../constants";
import type { CloneMessage, CloneRequest } from "./clone-protocol";

declare const self: DedicatedWorkerGlobalScope;

// Models come from Hugging Face (cached in the browser); the runtime from our own origin, not a CDN.
env.allowLocalModels = false;
const onnx = env.backends.onnx as { wasm?: { wasmPaths?: unknown; numThreads?: number } };
if (onnx.wasm) {
  onnx.wasm.wasmPaths = {
    mjs: `${CLONE_ORT_BASE}ort-wasm-simd-threaded.asyncify.mjs`,
    wasm: `${CLONE_ORT_BASE}ort-wasm-simd-threaded.asyncify.wasm`,
  };
  // Threads need cross-origin isolation (SharedArrayBuffer), which static hosting usually lacks.
  onnx.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
}

const post = (message: CloneMessage, transfer: Transferable[] = []) => self.postMessage(message, transfer);

type Speaker = Awaited<ReturnType<ChatterboxModel["encode_speech"]>>;

let loaded: Promise<{ model: ChatterboxModel; processor: Processor }> | null = null;
let speaker: { id: string; embeddings: Speaker } | null = null;

function load(device: "webgpu" | "wasm") {
  loaded ??= (async () => {
    const received = new Map<string, number>();
    const options = {
      revision: CLONE_MODEL_REVISION,
      progress_callback: (info: { status: string; file?: string; loaded?: number }) => {
        if (info.status !== "progress" || !info.file) return;
        received.set(info.file, info.loaded ?? 0);
        post({ type: "download", loaded: [...received.values()].reduce((sum, n) => sum + n, 0) });
      },
    };
    const processor = await AutoProcessor.from_pretrained(CLONE_MODEL_ID, options);
    const model = (await ChatterboxModel.from_pretrained(CLONE_MODEL_ID, {
      ...options,
      device,
      dtype: { ...CLONE_DTYPES[device] },
    })) as ChatterboxModel;
    return { model, processor };
  })();
  loaded.catch(() => (loaded = null));
  return loaded;
}

async function generate(request: Extract<CloneRequest, { type: "generate" }>) {
  if (!loaded) throw new Error("Model not loaded");
  const { model, processor } = await loaded;

  if (speaker?.id !== request.sampleId) {
    if (!request.samples) throw new Error("Voice sample missing");
    const audio = new Tensor("float32", request.samples, [1, request.samples.length]);
    speaker = { id: request.sampleId, embeddings: await model.encode_speech(audio) };
  }

  for (const [index, text] of request.texts.entries()) {
    const inputs = await (processor as unknown as PreTrainedTokenizer)._call(text);
    const waveform = (await model.generate({
      ...inputs,
      ...speaker.embeddings,
      exaggeration: request.exaggeration,
      max_new_tokens: CLONE_MAX_NEW_TOKENS,
    } as Parameters<ChatterboxModel["generate"]>[0])) as Tensor;
    const pcm = new Float32Array(waveform.data as Float32Array);
    post({ type: "chunk", index, pcm }, [pcm.buffer]);
  }
  post({ type: "done" });
}

self.onmessage = async ({ data }: MessageEvent<CloneRequest>) => {
  try {
    if (data.type === "load") {
      await load(data.device);
      post({ type: "loaded" });
    } else {
      await generate(data);
    }
  } catch (error) {
    console.error(error);
    post({ type: "error", message: error instanceof Error ? error.message : String(error) });
  }
};
