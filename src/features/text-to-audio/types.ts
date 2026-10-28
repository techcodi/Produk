export interface Voice {
  /** Piper voice key, e.g. "en_US-kristin-medium". */
  id: string;
  name: string;
  /** BCP 47 tag, also used to match a device voice for quick listening. */
  lang: string;
  /** e.g. "English (US)" — the group shown in the voice picker. */
  language: string;
  tone: "Female" | "Male" | "Gender-neutral";
  /** Folder in the piper-voices repo holding `<id>.onnx` and `<id>.onnx.json`. */
  path: string;
  sizeBytes: number;
  license: string;
  /** Required wording for CC BY voices; shown on the page. */
  credit?: string;
}

/** The parts of `<voice>.onnx.json` inference needs. */
export interface VoiceConfig {
  audio: { sample_rate: number };
  espeak: { voice: string };
  inference: { noise_scale: number; length_scale: number; noise_w: number };
  num_speakers: number;
}

export interface TextChunk {
  text: string;
  /** Silence after this chunk: a beat after a sentence, longer after a paragraph. */
  pause: "sentence" | "paragraph";
}

export interface AudioSettings {
  /** A Piper voice id, or `CLONE_VOICE_ID` for the user's own voice. */
  voiceId: string;
  /** 1 = the voice's natural pace. Piper voices only. */
  speed: number;
  /** Chatterbox "exaggeration": 0.3 calm … 0.8 lively. Cloned voice only. */
  expressiveness: number;
}

/** The user's voice sample, already decoded to mono at the cloning model's sample rate. */
export interface VoiceSample {
  /** Changes whenever the sample does, so the engine knows to re-encode it. */
  id: string;
  samples: Float32Array;
  durationSeconds: number;
  source: "recording" | "upload";
  createdAt: number;
}

export interface GeneratedAudio {
  blob: Blob;
  durationSeconds: number;
}
