import type { DocMark, DocNode } from "./types";

export const hasMark = (node: DocNode, type: string) => node.marks?.some((mark) => mark.type === type) ?? false;

export const markAttr = (node: DocNode, type: string, attr: string): unknown =>
  node.marks?.find((mark: DocMark) => mark.type === type)?.attrs?.[attr];

export const attr = <T>(node: DocNode, name: string, fallback: T): T => {
  const value = node.attrs?.[name];
  return value === undefined || value === null ? fallback : (value as T);
};

/** Plain text of a node and its descendants (hard breaks become newlines). */
export function textOf(node: DocNode): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  return (node.content ?? []).map(textOf).join("");
}

/** Every distinct image `src` in the document, in order. */
export function collectImageSources(doc: DocNode): string[] {
  const sources = new Set<string>();
  const visit = (node: DocNode) => {
    if (node.type === "image" && typeof node.attrs?.src === "string") sources.add(node.attrs.src);
    node.content?.forEach(visit);
  };
  visit(doc);
  return [...sources];
}

/** True when the document has no text and no images. */
export function isDocumentEmpty(doc: DocNode): boolean {
  return textOf(doc).trim() === "" && collectImageSources(doc).length === 0;
}

/**
 * Lays out a table's cells on a grid, resolving colspan/rowspan. Returns, per
 * row, an array with one slot per column: the cell that starts there, or
 * `null` where a span from another cell covers it.
 */
export function tableGrid(table: DocNode): { grid: (DocNode | null)[][]; columns: number } {
  const rows = table.content ?? [];
  const grid: (DocNode | null | undefined)[][] = rows.map(() => []);

  rows.forEach((row, r) => {
    let c = 0;
    for (const cell of row.content ?? []) {
      while (grid[r][c] !== undefined) c++;
      const colspan = Math.max(1, attr(cell, "colspan", 1));
      const rowspan = Math.max(1, attr(cell, "rowspan", 1));
      for (let dr = 0; dr < rowspan && r + dr < rows.length; dr++) {
        for (let dc = 0; dc < colspan; dc++) grid[r + dr][c + dc] = dr === 0 && dc === 0 ? cell : null;
      }
      c += colspan;
    }
  });

  const columns = Math.max(1, ...grid.map((row) => row.length));
  return {
    columns,
    // Short rows (malformed tables) are padded with empty slots.
    grid: grid.map((row) => Array.from({ length: columns }, (_, c) => row[c] ?? null)),
  };
}
