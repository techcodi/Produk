/** Main thread → clone worker. */
export type CloneRequest =
  | { type: "load"; device: "webgpu" | "wasm" }
  | {
      type: "generate";
      /** Encoded once per sample and kept in the worker. */
      sampleId: string;
      /** Sent only when the worker hasn't encoded this sample yet. Transferred, not copied. */
      samples?: Float32Array;
      texts: string[];
      exaggeration: number;
    };

/** Clone worker → main thread. */
export type CloneMessage =
  | { type: "download"; loaded: number }
  | { type: "loaded" }
  | { type: "chunk"; index: number; pcm: Float32Array }
  | { type: "done" }
  | { type: "error"; message: string };
