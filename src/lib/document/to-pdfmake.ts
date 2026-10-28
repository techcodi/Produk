import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import { DOC_MARGINS_PT, DOC_PAGE_SIZES, PX_TO_PT, type DocFont, type DocNode, type DocumentSettings, type ImageMap } from "./types";
import { attr, hasMark, markAttr, tableGrid, textOf } from "./walk";

/** pdfmake font family names; see loadPdfmake in pdf-export.ts for how they're registered. */
export const PDFMAKE_FONTS: Record<DocFont, string> = {
  sans: "Roboto",
  serif: "Times",
  mono: "Courier",
};

const HEADING_SCALE: Record<number, number> = { 1: 2, 2: 1.6, 3: 1.3, 4: 1.15, 5: 1, 6: 0.9 };
const LINK_COLOR = "#2f4fd8";
const MUTED_COLOR = "#555b66";
const BORDER_COLOR = "#c9ccd3";

type Inline = Exclude<Content, string> & { text: string };

interface Context {
  images: ImageMap;
  /** Usable width between the margins, in points. */
  contentWidth: number;
  fontSize: number;
}

const ALIGNMENTS = new Set(["left", "center", "right", "justify"]);
const alignmentOf = (node: DocNode) => {
  const value = attr<string>(node, "textAlign", "left");
  return (ALIGNMENTS.has(value) ? value : "left") as "left" | "center" | "right" | "justify";
};

function inlines(nodes: DocNode[] | undefined): Inline[] {
  const result: Inline[] = [];
  for (const node of nodes ?? []) {
    if (node.type === "hardBreak") {
      result.push({ text: "\n" });
      continue;
    }
    if (node.type !== "text" || !node.text) continue;

    const run: Inline = { text: node.text };
    if (hasMark(node, "bold")) run.bold = true;
    if (hasMark(node, "italic")) run.italics = true;
    const decoration: ("underline" | "lineThrough")[] = [];
    if (hasMark(node, "underline")) decoration.push("underline");
    if (hasMark(node, "strike")) decoration.push("lineThrough");
    if (hasMark(node, "code")) {
      run.font = PDFMAKE_FONTS.mono;
      run.background = "#f1f2f4";
    }
    const href = markAttr(node, "link", "href");
    if (typeof href === "string" && /^(https?:|mailto:)/i.test(href)) {
      run.link = href;
      run.color = LINK_COLOR;
      if (!decoration.includes("underline")) decoration.push("underline");
    }
    if (decoration.length === 1) run.decoration = decoration[0];
    else if (decoration.length > 1) run.decoration = decoration;
    result.push(run);
  }
  return result;
}

/** pdfmake renders an empty text array as a zero-height line; a space keeps blank paragraphs visible. */
const textOrSpace = (runs: Inline[]) => (runs.length > 0 ? runs : [{ text: " " }]);

function block(node: DocNode, ctx: Context): Content | null {
  switch (node.type) {
    case "paragraph":
      return { text: textOrSpace(inlines(node.content)), alignment: alignmentOf(node), margin: [0, 0, 0, ctx.fontSize * 0.6] };

    case "heading": {
      const level = attr(node, "level", 1);
      const size = ctx.fontSize * (HEADING_SCALE[level] ?? 1);
      return {
        text: textOrSpace(inlines(node.content)),
        alignment: alignmentOf(node),
        fontSize: size,
        bold: true,
        margin: [0, size * 0.5, 0, size * 0.35],
      };
    }

    case "bulletList":
    case "orderedList": {
      const items = (node.content ?? []).map((item) => stack(item.content, ctx, ctx.fontSize * 0.25));
      return node.type === "bulletList"
        ? { ul: items, margin: [0, 0, 0, ctx.fontSize * 0.6] }
        : { ol: items, start: attr(node, "start", 1), margin: [0, 0, 0, ctx.fontSize * 0.6] };
    }

    case "blockquote":
      return {
        table: { widths: ["*"], body: [[stack(node.content, ctx)]] },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: (i: number) => (i === 0 ? 2.5 : 0),
          vLineColor: () => BORDER_COLOR,
          paddingLeft: () => 12,
        },
        color: MUTED_COLOR,
        italics: true,
        margin: [0, 0, 0, ctx.fontSize * 0.6],
      };

    case "codeBlock":
      return {
        table: { widths: ["*"], body: [[{ text: textOf(node) || " ", font: PDFMAKE_FONTS.mono, fontSize: ctx.fontSize * 0.85, preserveLeadingSpaces: true }]] },
        layout: { hLineWidth: () => 0, vLineWidth: () => 0, fillColor: () => "#f4f5f7", paddingTop: () => 6, paddingBottom: () => 6 },
        margin: [0, 0, 0, ctx.fontSize * 0.6],
      };

    case "horizontalRule":
      return {
        canvas: [{ type: "line", x1: 0, y1: 0, x2: ctx.contentWidth, y2: 0, lineWidth: 0.75, lineColor: BORDER_COLOR }],
        margin: [0, ctx.fontSize * 0.4, 0, ctx.fontSize],
      };

    case "image":
      return image(node, ctx);

    case "table":
      return table(node, ctx);

    default:
      // Unknown containers: keep their content rather than dropping it.
      return node.content ? stack(node.content, ctx) : null;
  }
}

function image(node: DocNode, ctx: Context): Content | null {
  const src = attr<string>(node, "src", "");
  const prepared = ctx.images.get(src);
  if (!prepared) return null;

  // Respect a width set in the editor, else the natural size; never wider than the page.
  const requested = Number(attr<number | string>(node, "width", 0)) || prepared.width;
  const width = Math.min(requested * PX_TO_PT, ctx.contentWidth);
  return { image: prepared.dataUrl, width, alignment: "center", margin: [0, 0, 0, ctx.fontSize * 0.6] };
}

function table(node: DocNode, ctx: Context): Content {
  const { grid, columns } = tableGrid(node);
  const rows = node.content ?? [];
  const headerRows = rows[0]?.content?.every((cell) => cell.type === "tableHeader") ? 1 : 0;

  const body = grid.map((row) =>
    row.map((cell) => {
      // pdfmake needs a placeholder object in every slot a span covers.
      if (!cell) return {};
      const content: Content = { ...(stack(cell.content, ctx, 0) as object) } as Content;
      const result = content as Content & { colSpan?: number; rowSpan?: number; bold?: boolean; fillColor?: string };
      const colspan = attr(cell, "colspan", 1);
      const rowspan = attr(cell, "rowspan", 1);
      if (colspan > 1) result.colSpan = colspan;
      if (rowspan > 1) result.rowSpan = rowspan;
      if (cell.type === "tableHeader") {
        result.bold = true;
        result.fillColor = "#f4f5f7";
      }
      return result;
    }),
  );

  return {
    table: { headerRows, widths: Array.from({ length: columns }, () => "*"), body },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => BORDER_COLOR,
      vLineColor: () => BORDER_COLOR,
      paddingTop: () => 4,
      paddingBottom: () => 4,
    },
    margin: [0, 0, 0, ctx.fontSize * 0.6],
  };
}

/** A column of blocks. Inside list items and cells the last block's bottom margin is dropped. */
function stack(nodes: DocNode[] | undefined, ctx: Context, trailingGap?: number): Content {
  const blocks = (nodes ?? []).map((child) => block(child, ctx)).filter((c): c is Content => c !== null);
  if (trailingGap !== undefined && blocks.length > 0) {
    const last = blocks[blocks.length - 1];
    if (typeof last === "object" && "margin" in last && Array.isArray(last.margin)) {
      const [l, t, r] = last.margin as number[];
      blocks[blocks.length - 1] = { ...last, margin: [l, t, r, trailingGap] } as Content;
    }
  }
  return { stack: blocks };
}

/** Pure function: editor JSON → pdfmake document definition. */
export function toPdfmake(doc: DocNode, settings: Omit<DocumentSettings, "fileName">, images: ImageMap, title: string): TDocumentDefinitions {
  const page = DOC_PAGE_SIZES[settings.pageSize];
  const margin = DOC_MARGINS_PT[settings.margin];
  const ctx: Context = { images, contentWidth: page.width - margin * 2, fontSize: settings.fontSize };

  return {
    info: { title, creator: "ProDuk", producer: "ProDuk" },
    pageSize: { width: page.width, height: page.height },
    pageMargins: margin,
    defaultStyle: { font: PDFMAKE_FONTS[settings.font], fontSize: settings.fontSize, lineHeight: 1.25 },
    content: (doc.content ?? []).map((node) => block(node, ctx)).filter((c): c is Content => c !== null),
  };
}
