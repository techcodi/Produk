import { canvasToBlob, clampToCanvasLimits, createCanvas, decodeImage, releaseCanvas } from "../images";
import { toPdfmake } from "./to-pdfmake";
import type { DocNode, DocumentSettings, ImageMap, PreparedImage } from "./types";
import { collectImageSources } from "./walk";

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

/**
 * Loads every image in the document and makes sure it is PNG or JPEG — the
 * only formats both pdfmake and Word accept. Images that fail to load are skipped.
 */
export async function prepareImages(sources: string[]): Promise<ImageMap> {
  const prepared = new Map<string, PreparedImage>();

  for (const src of sources) {
    try {
      const blob = await (await fetch(src)).blob();
      const decoded = await decodeImage(blob);
      try {
        if (blob.type === "image/png" || blob.type === "image/jpeg") {
          prepared.set(src, { dataUrl: await blobToDataUrl(blob), mime: blob.type, width: decoded.width, height: decoded.height });
          continue;
        }
        const size = clampToCanvasLimits(decoded);
        const { canvas, ctx } = createCanvas(size);
        try {
          ctx.drawImage(decoded.drawable, 0, 0, size.width, size.height);
          const png = await canvasToBlob(canvas, "image/png");
          prepared.set(src, { dataUrl: await blobToDataUrl(png), mime: "image/png", width: decoded.width, height: decoded.height });
        } finally {
          releaseCanvas(canvas);
        }
      } finally {
        decoded.release();
      }
    } catch (error) {
      console.warn("Skipping an image that could not be read", error);
    }
  }

  return prepared;
}

/** pdfmake plus its fonts: Roboto (Latin, Greek and Cyrillic), Times and Courier. */
async function importPdfmake() {
  const [{ default: pdfMake }, { default: vfs }, { default: times }, { default: courier }] = await Promise.all([
    import("pdfmake/build/pdfmake"),
    import("pdfmake/build/vfs_fonts"),
    import("pdfmake/build/standard-fonts/Times"),
    import("pdfmake/build/standard-fonts/Courier"),
  ]);
  pdfMake.addVirtualFileSystem(vfs);
  pdfMake.addFontContainer(times);
  pdfMake.addFontContainer(courier);
  return pdfMake;
}

let pdfmakePromise: ReturnType<typeof importPdfmake> | null = null;
const loadPdfmake = () => (pdfmakePromise ??= importPdfmake());

type ExportSettings = Omit<DocumentSettings, "fileName">;

export async function exportPdf(doc: DocNode, settings: ExportSettings, title: string): Promise<Blob> {
  const images = await prepareImages(collectImageSources(doc));
  const pdfMake = await loadPdfmake();
  return pdfMake.createPdf(toPdfmake(doc, settings, images, title)).getBlob();
}

export async function exportDocx(html: string, doc: DocNode, settings: ExportSettings, title: string): Promise<Blob> {
  const images = await prepareImages(collectImageSources(doc));
  // docx is large, so it is only loaded when someone actually asks for a Word file.
  const { buildDocx, packDocx } = await import("./to-docx");
  return packDocx(buildDocx(html, settings, images, title));
}
