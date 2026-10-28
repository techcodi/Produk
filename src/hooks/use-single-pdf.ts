"use client";

import { useCallback, useState } from "react";
import { partitionFiles, type RejectedFile } from "@/lib/files";
import { isPdf } from "@/lib/pdf/documents";
import { usePdfDocument } from "./use-pdf-document";

/** State for tools that work on one PDF at a time: the chosen file plus its PDF.js document. */
export function useSinglePdf({ maxFileSize }: { maxFileSize: number }) {
  const [file, setFile] = useState<File | null>(null);
  const [rejected, setRejected] = useState<RejectedFile[]>([]);
  const document = usePdfDocument(file);

  /** Takes the first acceptable PDF; returns whether one was chosen. */
  const select = useCallback(
    (files: File[]) => {
      const { accepted, rejected } = partitionFiles(files.slice(0, 1), 0, {
        isAccepted: isPdf,
        typeError: "Not a PDF",
        maxFiles: 1,
        maxFileSize,
        noun: "files",
      });
      setRejected(rejected);
      if (accepted[0]) setFile(accepted[0]);
      return accepted.length > 0;
    },
    [maxFileSize],
  );

  return {
    file,
    document,
    rejected,
    select,
    clear: useCallback(() => setFile(null), []),
    dismissRejected: useCallback(() => setRejected([]), []),
  };
}
