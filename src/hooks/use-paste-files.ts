"use client";

import { useEffect, useRef } from "react";

/** Lets users paste images from the clipboard (e.g. screenshots) anywhere on the page. */
export function usePasteFiles(onFiles: (files: File[]) => void) {
  const handlerRef = useRef(onFiles);

  useEffect(() => {
    handlerRef.current = onFiles;
  }, [onFiles]);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable='true']")) return;

      const files = Array.from(event.clipboardData?.files ?? []);
      if (files.length === 0) return;
      event.preventDefault();
      handlerRef.current(files);
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);
}
