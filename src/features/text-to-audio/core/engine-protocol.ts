import type { TextChunk, VoiceConfig } from "../types";

/** Main thread → worker. */
export interface SynthesizeRequest {
  type: "synthesize";
  voiceId: string;
  /** Sent only when the worker doesn't already hold this voice. Transferred, not copied. */
  model?: Uint8Array;
  config: VoiceConfig;
  chunks: TextChunk[];
  speed: number;
}

/** Worker → main thread. */
export type EngineMessage =
  | { type: "ready" }
  | { type: "chunk"; index: number; pcm: Float32Array }
  | { type: "done"; sampleRate: number }
  | { type: "error"; message: string };
