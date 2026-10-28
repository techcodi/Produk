import { createOutputFile, releaseOutputFile, type OutputFile } from "./download";
import { uniqueFileNames } from "./files";
import { createZip } from "./zip";

export interface BatchItemResult {
  /** Id of the input item this file was made from. */
  id: string;
  blob: Blob;
  fileName: string;
}

/** Results of a many-in, many-out tool: one download per item, plus a ZIP of all of them. */
export interface BatchOutput {
  files: Map<string, OutputFile>;
  /** Only present when there is more than one file. */
  archive?: OutputFile;
}

export async function createBatchOutput(results: BatchItemResult[], archiveName: string): Promise<BatchOutput> {
  const files = new Map(results.map((result) => [result.id, createOutputFile(result.blob, result.fileName)]));
  if (results.length < 2) return { files };

  const names = uniqueFileNames(results.map((result) => result.fileName));
  const entries = await Promise.all(
    results.map(async (result, index) => ({ name: names[index], data: new Uint8Array(await result.blob.arrayBuffer()) })),
  );
  return { files, archive: createOutputFile(createZip(entries), archiveName, "application/zip") };
}

export function releaseBatchOutput(output: BatchOutput) {
  output.files.forEach(releaseOutputFile);
  if (output.archive) releaseOutputFile(output.archive);
}

/** The single file to hand over when the run finishes: the ZIP, or the only file. */
export const primaryDownload = (output: BatchOutput): OutputFile | undefined =>
  output.archive ?? output.files.values().next().value;
