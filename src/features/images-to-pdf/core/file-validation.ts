import { partitionFiles as partition, sanitizeFileName } from "@/lib/files";
import { isSupportedImage } from "@/lib/images";
import { MAX_FILE_SIZE_BYTES, MAX_FILES } from "../constants";

export function partitionFiles(files: File[], existingCount: number) {
  return partition(files, existingCount, {
    isAccepted: isSupportedImage,
    typeError: "Not a supported image type",
    maxFiles: MAX_FILES,
    maxFileSize: MAX_FILE_SIZE_BYTES,
    noun: "images",
  });
}

/** Turns user input into a safe `name.pdf`. */
export const toPdfFileName = (input: string) => sanitizeFileName(input, "pdf", "produk-images");
