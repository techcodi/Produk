import type { DocumentSettings } from "@/lib/document/types";

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

export const DEFAULT_SETTINGS: DocumentSettings = {
  pageSize: "a4",
  margin: "normal",
  font: "sans",
  fontSize: 11,
  fileName: "document",
};
