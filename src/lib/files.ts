import { formatBytes } from "./format";

export interface RejectedFile {
  file: File;
  reason: string;
}

export const extensionOf = (name: string) => {
  const dot = name.lastIndexOf(".");
  return dot <= 0 ? "" : name.slice(dot).toLowerCase();
};

/** `"holiday.photo.JPG"` → `"holiday.photo"`. */
export const stripExtension = (name: string) => {
  const dot = name.lastIndexOf(".");
  return dot <= 0 ? name : name.slice(0, dot);
};

/** Turns user input into a safe `name.ext`, falling back when nothing usable is left. */
export function sanitizeFileName(input: string, extension: string, fallback: string): string {
  const ext = extension.replace(/^\./, "");
  const base = input
    .trim()
    .replace(new RegExp(`\\.${ext}$`, "i"), "")
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return `${base || fallback}.${ext}`;
}

/** Appends " (2)", " (3)"… so every name in a ZIP archive is unique. */
export function uniqueFileNames(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((name) => {
    const key = name.toLowerCase();
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    if (count === 1) return name;
    const ext = extensionOf(name);
    const candidate = `${stripExtension(name)} (${count})${ext}`;
    seen.set(candidate.toLowerCase(), 1);
    return candidate;
  });
}

interface PartitionOptions {
  isAccepted: (file: File) => boolean;
  /** Shown when `isAccepted` fails, e.g. "Not a PDF". */
  typeError: string;
  maxFiles: number;
  maxFileSize: number;
  /** Plural noun for the limit message, e.g. "images". */
  noun: string;
}

export function partitionFiles(files: File[], existingCount: number, options: PartitionOptions) {
  const accepted: File[] = [];
  const rejected: RejectedFile[] = [];

  for (const file of files) {
    if (!options.isAccepted(file)) {
      rejected.push({ file, reason: options.typeError });
    } else if (file.size > options.maxFileSize) {
      rejected.push({ file, reason: `Larger than ${formatBytes(options.maxFileSize)}` });
    } else if (existingCount + accepted.length >= options.maxFiles) {
      rejected.push({ file, reason: `Limit of ${options.maxFiles} ${options.noun} reached` });
    } else {
      accepted.push(file);
    }
  }

  return { accepted, rejected };
}
