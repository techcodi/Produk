"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { partitionFiles, type RejectedFile } from "@/lib/files";
import { createId } from "@/lib/id";
import { convertHeicToJpeg, isHeic, isSupportedImage, readImageSize, type Size } from "@/lib/images";

export interface ImageFile {
  id: string;
  name: string;
  /** Original file size in bytes (before any conversion). */
  size: number;
  /** MIME type of the original file ("" when the browser didn't report one). */
  type: string;
  /** The original upload, untouched. */
  file: File;
  /** Browser-decodable image data (HEIC is converted to JPEG on import). */
  source: Blob;
  previewUrl: string;
  /** Displayed size, with EXIF orientation applied. */
  dimensions: Size;
}

interface ImageFilesOptions {
  maxFiles: number;
  maxFileSize: number;
}

async function toImageFile(file: File): Promise<ImageFile> {
  const source = isHeic(file) ? await convertHeicToJpeg(file) : file;
  const previewUrl = URL.createObjectURL(source);
  try {
    const dimensions = await readImageSize(previewUrl);
    return { id: createId(), name: file.name, size: file.size, type: file.type, file, source, previewUrl, dimensions };
  } catch (error) {
    URL.revokeObjectURL(previewUrl);
    throw error;
  }
}

/** An unordered list of imported images with preview URLs, for batch image tools. */
export function useImageFiles({ maxFiles, maxFileSize }: ImageFilesOptions) {
  const [items, setItems] = useState<ImageFile[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  // Same bookkeeping as the Images to PDF collection: revoke URLs of removed
  // items, and reserve slots for in-flight imports so limits hold under rapid drops.
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
    if (pendingCount === 0) countRef.current = items.length;
  }, [items, pendingCount]);

  useEffect(() => {
    const urls = liveUrls.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  const addFiles = useCallback(
    async (files: File[]): Promise<RejectedFile[]> => {
      const { accepted, rejected } = partitionFiles(files, countRef.current, {
        isAccepted: isSupportedImage,
        typeError: "Not a supported image type",
        maxFiles,
        maxFileSize,
        noun: "images",
      });
      if (accepted.length === 0) return rejected;

      countRef.current += accepted.length;
      setPendingCount((n) => n + accepted.length);

      const created: ImageFile[] = [];
      for (const file of accepted) {
        try {
          created.push(await toImageFile(file));
        } catch {
          countRef.current -= 1;
          rejected.push({ file, reason: isHeic(file) ? "This HEIC photo could not be converted" : "Could not be read" });
        } finally {
          setPendingCount((n) => n - 1);
        }
      }

      if (created.length > 0) setItems((prev) => [...prev, ...created]);
      return rejected;
    },
    [maxFiles, maxFileSize],
  );

  return {
    items,
    pendingCount,
    addFiles,
    remove: useCallback((id: string) => setItems((prev) => prev.filter((item) => item.id !== id)), []),
    clear: useCallback(() => setItems([]), []),
  };
}
