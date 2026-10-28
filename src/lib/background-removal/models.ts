/**
 * The background-removal models. Both are permissively licensed and pinned to
 * an exact revision; downloads are checked against their SHA-256 before use
 * (model-store.ts).
 */
export type ModelId = "fast" | "hd";

export interface ModelSpec {
  id: ModelId;
  url: string;
  sha256: string;
  bytes: number;
  /** Square input the model expects, in pixels. */
  inputSize: number;
  /** Whether the first output is already a 0–1 mask or raw logits needing a sigmoid. */
  output: "probability" | "logits";
}

export type RemovalStage = { stage: "download"; loaded: number; total: number } | { stage: "prepare" } | { stage: "run" };

export const MODELS: Record<ModelId, ModelSpec> = {
  fast: {
    id: "fast",
    // U²-Net-p, Apache-2.0. Self-hosted: scripts/copy-ml-assets.mjs downloads it into public/models.
    url: "/models/u2netp-7112208.onnx",
    sha256: "309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8",
    bytes: 4_574_861,
    inputSize: 320,
    output: "probability",
  },
  hd: {
    id: "hd",
    // BiRefNet-lite at 512×512 (MIT, © 2024 ZhengPeng, © 2026 Studio Ludens). Too large to bundle,
    // so it is fetched from Hugging Face on demand; only the model is downloaded — images never leave the device.
    url: "https://huggingface.co/studioludens/birefnet-lite-512/resolve/962e67969ec6acec9c19fab76acee4f5e22e990c/onnx/model_fp16.onnx",
    sha256: "eff9216bb2f9d3f023d9c2b7196845a7485739ab1f231593633e4d2344ffc516",
    bytes: 98_484_532,
    inputSize: 512,
    output: "logits",
  },
};

/** ImageNet normalisation, used by both models. */
export const IMAGE_MEAN = [0.485, 0.456, 0.406] as const;
export const IMAGE_STD = [0.229, 0.224, 0.225] as const;

/** Cache Storage bucket for downloaded models. Bump the suffix to force re-downloads. */
export const MODEL_CACHE_NAME = "produk-models-v1";
