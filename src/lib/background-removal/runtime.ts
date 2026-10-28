import { hasFp16WebGpu } from "@/lib/webgpu";
import type { ModelId } from "./models";

/*
 * ONNX Runtime, as used inside inference.worker.ts (never on the main thread,
 * where a long inference would freeze the page). Two builds: plain WebAssembly
 * (~14 MB) by default, and the WebGPU-capable one (~27 MB) only when the HD
 * model can use the GPU. Their .wasm files are served from public/ort
 * (scripts/copy-ml-assets.mjs).
 */

type Ort = typeof import("onnxruntime-web/wasm");
export type Backend = "wasm" | "webgpu";

const runtimes = new Map<Backend, Promise<Ort>>();

function loadRuntime(kind: Backend): Promise<Ort> {
  let runtime = runtimes.get(kind);
  if (!runtime) {
    runtime = (kind === "webgpu" ? import("onnxruntime-web/webgpu") : import("onnxruntime-web/wasm")).then((ort) => {
      ort.env.wasm.wasmPaths = `/ort/${ort.env.versions.web}/`;
      // Threads need cross-origin isolation (SharedArrayBuffer), which static hosting usually lacks.
      ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
      return ort;
    });
    runtimes.set(kind, runtime);
  }
  return runtime;
}

export interface LoadedModel {
  ort: Ort;
  session: import("onnxruntime-web/wasm").InferenceSession;
  backend: Backend;
}

async function createSession(bytes: Uint8Array, backend: Backend): Promise<LoadedModel> {
  const ort = await loadRuntime(backend);
  const session = await ort.InferenceSession.create(bytes, { executionProviders: [backend], graphOptimizationLevel: "all" });
  return { ort, session, backend };
}

/** Sessions are kept per model so a second image doesn't pay the setup cost again. */
const sessions = new Map<ModelId, Promise<LoadedModel>>();

export const hasSession = (id: ModelId) => sessions.has(id);

/**
 * Creates (once) the session for a model. The HD model tries a capable GPU
 * first; any WebGPU failure falls back to WebAssembly, which always works.
 */
export function getSession(id: ModelId, bytes: Uint8Array | undefined, { forceWasm = false } = {}): Promise<LoadedModel> {
  if (forceWasm) sessions.delete(id);
  let loaded = sessions.get(id);
  if (!loaded) {
    if (!bytes) return Promise.reject(new Error(`Model ${id} is not loaded`));
    loaded = (async () => {
      if (!forceWasm && id === "hd" && (await hasFp16WebGpu())) {
        try {
          return await createSession(bytes, "webgpu");
        } catch (error) {
          console.warn("WebGPU couldn't load the model; using WebAssembly instead.", error);
        }
      }
      return createSession(bytes, "wasm");
    })();
    // A failed load shouldn't poison later attempts.
    loaded.catch(() => sessions.delete(id));
    sessions.set(id, loaded);
  }
  return loaded;
}

/** Runs the model on prepared input pixels, retrying on WebAssembly if the GPU fails mid-run. */
export async function predict(id: ModelId, bytes: Uint8Array | undefined, pixels: Float32Array, size: number): Promise<{ mask: Float32Array; backend: Backend }> {
  const run = async ({ ort, session }: LoadedModel) => {
    const outputs = await session.run({ [session.inputNames[0]]: new ort.Tensor("float32", pixels, [1, 3, size, size]) });
    return outputs[session.outputNames[0]].data as Float32Array;
  };

  const loaded = await getSession(id, bytes);
  try {
    return { mask: await run(loaded), backend: loaded.backend };
  } catch (error) {
    if (loaded.backend !== "webgpu" || !bytes) throw error;
    console.warn("WebGPU failed while running the model; retrying with WebAssembly.", error);
    const fallback = await getSession(id, bytes, { forceWasm: true });
    return { mask: await run(fallback), backend: "wasm" };
  }
}
