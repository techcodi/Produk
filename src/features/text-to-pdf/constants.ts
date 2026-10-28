import type { DocumentSettings } from "@/lib/document/types";

/** Plain text beyond this is impractical to edit in the browser. */
export const MAX_TEXT_FILE_BYTES = 5 * 1024 * 1024;

export const DEFAULT_SETTINGS: DocumentSettings = {
  pageSize: "a4",
  margin: "normal",
  font: "sans",
  fontSize: 11,
  fileName: "produk-document",
};
