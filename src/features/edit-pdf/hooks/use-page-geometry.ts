"use client";

import { useEffect, useState } from "react";
import type { PDFDocumentProxy } from "@/lib/pdf/render";
import type { PageGeometry } from "../types";

/** Size and user-space → viewport matrix of every page, needed for layout before pages render. */
export function usePageGeometry(doc: PDFDocumentProxy | null) {
  const [loaded, setLoaded] = useState<{ doc: PDFDocumentProxy; pages: PageGeometry[] } | null>(null);

  useEffect(() => {
    if (!doc) return;
    let cancelled = false;
    (async () => {
      const pages: PageGeometry[] = [];
      for (let number = 1; number <= doc.numPages; number++) {
        const viewport = (await doc.getPage(number)).getViewport({ scale: 1 });
        pages.push({ width: viewport.width, height: viewport.height, transform: viewport.transform });
      }
      if (!cancelled) setLoaded({ doc, pages });
    })().catch((error) => console.error(error));
    return () => {
      cancelled = true;
    };
  }, [doc]);

  return loaded && loaded.doc === doc ? loaded.pages : null;
}
