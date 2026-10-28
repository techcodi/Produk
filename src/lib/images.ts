import { extensionOf } from "./files";

export interface Size {
  width: number;
  height: number;
}

export const ACCEPTED_IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".bmp",
  ".avif",
  ".heic",
  ".heif",
] as const;

export const IMAGE_ACCEPT_ATTRIBUTE = ["image/*", ...ACCEPTED_IMAGE_EXTENSIONS].join(",");

/**
 * Longest canvas side we ever allocate. Together with MAX_CANVAS_AREA this keeps
 * canvas memory under iOS Safari's ~16.7MP limit, past which drawing silently fails.
 */
export const MAX_CANVAS_DIMENSION = 4000;
export const MAX_CANVAS_AREA = 16_000_000;

export type OutputMime = "image/jpeg" | "image/png" | "image/webp";

const EXTENSION_BY_MIME: Record<OutputMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const extensionForMime = (mime: string) => EXTENSION_BY_MIME[mime as OutputMime] ?? "jpg";

/** HEIC often arrives with an empty MIME type (Windows, some Androids), so check the extension too. */
export function isHeic(file: File): boolean {
  return /image\/hei[cf]/i.test(file.type) || [".heic", ".heif"].includes(extensionOf(file.name));
}

export function isSupportedImage(file: File): boolean {
  if (file.type === "image/svg+xml") return false;
  if (file.type.startsWith("image/")) return true;
  return (ACCEPTED_IMAGE_EXTENSIONS as readonly string[]).includes(extensionOf(file.name));
}

/** Scales `size` down (never up) so it fits both canvas limits, keeping the aspect ratio. */
export function clampToCanvasLimits(size: Size, maxDimension = MAX_CANVAS_DIMENSION): Size {
  const byDimension = Math.min(1, maxDimension / Math.max(size.width, size.height));
  const byArea = Math.min(1, Math.sqrt(MAX_CANVAS_AREA / (size.width * size.height)));
  const scale = Math.min(byDimension, byArea);
  return {
    width: Math.max(1, Math.floor(size.width * scale)),
    height: Math.max(1, Math.floor(size.height * scale)),
  };
}

export class ImageDecodeError extends Error {
  constructor(message = "This image could not be read") {
    super(message);
    this.name = "ImageDecodeError";
  }
}

export interface DecodedImage {
  drawable: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}

/** Decodes any browser-supported image with its EXIF orientation applied. */
export async function decodeImage(source: Blob): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(source, { imageOrientation: "from-image" });
      return { drawable: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
    } catch {
      // Fall through to <img>, which supports more formats in some browsers.
    }
  }

  const url = URL.createObjectURL(source);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return { drawable: img, width: img.naturalWidth, height: img.naturalHeight, release: () => {} };
  } catch {
    throw new ImageDecodeError();
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Reads the displayed (EXIF-rotated) size of an image URL without keeping it decoded. */
export function readImageSize(url: string): Promise<Size> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new ImageDecodeError());
    img.src = url;
  });
}

export function createCanvas({ width, height }: Size) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageDecodeError("Canvas is not available in this browser");
  ctx.imageSmoothingQuality = "high";
  return { canvas, ctx };
}

/** Frees the canvas backing store immediately — matters on memory-constrained phones. */
export function releaseCanvas(canvas: HTMLCanvasElement) {
  canvas.width = 0;
  canvas.height = 0;
}

/**
 * Encodes a canvas. Browsers that can't encode the requested type (e.g. WebP in
 * older Safari) silently return PNG, so callers should trust `blob.type`.
 */
export function canvasToBlob(canvas: HTMLCanvasElement, type: OutputMime, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new ImageDecodeError("Could not encode image"))),
      type,
      quality,
    );
  });
}

/** Samples a small copy of the image to see whether any pixel is see-through. */
export function hasTransparency(image: DecodedImage): boolean {
  const sample = clampToCanvasLimits(image, 128);
  const { canvas, ctx } = createCanvas(sample);
  try {
    ctx.drawImage(image.drawable, 0, 0, sample.width, sample.height);
    const { data } = ctx.getImageData(0, 0, sample.width, sample.height);
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) return true;
    }
    return false;
  } finally {
    releaseCanvas(canvas);
  }
}

export async function convertHeicToJpeg(file: File): Promise<Blob> {
  const { default: heic2any } = await import("heic2any");
  const result = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
  return Array.isArray(result) ? result[0] : result;
}
