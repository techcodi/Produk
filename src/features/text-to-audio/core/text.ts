import type { TextChunk } from "../types";

/** Piper slows down and drifts on very long inputs; sentences stay well under this. */
export const MAX_CHUNK_LENGTH = 300;

const hasSpeakableText = (text: string) => /[\p{L}\p{N}]/u.test(text);

/** Tidies pasted text: unifies line endings and quotes, drops control characters and emoji. */
export function normalizeText(input: string): string {
  return input
    .replace(/\r\n?/g, "\n")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, ", ")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/[^\S\n]+/g, " ")
    .replace(/[\u0000-\u0009\u000b-\u001f]/g, "")
    .trim();
}

/** Breaks an over-long sentence at clause punctuation, then at spaces, keeping each piece under `max`. */
function splitLong(sentence: string, max: number): string[] {
  if (sentence.length <= max) return [sentence];
  const pieces: string[] = [];
  let rest = sentence;
  while (rest.length > max) {
    const window = rest.slice(0, max);
    const clause = Math.max(window.lastIndexOf(", "), window.lastIndexOf("; "), window.lastIndexOf(": "));
    const space = window.lastIndexOf(" ");
    const cut = clause > max / 3 ? clause + 1 : space > 0 ? space : max;
    pieces.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) pieces.push(rest);
  return pieces;
}

/**
 * Splits text into sentence-sized chunks so each one synthesizes quickly and
 * progress can be shown. Paragraph breaks (blank lines, or single line breaks
 * as in lists and pasted notes) get a longer pause.
 */
export function splitIntoChunks(input: string, max = MAX_CHUNK_LENGTH): TextChunk[] {
  const chunks: TextChunk[] = [];
  for (const paragraph of normalizeText(input).split(/\n+/)) {
    const sentences = paragraph.match(/[^.!?…]+(?:[.!?…]+["')\]]*|$)/g) ?? [];
    const pieces = sentences.flatMap((sentence) => splitLong(sentence.trim(), max)).filter(hasSpeakableText);
    pieces.forEach((text, index) =>
      chunks.push({ text, pause: index === pieces.length - 1 ? "paragraph" : "sentence" }),
    );
  }
  return chunks;
}

/** Rough reading time at 1× speed, for "about N minutes" hints: ~15 characters per second. */
export const estimateSeconds = (text: string, speed = 1) => normalizeText(text).length / 15 / speed;
