import { SAMPLE_MAX_SECONDS, SAMPLE_MIN_SECONDS } from "../constants";

const FRAME_SECONDS = 0.02;

/** Root-mean-square level of each 20 ms frame. */
function frameLevels(samples: Float32Array, sampleRate: number): number[] {
  const size = Math.max(1, Math.round(sampleRate * FRAME_SECONDS));
  const levels: number[] = [];
  for (let start = 0; start < samples.length; start += size) {
    let sum = 0;
    const end = Math.min(samples.length, start + size);
    for (let i = start; i < end; i++) sum += samples[i] * samples[i];
    levels.push(Math.sqrt(sum / (end - start)));
  }
  return levels;
}

/**
 * Cuts leading and trailing silence (frames quieter than 5% of the loudest one),
 * keeping a 0.1 s margin so words aren't clipped.
 */
export function trimSilence(samples: Float32Array, sampleRate: number): Float32Array {
  const levels = frameLevels(samples, sampleRate);
  const threshold = Math.max(...levels, 0) * 0.05;
  const first = levels.findIndex((level) => level > threshold);
  if (first < 0) return new Float32Array(0);
  const last = levels.findLastIndex((level) => level > threshold);
  const frame = Math.round(sampleRate * FRAME_SECONDS);
  const margin = Math.round(sampleRate * 0.1);
  const start = Math.max(0, first * frame - margin);
  const end = Math.min(samples.length, (last + 1) * frame + margin);
  return samples.slice(start, end);
}

export class VoiceSampleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VoiceSampleError";
  }
}

/** Trims silence, caps the length, and rejects samples the model can't learn a voice from. */
export function prepareSample(samples: Float32Array, sampleRate: number): Float32Array {
  const trimmed = trimSilence(samples, sampleRate).slice(0, SAMPLE_MAX_SECONDS * sampleRate);
  let peak = 0;
  for (const sample of trimmed) peak = Math.max(peak, Math.abs(sample));
  if (trimmed.length === 0 || peak < 0.02) {
    throw new VoiceSampleError("We couldn’t hear any speech. Check your microphone or choose another file.");
  }
  if (trimmed.length < SAMPLE_MIN_SECONDS * sampleRate) {
    throw new VoiceSampleError(`The sample is too short. Please use at least ${SAMPLE_MIN_SECONDS} seconds of speech.`);
  }
  return trimmed;
}
