import { VOICE_CACHE_NAME, voiceFileUrl } from "../constants";
import type { Voice, VoiceConfig } from "../types";

/** Cache Storage only exists in secure contexts (https, localhost); elsewhere voices are simply re-downloaded. */
async function openCache(): Promise<Cache | null> {
  try {
    return typeof caches === "undefined" ? null : await caches.open(VOICE_CACHE_NAME);
  } catch {
    return null;
  }
}

export async function isVoiceDownloaded(voice: Voice): Promise<boolean> {
  const cache = await openCache();
  return Boolean(cache && (await cache.match(voiceFileUrl(voice, ".onnx"))));
}

export class VoiceDownloadError extends Error {
  constructor() {
    super("The voice couldn’t be downloaded. Check your connection and try again.");
    this.name = "VoiceDownloadError";
  }
}

async function download(url: string, signal: AbortSignal, onProgress?: (loaded: number) => void): Promise<Uint8Array> {
  let response: Response;
  try {
    response = await fetch(url, { signal });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new VoiceDownloadError();
  }
  if (!response.ok || !response.body) throw new VoiceDownloadError();

  const reader = response.body.getReader();
  const parts: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    loaded += value.length;
    onProgress?.(loaded);
  }
  const bytes = new Uint8Array(loaded);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return bytes;
}

async function cached(cache: Cache | null, url: string): Promise<Uint8Array | null> {
  const hit = await cache?.match(url);
  return hit ? new Uint8Array(await hit.arrayBuffer()) : null;
}

async function store(cache: Cache | null, url: string, bytes: Uint8Array) {
  try {
    await cache?.put(url, new Response(bytes as BlobPart));
  } catch {
    // Storage full or blocked — the voice still works for this visit.
  }
}

export interface LoadedVoice {
  /** Null when only the config was asked for. */
  model: Uint8Array | null;
  config: VoiceConfig;
}

/**
 * The voice's model and config, from this device's cache when possible. Progress
 * is in bytes of the model. Pass `withModel: false` when the engine already holds it.
 */
export async function loadVoice(
  voice: Voice,
  signal: AbortSignal,
  onProgress: (loaded: number, total: number) => void,
  withModel = true,
): Promise<LoadedVoice> {
  const cache = await openCache();
  const modelUrl = voiceFileUrl(voice, ".onnx");
  const configUrl = voiceFileUrl(voice, ".onnx.json");

  const configBytes = (await cached(cache, configUrl)) ?? (await download(configUrl, signal));
  const config = JSON.parse(new TextDecoder().decode(configBytes)) as VoiceConfig;
  if (!withModel) return { model: null, config };

  let model = await cached(cache, modelUrl);
  if (!model) {
    model = await download(modelUrl, signal, (loaded) => onProgress(loaded, voice.sizeBytes));
    // The config is only cached alongside a complete model, so "downloaded" always means both.
    await store(cache, configUrl, configBytes);
    await store(cache, modelUrl, model);
  }
  return { model, config };
}

/** Frees the space a voice takes on this device. */
export async function removeVoice(voice: Voice) {
  const cache = await openCache();
  await cache?.delete(voiceFileUrl(voice, ".onnx"));
  await cache?.delete(voiceFileUrl(voice, ".onnx.json"));
}
