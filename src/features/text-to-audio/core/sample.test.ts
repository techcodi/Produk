import { describe, expect, it } from "vitest";
import { SAMPLE_MAX_SECONDS } from "../constants";
import { prepareSample, trimSilence, VoiceSampleError } from "./sample";
import { decodeWav16, encodeWav } from "./wav";

const RATE = 1000;

/** `silence` seconds of quiet, `tone` seconds of a loud tone, then `silence` again. */
function clip(silence: number, tone: number) {
  const quiet = new Float32Array(silence * RATE).fill(0.001);
  const loud = Float32Array.from({ length: tone * RATE }, (_, i) => 0.5 * Math.sin(i / 3));
  return Float32Array.from([...quiet, ...loud, ...quiet]);
}

describe("trimSilence", () => {
  it("cuts quiet edges but keeps a small margin", () => {
    const trimmed = trimSilence(clip(2, 5), RATE);
    expect(trimmed.length).toBeGreaterThanOrEqual(5 * RATE);
    expect(trimmed.length).toBeLessThan(5.4 * RATE);
  });

  it("returns nothing for pure silence", () => {
    expect(trimSilence(new Float32Array(RATE), RATE).length).toBe(0);
  });
});

describe("prepareSample", () => {
  it("caps long samples", () => {
    expect(prepareSample(clip(1, 30), RATE).length).toBe(SAMPLE_MAX_SECONDS * RATE);
  });

  it("rejects samples that are too short or silent", () => {
    expect(() => prepareSample(clip(1, 2), RATE)).toThrow(/too short/);
    expect(() => prepareSample(new Float32Array(10 * RATE).fill(0.005), RATE)).toThrow(VoiceSampleError);
  });
});

describe("decodeWav16", () => {
  it("round-trips encodeWav output", () => {
    const decoded = decodeWav16(encodeWav(Float32Array.from([0, 0.5, -0.25]), 24000));
    expect(decoded?.sampleRate).toBe(24000);
    expect(decoded?.samples.length).toBe(3);
    // encodeWav normalises the peak to ~0.89, so compare shape rather than values.
    expect(decoded!.samples[1] / decoded!.samples[2]).toBeCloseTo(-2, 2);
  });

  it("rejects anything that isn't a 16-bit PCM WAV", () => {
    expect(decodeWav16(new Uint8Array(10))).toBeNull();
    expect(decodeWav16(new TextEncoder().encode("x".repeat(60)))).toBeNull();
  });
});
