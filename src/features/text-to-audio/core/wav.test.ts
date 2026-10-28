import { describe, expect, it } from "vitest";
import { PAUSE_SECONDS } from "../constants";
import { encodeWav, joinChunks } from "./wav";

describe("joinChunks", () => {
  it("inserts sentence and paragraph pauses, but none at the end", () => {
    const rate = 100;
    const out = joinChunks(
      [
        { pcm: new Float32Array([1, 1]), pause: "sentence" },
        { pcm: new Float32Array([1]), pause: "paragraph" },
        { pcm: new Float32Array([1]), pause: "paragraph" },
      ],
      rate,
    );
    expect(out.length).toBe(2 + PAUSE_SECONDS.sentence * rate + 1 + PAUSE_SECONDS.paragraph * rate + 1);
    expect(out[2]).toBe(0); // silence right after the first chunk
    expect(out[out.length - 1]).toBe(1);
  });
});

describe("encodeWav", () => {
  it("writes a valid 16-bit mono header", () => {
    const wav = encodeWav(new Float32Array([0, 0.5, -0.5]), 22050);
    const view = new DataView(wav.buffer);
    const text = (start: number) => String.fromCharCode(...wav.slice(start, start + 4));
    expect(text(0)).toBe("RIFF");
    expect(text(8)).toBe("WAVE");
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(22050);
    expect(view.getUint32(40, true)).toBe(6);
    expect(wav.length).toBe(44 + 6);
  });

  it("normalises the loudest sample to about -1 dBFS without clipping", () => {
    const wav = encodeWav(new Float32Array([0.1, -2]), 8000);
    const view = new DataView(wav.buffer);
    expect(view.getInt16(46, true)).toBeLessThan(-29000);
    expect(view.getInt16(46, true)).toBeGreaterThan(-32768);
    expect(view.getInt16(44, true)).toBeGreaterThan(1400);
  });
});
