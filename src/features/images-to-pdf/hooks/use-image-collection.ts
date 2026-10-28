"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { createId } from "@/lib/id";
import { convertHeicToJpeg, isHeic } from "@/lib/images";
import { partitionFiles } from "../core/file-validation";
import type { ImageItem, RejectedFile, Rotation } from "../types";

type Action =
  | { type: "add"; items: ImageItem[] }
  | { type: "remove"; id: string }
  | { type: "rotate"; id: string; direction: 1 | -1 }
  | { type: "move"; activeId: string; overId: string }
  | { type: "sortByName" }
  | { type: "reverse" }
  | { type: "clear" };

const nameCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

function reducer(items: ImageItem[], action: Action): ImageItem[] {
  switch (action.type) {
    case "add":
      return [...items, ...action.items];
    case "remove":
      return items.filter((item) => item.id !== action.id);
    case "rotate":
      return items.map((item) =>
        item.id === action.id
          ? { ...item, rotation: (((item.rotation + action.direction * 90) % 360) + 360) % 360 as Rotation }
          : item,
      );
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

async function toImageItem(file: File): Promise<ImageItem> {
  const source = isHeic(file) ? await convertHeicToJpeg(file) : file;
  return {
    id: createId(),
    name: file.name,
    size: file.size,
    source,
    previewUrl: URL.createObjectURL(source),
    rotation: 0,
  };
}

export function useImageCollection() {
  const [items, dispatch] = useReducer(reducer, []);
  const [pendingCount, setPendingCount] = useState(0);

  // Tracks live object URLs so removed previews are revoked (no memory leaks).
  // The Set is mutated in place so the unmount cleanup always sees the latest.
  const liveUrls = useRef(new Set<string>());
  const countRef = useRef(0);

  useEffect(() => {
    const current = new Set(items.map((item) => item.previewUrl));
    for (const url of liveUrls.current) {
      if (!current.has(url)) {
        URL.revokeObjectURL(url);
        liveUrls.current.delete(url);
      }
    }
    current.forEach((url) => liveUrls.current.add(url));
    // While an import is in flight countRef also holds its reserved slots.
    if (pendingCount === 0) countRef.current = items.length;
  }, [items, pendingCount]);

  useEffect(() => {
    const urls = liveUrls.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  const addFiles = useCallback(async (files: File[]): Promise<RejectedFile[]> => {
    const { accepted, rejected } = partitionFiles(files, countRef.current);
    if (accepted.length === 0) return rejected;

    // Reserve slots up front so rapid consecutive drops respect MAX_FILES.
    countRef.current += accepted.length;
    setPendingCount((n) => n + accepted.length);

    const created: ImageItem[] = [];
    for (const file of accepted) {
      try {
        created.push(await toImageItem(file));
      } catch {
        countRef.current -= 1;
        rejected.push({ file, reason: isHeic(file) ? "This HEIC photo could not be converted" : "Could not be read" });
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
    rotate: useCallback((id: string, direction: 1 | -1 = 1) => dispatch({ type: "rotate", id, direction }), []),
    move: useCallback((activeId: string, overId: string) => dispatch({ type: "move", activeId, overId }), []),
    sortByName: useCallback(() => dispatch({ type: "sortByName" }), []),
    reverse: useCallback(() => dispatch({ type: "reverse" }), []),
    clear: useCallback(() => dispatch({ type: "clear" }), []),
  };
}

export type ImageCollection = ReturnType<typeof useImageCollection>;
