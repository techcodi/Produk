import { partitionFiles as partition, sanitizeFileName } from "@/lib/files";
import { isPdf } from "@/lib/pdf/documents";
import { DEFAULT_FILE_NAME, MAX_FILE_SIZE_BYTES, MAX_FILES } from "../constants";

export function partitionFiles(files: File[], existingCount: number) {
  return partition(files, existingCount, {
    isAccepted: isPdf,
    typeError: "Not a PDF",
    maxFiles: MAX_FILES,
    maxFileSize: MAX_FILE_SIZE_BYTES,
    noun: "files",
  });
}

export const toPdfFileName = (input: string) => sanitizeFileName(input, "pdf", DEFAULT_FILE_NAME);
