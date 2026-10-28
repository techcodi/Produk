import type { ModelId } from "./models";
import type { InferenceRequest, InferenceResponse } from "./inference.worker";

let worker: Worker | null = null;
let nextId = 1;

function getWorker() {
  worker ??= new Worker(new URL("./inference.worker.ts", import.meta.url), { type: "module", name: "background-removal" });
  return worker;
}

/** Kills the worker, e.g. to stop an inference that was cancelled. The next call starts a fresh one. */
function resetWorker() {
  worker?.terminate();
  worker = null;
}

export class InferenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InferenceError";
  }
}

interface PredictOptions {
  signal?: AbortSignal;
  /** Called once the model is loaded and the prediction itself starts. */
  onRunning?: () => void;
}

/**
 * Predicts a mask in the background worker, so the page stays responsive.
 * `getModel` is only called when the worker doesn't already hold the model.
 */
export function predictMask(
  modelId: ModelId,
  getModel: () => Promise<Uint8Array>,
  pixels: Float32Array,
  size: number,
  { signal, onRunning }: PredictOptions = {},
): Promise<Float32Array> {
  return new Promise((resolve, reject) => {
    const target = getWorker();
    const id = nextId++;

    const cleanup = () => {
      target.removeEventListener("message", onMessage);
      target.removeEventListener("error", onError);
      signal?.removeEventListener("abort", onAbort);
    };
    const send = (model?: ArrayBuffer) => {
      const request: InferenceRequest = { id, modelId, model, pixels: pixels.slice(), size };
      target.postMessage(request, model ? [model, request.pixels.buffer] : [request.pixels.buffer]);
    };
    const onMessage = async ({ data }: MessageEvent<InferenceResponse>) => {
      if (data.id !== id) return;
      if (data.type === "running") return onRunning?.();
      if (data.type === "needs-model") {
        // Copy, because transferring detaches the buffer and the caller may hold on to it.
        return getModel().then((bytes) => send(bytes.slice().buffer), (error) => (cleanup(), reject(error)));
      }
      cleanup();
      if (data.type === "result") resolve(data.mask);
      else reject(new InferenceError(data.message));
    };
    const onError = (event: ErrorEvent) => {
      cleanup();
      resetWorker();
      reject(new InferenceError(event.message || "The AI worker stopped unexpectedly"));
    };
    const onAbort = () => {
      cleanup();
      // The model can't be interrupted mid-run; stopping the worker frees the CPU straight away.
      resetWorker();
      reject(signal!.reason);
    };

    target.addEventListener("message", onMessage);
    target.addEventListener("error", onError);
    signal?.addEventListener("abort", onAbort, { once: true });
    send();
  });
}
