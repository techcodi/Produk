import { createId } from "@/lib/id";
import { formatBytes } from "@/lib/format";
import { CLONE_SAMPLE_RATE, SAMPLE_MAX_FILE_BYTES } from "../constants";
import type { VoiceSample } from "../types";
import { prepareSample, VoiceSampleError } from "./sample";
import { decodeWav16, encodeWav } from "./wav";

/**
 * Decodes any audio the browser can play (MP3, M4A, WAV, Ogg, WebM…) and
 * resamples it to mono at the cloning model's rate. Web Audio does the
 * resampling and the downmix in one offline render.
 */
async function decodeToModelRate(blob: Blob): Promise<Float32Array> {
  const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const context = new AudioContextClass();
  let decoded: AudioBuffer;
  try {
    decoded = await context.decodeAudioData(await blob.arrayBuffer());
  } catch {
    throw new VoiceSampleError("This audio file couldn’t be read. Try an MP3, M4A or WAV file.");
  } finally {
    void context.close();
  }
  const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * CLONE_SAMPLE_RATE), CLONE_SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  return (await offline.startRendering()).getChannelData(0);
}

export async function createVoiceSample(blob: Blob, source: VoiceSample["source"]): Promise<VoiceSample> {
  if (blob.size > SAMPLE_MAX_FILE_BYTES) {
    throw new VoiceSampleError(`Please use a file under ${formatBytes(SAMPLE_MAX_FILE_BYTES)}.`);
  }
  const samples = prepareSample(await decodeToModelRate(blob), CLONE_SAMPLE_RATE);
  return { id: createId(), samples, durationSeconds: samples.length / CLONE_SAMPLE_RATE, source, createdAt: Date.now() };
}

/* ── Kept on this device only, in Cache Storage under a same-origin key that is never fetched. ── */

const CACHE_NAME = "produk-voice-sample-v1";
const SAMPLE_KEY = "/__voice-sample.wav";
const META_KEY = "/__voice-sample.json";

async function openCache() {
  try {
    return typeof caches === "undefined" ? null : await caches.open(CACHE_NAME);
  } catch {
    return null;
  }
}

/** Returns false when the browser can't store it (private mode, insecure origin); the sample still works for this visit. */
export async function saveVoiceSample(sample: VoiceSample): Promise<boolean> {
  const cache = await openCache();
  if (!cache) return false;
  try {
    const wav = encodeWav(sample.samples, CLONE_SAMPLE_RATE);
    await cache.put(SAMPLE_KEY, new Response(wav as BlobPart, { headers: { "Content-Type": "audio/wav" } }));
    const meta = { id: sample.id, source: sample.source, createdAt: sample.createdAt };
    await cache.put(META_KEY, new Response(JSON.stringify(meta), { headers: { "Content-Type": "application/json" } }));
    return true;
  } catch {
    return false;
  }
}

export async function loadVoiceSample(): Promise<VoiceSample | null> {
  const cache = await openCache();
  const [wav, meta] = await Promise.all([cache?.match(SAMPLE_KEY), cache?.match(META_KEY)]);
  if (!wav || !meta) return null;
  try {
    const decoded = decodeWav16(new Uint8Array(await wav.arrayBuffer()));
    const info = (await meta.json()) as Pick<VoiceSample, "id" | "source" | "createdAt">;
    if (!decoded || decoded.sampleRate !== CLONE_SAMPLE_RATE) return null;
    return { ...info, samples: decoded.samples, durationSeconds: decoded.samples.length / CLONE_SAMPLE_RATE };
  } catch {
    return null;
  }
}

export async function deleteVoiceSample() {
  const cache = await openCache();
  await Promise.all([cache?.delete(SAMPLE_KEY), cache?.delete(META_KEY)]);
}
