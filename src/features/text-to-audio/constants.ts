import type { AudioSettings, Voice } from "./types";

/** About 10 minutes of speech; keeps the in-memory audio comfortable on phones. */
export const MAX_CHARACTERS = 10_000;
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/** Pinned so a voice can never change underneath a cached copy. */
const VOICES_REVISION = "5041a7a49ae5b3a0f30e6837769eb03fdbb231bd";
export const voiceFileUrl = (voice: Voice, extension: ".onnx" | ".onnx.json") =>
  `https://huggingface.co/rhasspy/piper-voices/resolve/${VOICES_REVISION}/${voice.path}/${voice.id}${extension}`;

export const VOICE_CACHE_NAME = "produk-tts-voices-v1";

/** Self-hosted by scripts/copy-tts-assets.mjs. */
export const PHONEMIZER_BASE = "/tts/piper-phonemize-1.0.0/";

/** espeak-ng is GPL-3.0; we ship it unmodified and point to its source. */
export const PHONEMIZER_SOURCE_URL = "https://github.com/diffusion-studio/piper-wasm";
export const ESPEAK_SOURCE_URL = "https://github.com/espeak-ng/espeak-ng";

const medium = (lang: string, speaker: string) => `${lang.split("_")[0]}/${lang}/${speaker}/medium`;

/**
 * Only voices whose model card allows commercial use (public domain, CC0,
 * Unlicense, Apache-2.0 or CC BY). Non-commercial and "see URL" voices are left out.
 */
export const VOICES: Voice[] = [
  { id: "en_US-kristin-medium", name: "Kristin", lang: "en-US", language: "English (US)", tone: "Female", path: medium("en_US", "kristin"), sizeBytes: 63_531_379, license: "Public domain" },
  { id: "en_US-ljspeech-medium", name: "Linda", lang: "en-US", language: "English (US)", tone: "Female", path: medium("en_US", "ljspeech"), sizeBytes: 63_531_379, license: "Public domain" },
  { id: "en_US-john-medium", name: "John", lang: "en-US", language: "English (US)", tone: "Male", path: medium("en_US", "john"), sizeBytes: 63_531_379, license: "Public domain" },
  { id: "en_US-bryce-medium", name: "Bryce", lang: "en-US", language: "English (US)", tone: "Male", path: medium("en_US", "bryce"), sizeBytes: 63_531_379, license: "Public domain" },
  { id: "en_US-norman-medium", name: "Norman", lang: "en-US", language: "English (US)", tone: "Male", path: medium("en_US", "norman"), sizeBytes: 63_531_379, license: "Public domain" },
  { id: "en_US-joe-medium", name: "Joe", lang: "en-US", language: "English (US)", tone: "Male", path: medium("en_US", "joe"), sizeBytes: 63_201_294, license: "CC0" },
  { id: "en_US-sam-medium", name: "Sam", lang: "en-US", language: "English (US)", tone: "Gender-neutral", path: medium("en_US", "sam"), sizeBytes: 62_950_044, license: "Apache-2.0" },
  { id: "en_GB-cori-medium", name: "Cori", lang: "en-GB", language: "English (UK)", tone: "Female", path: medium("en_GB", "cori"), sizeBytes: 63_531_379, license: "Public domain" },
  {
    id: "en_GB-alba-medium", name: "Alba", lang: "en-GB", language: "English (UK)", tone: "Female", path: medium("en_GB", "alba"), sizeBytes: 63_201_294, license: "CC BY 4.0",
    credit: "Alba voice trained on a dataset from the University of Edinburgh (CC BY 4.0).",
  },
  { id: "es_MX-ald-medium", name: "Ald", lang: "es-MX", language: "Spanish (Mexico)", tone: "Male", path: medium("es_MX", "ald"), sizeBytes: 63_201_294, license: "Unlicense" },
  { id: "es_ES-davefx-medium", name: "Dave", lang: "es-ES", language: "Spanish (Spain)", tone: "Male", path: medium("es_ES", "davefx"), sizeBytes: 63_201_294, license: "CC0" },
  {
    id: "fr_FR-siwis-medium", name: "Siwis", lang: "fr-FR", language: "French", tone: "Female", path: medium("fr_FR", "siwis"), sizeBytes: 63_201_294, license: "CC BY 4.0",
    credit: "Siwis voice trained on the SIWIS French Speech Synthesis Database, University of Edinburgh (CC BY 4.0).",
  },
  { id: "de_DE-thorsten-medium", name: "Thorsten", lang: "de-DE", language: "German", tone: "Male", path: medium("de_DE", "thorsten"), sizeBytes: 63_201_294, license: "CC0" },
  { id: "pt_BR-faber-medium", name: "Faber", lang: "pt-BR", language: "Portuguese (Brazil)", tone: "Male", path: medium("pt_BR", "faber"), sizeBytes: 63_201_294, license: "CC0" },
  { id: "nl_NL-pim-medium", name: "Pim", lang: "nl-NL", language: "Dutch", tone: "Male", path: medium("nl_NL", "pim"), sizeBytes: 63_516_050, license: "CC0" },
];

export const getVoice = (id: string) => VOICES.find((voice) => voice.id === id) ?? VOICES[0];

export const SPEEDS = [0.75, 0.9, 1, 1.15, 1.3, 1.5] as const;

export const DEFAULT_SETTINGS: AudioSettings = { voiceId: VOICES[0].id, speed: 1, expressiveness: 0.5 };

/** Seconds of silence between chunks. */
export const PAUSE_SECONDS = { sentence: 0.25, paragraph: 0.6 } as const;

/* ── Voice cloning (Chatterbox, English only) ── */

/** `AudioSettings.voiceId` when the user's own voice sample is selected. */
export const CLONE_VOICE_ID = "clone";

export const CLONE_MODEL_ID = "onnx-community/chatterbox-ONNX";
/** Pinned so a cached model can never change underneath us. */
export const CLONE_MODEL_REVISION = "3cab09af388d3f02bba43443fce88c1f4525ac43";
export const CLONE_LICENSE_URL = "https://huggingface.co/ResembleAI/chatterbox";

/** Self-hosted by scripts/copy-tts-assets.mjs; must match the onnxruntime-web bundled with @huggingface/transformers. */
export const CLONE_ORT_BASE = "/tts/ort-1.31.0-dev.20260914-8d85527a0/";

/** Only the language model has quantised variants; WebGPU gets the smaller fp16 one. */
export const CLONE_DTYPES = {
  webgpu: { embed_tokens: "fp32", speech_encoder: "fp32", language_model: "q4f16", conditional_decoder: "fp32" },
  wasm: { embed_tokens: "fp32", speech_encoder: "fp32", language_model: "q4", conditional_decoder: "fp32" },
} as const;

/** Download size per device, from the pinned revision's file list. */
export const CLONE_MODEL_BYTES = { webgpu: 1_499_600_000, wasm: 1_548_500_000 } as const;

export const CLONE_SAMPLE_RATE = 24_000;
/** Chatterbox works best with 5–10 s of clean speech; longer samples are trimmed. */
export const SAMPLE_MIN_SECONDS = 4;
export const SAMPLE_MAX_SECONDS = 15;
export const SAMPLE_MAX_FILE_BYTES = 25 * 1024 * 1024;
export const SAMPLE_ACCEPT = "audio/*,.mp3,.m4a,.wav,.ogg,.oga,.opus,.webm,.aac,.flac";

/** Each chunk must fit the model's output budget (~25 speech tokens per second). */
export const CLONE_CHUNK_LENGTH = 160;
export const CLONE_MAX_NEW_TOKENS = 400;
/** Clone generation is much slower than Piper, so long texts are capped lower. */
export const CLONE_MAX_CHARACTERS = 3_000;

export const EXPRESSIVENESS = [
  { value: "0.3", label: "Calm" },
  { value: "0.5", label: "Natural" },
  { value: "0.8", label: "Lively" },
] as const;

/** Shown in the reading prompt: a varied sentence gives the model more of the voice to learn from. */
export const SAMPLE_SCRIPT =
  "Hi, this is my own voice. I’m recording a short sample so I can turn my writing into speech. The quick brown fox jumps over the lazy dog.";
