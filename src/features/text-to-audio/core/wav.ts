import { PAUSE_SECONDS } from "../constants";
import type { TextChunk } from "../types";

export interface SpokenChunk {
  pcm: Float32Array;
  pause: TextChunk["pause"];
}

/** Joins speech chunks with short silences between them. No pause after the last one. */
export function joinChunks(chunks: SpokenChunk[], sampleRate: number): Float32Array {
  const gaps = chunks.map((chunk, index) =>
    index === chunks.length - 1 ? 0 : Math.round(PAUSE_SECONDS[chunk.pause] * sampleRate),
  );
  const length = chunks.reduce((sum, chunk, index) => sum + chunk.pcm.length + gaps[index], 0);
  const out = new Float32Array(length);
  let offset = 0;
  chunks.forEach((chunk, index) => {
    out.set(chunk.pcm, offset);
    offset += chunk.pcm.length + gaps[index];
  });
  return out;
}

/** Reads back a 16-bit PCM WAV written by `encodeWav` (first channel only). Null if it isn't one. */
export function decodeWav16(bytes: Uint8Array): { samples: Float32Array; sampleRate: number } | null {
  if (bytes.length < 44) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (offset: number) => String.fromCharCode(...bytes.subarray(offset, offset + 4));
  if (tag(0) !== "RIFF" || tag(8) !== "WAVE" || view.getUint16(20, true) !== 1 || view.getUint16(34, true) !== 16) return null;
  const channels = view.getUint16(22, true);
  const sampleRate = view.getUint32(24, true);
  const dataBytes = Math.min(view.getUint32(40, true), bytes.length - 44);
  const frames = Math.floor(dataBytes / 2 / channels);
  const samples = new Float32Array(frames);
  for (let i = 0; i < frames; i++) samples[i] = view.getInt16(44 + i * 2 * channels, true) / 0x8000;
  return { samples, sampleRate };
}

/**
 * 16-bit mono PCM WAV — plays everywhere (phones, WhatsApp, every editor).
 * Peaks are normalised to -1 dBFS first, since Piper's output level varies by voice.
 */
export function encodeWav(samples: Float32Array, sampleRate: number): Uint8Array {
  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  const gain = peak > 0 ? 0.89 / peak : 1;

  const bytes = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(bytes.buffer);
  const ascii = (offset: number, text: string) => [...text].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));

  ascii(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  ascii(36, "data");
  view.setUint32(40, samples.length * 2, true);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i] * gain));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return bytes;
}
