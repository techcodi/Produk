"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { RejectedFile } from "@/lib/files";
import { createId } from "@/lib/id";
import { PdfReadError, readPdf } from "@/lib/pdf/documents";
import { partitionFiles } from "../core/file-validation";
import type { PdfFile } from "../types";

type Action =
  | { type: "add"; items: PdfFile[] }
  | { type: "remove"; id: string }
  | { type: "move"; activeId: string; overId: string }
  | { type: "sortByName" }
  | { type: "reverse" }
  | { type: "clear" };

const nameCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

function reducer(items: PdfFile[], action: Action): PdfFile[] {
  switch (action.type) {
    case "add":
      return [...items, ...action.items];
    case "remove":
      return items.filter((item) => item.id !== action.id);
    case "move": {
      const from = items.findIndex((item) => item.id === action.activeId);
      const to = items.findIndex((item) => item.id === action.overId);
      if (from === -1 || to === -1 || from === to) return items;
      const next = [...items];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    }
    case "sortByName":
      return [...items].sort((a, b) => nameCollator.compare(a.name, b.name));
    case "reverse":
      return [...items].reverse();
    case "clear":
      return [];
  }
}

export function usePdfFiles() {
  const [items, dispatch] = useReducer(reducer, []);
  const [pendingCount, setPendingCount] = useState(0);
  // Includes slots reserved by in-flight imports so rapid drops respect MAX_FILES.
  const countRef = useRef(0);

  useEffect(() => {
    if (pendingCount === 0) countRef.current = items.length;
  }, [items, pendingCount]);

  const addFiles = useCallback(async (files: File[]): Promise<RejectedFile[]> => {
    const { accepted, rejected } = partitionFiles(files, countRef.current);
    if (accepted.length === 0) return rejected;

    countRef.current += accepted.length;
    setPendingCount((n) => n + accepted.length);

    const created: PdfFile[] = [];
    for (const file of accepted) {
      try {
        // Parsing up front surfaces broken or locked files now rather than at merge time.
        const doc = await readPdf(file);
        created.push({ id: createId(), name: file.name, size: file.size, file, pageCount: doc.getPageCount() });
      } catch (error) {
        countRef.current -= 1;
        rejected.push({ file, reason: error instanceof PdfReadError ? error.message : "Could not be read" });
      } finally {
        setPendingCount((n) => n - 1);
      }
    }

    if (created.length > 0) dispatch({ type: "add", items: created });
    return rejected;
  }, []);

  return {
    items,
    pendingCount,
    addFiles,
    remove: useCallback((id: string) => dispatch({ type: "remove", id }), []),
    clear: useCallback(() => dispatch({ type: "clear" }), []),
    move: useCallback((activeId: string, overId: string) => dispatch({ type: "move", activeId, overId }), []),
    sortByName: useCallback(() => dispatch({ type: "sortByName" }), []),
    reverse: useCallback(() => dispatch({ type: "reverse" }), []),
  };
}
