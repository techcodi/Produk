import {
  canvasToBlob,
  clampToCanvasLimits,
  convertHeicToJpeg,
  createCanvas,
  decodeImage,
  isHeic,
  releaseCanvas,
} from "@/lib/images";
import { MODELS, type ModelId, type RemovalStage } from "./models";
import { predictMask } from "./inference-client";
import { loadModel, ModelDownloadError } from "./model-store";
import { maskToAlpha, rgbaToTensor } from "./tensor";

interface RemoveOptions {
  signal?: AbortSignal;
  onStage?: (stage: RemovalStage) => void;
}

export class BackgroundRemovalError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "BackgroundRemovalError";
  }
}

/** Makes HEIC readable; everything else the browser decodes directly. */
export const toDecodable = async (file: File): Promise<Blob> => (isHeic(file) ? convertHeicToJpeg(file) : file);

/**
 * Cuts the main subject out of an image, entirely on this device:
 * 1. squash the image to the model's square input,
 * 2. predict a mask in a background worker (downloading the model once, if needed),
 * 3. stretch the mask back over the full-size image as its alpha channel.
 */
export async function removeBackground(source: Blob, modelId: ModelId, { signal, onStage }: RemoveOptions = {}) {
  const spec = MODELS[modelId];
  onStage?.({ stage: "prepare" });

  const decoded = await decodeImage(source);
  const canvases: HTMLCanvasElement[] = [];
  try {
    const size = spec.inputSize;
    const input = createCanvas({ width: size, height: size });
    canvases.push(input.canvas);
    input.ctx.drawImage(decoded.drawable, 0, 0, size, size);
    const pixels = rgbaToTensor(input.ctx.getImageData(0, 0, size, size).data, size);

    let mask: Float32Array;
    try {
      mask = await predictMask(
        modelId,
        () => loadModel(spec, (loaded, total) => onStage?.({ stage: "download", loaded, total }), signal),
        pixels,
        size,
        { signal, onRunning: () => onStage?.({ stage: "run" }) },
      );
    } catch (error) {
      if (signal?.aborted || error instanceof ModelDownloadError) throw error;
      throw new BackgroundRemovalError("The AI model couldn’t process this image on your device. Try the Fast model.", { cause: error });
    }
    signal?.throwIfAborted();

    // The mask becomes the alpha of a small canvas, which is then scaled up (smoothly) over the photo.
    const maskCanvas = createCanvas({ width: size, height: size });
    canvases.push(maskCanvas.canvas);
    const alpha = maskToAlpha(mask, spec.output);
    const maskPixels = maskCanvas.ctx.createImageData(size, size);
    for (let i = 0; i < alpha.length; i++) maskPixels.data[i * 4 + 3] = alpha[i];
    maskCanvas.ctx.putImageData(maskPixels, 0, 0);

    const outputSize = clampToCanvasLimits(decoded);
    const output = createCanvas(outputSize);
    canvases.push(output.canvas);
    output.ctx.drawImage(decoded.drawable, 0, 0, outputSize.width, outputSize.height);
    output.ctx.globalCompositeOperation = "destination-in";
    output.ctx.drawImage(maskCanvas.canvas, 0, 0, outputSize.width, outputSize.height);

    const blob = await canvasToBlob(output.canvas, "image/png");
    // The low-resolution mask is returned too: it is enough to locate the subject (e.g. a face) cheaply.
    return { blob, ...outputSize, mask: { alpha, size } };
  } finally {
    decoded.release();
    canvases.forEach(releaseCanvas);
  }
}
