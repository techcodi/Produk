"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { triggerDownload } from "@/lib/download";
import { toPdfFileName } from "../core/file-validation";
import { buildPdf, PageBuildError } from "../core/pdf-builder";
import type { ImageItem, PdfSettings } from "../types";

export type ExportState =
  | { status: "idle" }
  | { status: "processing"; completed: number; total: number }
  | { status: "success"; url: string; fileName: string; size: number; pageCount: number }
  | { status: "error"; message: string };

function describeError(error: unknown): string {
  if (error instanceof PageBuildError) {
    return `${error.message}. Try removing it or re-saving it as JPG.`;
  }
  if (error instanceof RangeError || (error instanceof Error && /memory/i.test(error.message))) {
    return "Your device ran out of memory. Try the “Small” quality setting or fewer images.";
  }
  return "Something went wrong while creating the PDF. Please try again.";
}

export function usePdfExport() {
  const [state, setState] = useState<ExportState>({ status: "idle" });
  const controllerRef = useRef<AbortController | null>(null);
  const resultUrlRef = useRef<string | null>(null);

  const releaseResult = useCallback(() => {
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    resultUrlRef.current = null;
  }, []);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
      releaseResult();
    },
    [releaseResult],
  );

  const start = useCallback(
    async (items: ImageItem[], settings: PdfSettings) => {
      controllerRef.current?.abort();
      releaseResult();

      const controller = new AbortController();
      controllerRef.current = controller;
      const isCurrent = () => controllerRef.current === controller && !controller.signal.aborted;

      setState({ status: "processing", completed: 0, total: items.length });

      try {
        const bytes = await buildPdf(
          items.map(({ name, source, rotation }) => ({ name, source, rotation })),
          settings,
          {
            signal: controller.signal,
            onProgress: (completed, total) => {
              if (isCurrent()) setState({ status: "processing", completed, total });
            },
          },
        );
        if (!isCurrent()) return;

        const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const fileName = toPdfFileName(settings.fileName);
        resultUrlRef.current = url;

        setState({ status: "success", url, fileName, size: blob.size, pageCount: items.length });
        triggerDownload(url, fileName);
      } catch (error) {
        if (!isCurrent()) return;
        console.error(error);
        setState({ status: "error", message: describeError(error) });
      }
    },
    [releaseResult],
  );

  /** Cancels any in-flight export and discards the previous result. */
  const reset = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    releaseResult();
    setState((prev) => (prev.status === "idle" ? prev : { status: "idle" }));
  }, [releaseResult]);

  return { state, start, reset };
}
