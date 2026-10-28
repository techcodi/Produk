import { MODEL_CACHE_NAME, type ModelSpec } from "./models";

export class ModelDownloadError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ModelDownloadError";
  }
}

const cacheKey = (spec: ModelSpec) => new URL(spec.url, window.location.href).href;

/** Cache Storage only exists in secure contexts (HTTPS, localhost). */
const openCache = async () => {
  try {
    return typeof caches === "undefined" ? null : await caches.open(MODEL_CACHE_NAME);
  } catch {
    return null;
  }
};

export async function isModelCached(spec: ModelSpec): Promise<boolean> {
  const cache = await openCache();
  return Boolean(await cache?.match(cacheKey(spec)).catch(() => undefined));
}

async function sha256Hex(bytes: Uint8Array): Promise<string | null> {
  if (typeof crypto === "undefined" || !crypto.subtle) return null;
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Returns the model's bytes: from Cache Storage when downloaded before,
 * otherwise streamed from `spec.url` with progress, checked against the
 * pinned SHA-256, and cached for next time.
 */
export async function loadModel(spec: ModelSpec, onProgress: (loaded: number, total: number) => void, signal?: AbortSignal): Promise<Uint8Array> {
  const cache = await openCache();
  const cached = await cache?.match(cacheKey(spec)).catch(() => undefined);
  if (cached) return new Uint8Array(await cached.arrayBuffer());

  let response: Response;
  try {
    response = await fetch(spec.url, { signal });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ModelDownloadError("Couldn’t download the AI model. Check your connection and try again.", { cause: error });
  }
  if (!response.ok || !response.body) throw new ModelDownloadError(`Couldn’t download the AI model (HTTP ${response.status}).`);

  // Stream into one buffer so progress can be shown for the large model.
  let bytes = new Uint8Array(spec.bytes);
  let loaded = 0;
  const reader = response.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (loaded + value.length > bytes.length) {
      const grown = new Uint8Array(Math.max(bytes.length * 2, loaded + value.length));
      grown.set(bytes.subarray(0, loaded));
      bytes = grown;
    }
    bytes.set(value, loaded);
    loaded += value.length;
    onProgress(loaded, spec.bytes);
  }
  bytes = bytes.subarray(0, loaded);

  const hash = await sha256Hex(bytes);
  if (hash !== null && hash !== spec.sha256) {
    throw new ModelDownloadError("The AI model didn’t download correctly. Please try again.");
  }

  try {
    await cache?.put(cacheKey(spec), new Response(bytes as BodyInit, { headers: { "Content-Type": "application/octet-stream" } }));
  } catch {
    // Out of storage quota (or private browsing): it simply downloads again next time.
  }
  return bytes;
}
