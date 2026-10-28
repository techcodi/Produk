/// <reference lib="webworker" />
import type { ModelId } from "./models";
import { hasSession, predict, type Backend } from "./runtime";

/** Main thread → worker. `model` is only sent when the worker doesn't have that model yet. */
export interface InferenceRequest {
  id: number;
  modelId: ModelId;
  model?: ArrayBuffer;
  pixels: Float32Array;
  size: number;
}

/** Worker → main thread. */
export type InferenceResponse =
  | { id: number; type: "running" }
  | { id: number; type: "result"; mask: Float32Array; backend: Backend }
  | { id: number; type: "needs-model" }
  | { id: number; type: "error"; message: string };

const post = (message: InferenceResponse, transfer: Transferable[] = []) => self.postMessage(message, transfer);

self.onmessage = async ({ data }: MessageEvent<InferenceRequest>) => {
  const { id, modelId, model, pixels, size } = data;
  if (!model && !hasSession(modelId)) return post({ id, type: "needs-model" });
  try {
    post({ id, type: "running" });
    const { mask, backend } = await predict(modelId, model && new Uint8Array(model), pixels, size);
    post({ id, type: "result", mask, backend }, [mask.buffer]);
  } catch (error) {
    console.error(error);
    post({ id, type: "error", message: error instanceof Error ? error.message : String(error) });
  }
};
