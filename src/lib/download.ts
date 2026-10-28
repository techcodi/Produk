export function triggerDownload(url: string, fileName: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

/** A generated file held as an object URL. Pass it to `releaseOutputFile` once it is no longer shown. */
export interface OutputFile {
  url: string;
  fileName: string;
  size: number;
}

export function createOutputFile(data: Blob | Uint8Array, fileName: string, type?: string): OutputFile {
  const blob = data instanceof Blob ? data : new Blob([data as BlobPart], { type });
  return { url: URL.createObjectURL(blob), fileName, size: blob.size };
}

export const releaseOutputFile = (file: OutputFile) => URL.revokeObjectURL(file.url);
