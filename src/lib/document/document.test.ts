import { describe, expect, it } from "vitest";
import { textToHtml } from "./import";
import { buildDocx, packDocx } from "./to-docx";
import { PDFMAKE_FONTS, toPdfmake } from "./to-pdfmake";
import type { DocNode, DocumentSettings, PreparedImage } from "./types";
import { collectImageSources, isDocumentEmpty, tableGrid, textOf } from "./walk";

const settings: Omit<DocumentSettings, "fileName"> = { pageSize: "a4", margin: "normal", font: "sans", fontSize: 11 };

const text = (value: string, ...marks: string[]): DocNode => ({ type: "text", text: value, marks: marks.map((type) => ({ type })) });
const paragraph = (...content: DocNode[]): DocNode => ({ type: "paragraph", content });
const cell = (value: string, attrs: Record<string, unknown> = {}, type = "tableCell"): DocNode => ({
  type,
  attrs: { colspan: 1, rowspan: 1, ...attrs },
  content: [paragraph(text(value))],
});

const doc: DocNode = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 1, textAlign: "center" }, content: [text("Title")] },
    paragraph(text("Plain "), text("bold", "bold"), text(" and "), text("both", "underline", "strike")),
    paragraph(),
    { type: "bulletList", content: [{ type: "listItem", content: [paragraph(text("One"))] }] },
    { type: "orderedList", attrs: { start: 3 }, content: [{ type: "listItem", content: [paragraph(text("Three"))] }] },
    { type: "image", attrs: { src: "data:image/png;base64,AAA" } },
    {
      type: "table",
      content: [
        { type: "tableRow", content: [cell("H1", {}, "tableHeader"), cell("H2", {}, "tableHeader")] },
        { type: "tableRow", content: [cell("Wide", { colspan: 2 })] },
      ],
    },
  ],
};

describe("walk helpers", () => {
  it("collects text and images", () => {
    expect(textOf(doc)).toContain("Plain bold and both");
    expect(collectImageSources(doc)).toEqual(["data:image/png;base64,AAA"]);
    expect(isDocumentEmpty({ type: "doc", content: [paragraph()] })).toBe(true);
    expect(isDocumentEmpty(doc)).toBe(false);
  });

  it("lays out spanned table cells on a grid", () => {
    const table: DocNode = {
      type: "table",
      content: [
        { type: "tableRow", content: [cell("A", { rowspan: 2 }), cell("B")] },
        { type: "tableRow", content: [cell("C")] },
      ],
    };
    const { grid, columns } = tableGrid(table);
    expect(columns).toBe(2);
    expect(grid.map((row) => row.map((c) => (c ? textOf(c) : null)))).toEqual([
      ["A", "B"],
      [null, "C"],
    ]);
  });
});

describe("toPdfmake", () => {
  const image: PreparedImage = { dataUrl: "data:image/png;base64,AAA", mime: "image/png", width: 2000, height: 1000 };
  const definition = toPdfmake(doc, settings, new Map([[image.dataUrl, image]]), "My doc");
  const content = definition.content as unknown as Record<string, unknown>[];

  it("sets page, margins, font and metadata", () => {
    expect(definition.pageMargins).toBe(72);
    expect(definition.defaultStyle).toMatchObject({ font: PDFMAKE_FONTS.sans, fontSize: 11 });
    expect(definition.info?.title).toBe("My doc");
  });

  it("maps headings, marks and empty paragraphs", () => {
    expect(content[0]).toMatchObject({ bold: true, alignment: "center", fontSize: 22 });
    const runs = content[1].text as Record<string, unknown>[];
    expect(runs[1]).toEqual({ text: "bold", bold: true });
    expect(runs[3]).toMatchObject({ decoration: ["underline", "lineThrough"] });
    expect(content[2].text).toEqual([{ text: " " }]);
  });

  it("maps lists with their start number", () => {
    expect(content[3]).toHaveProperty("ul");
    expect(content[4]).toMatchObject({ start: 3 });
  });

  it("fits wide images inside the margins", () => {
    expect(content[5]).toMatchObject({ image: image.dataUrl, width: 595.28 - 144 });
  });

  it("builds tables with header rows and span placeholders", () => {
    const table = content[6].table as { headerRows: number; body: unknown[][] };
    expect(table.headerRows).toBe(1);
    expect(table.body[1][0]).toMatchObject({ colSpan: 2 });
    expect(table.body[1][1]).toEqual({});
  });

  it("drops images that could not be prepared", () => {
    const withoutImages = toPdfmake(doc, settings, new Map(), "x").content as unknown[];
    expect(withoutImages).toHaveLength(6);
  });
});

describe("textToHtml", () => {
  it("escapes and keeps one paragraph per line", () => {
    expect(textToHtml("a < b\r\n\nc & d")).toBe("<p>a &lt; b</p><p></p><p>c &amp; d</p>");
  });
});

describe("buildDocx", () => {
  it("produces a Word file containing the text", async () => {
    const blob = await packDocx(buildDocx("<h1>Report</h1><p>The <b>results</b> are in.</p><ul><li>One</li></ul>", settings, new Map(), "Report"));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(String.fromCharCode(bytes[0], bytes[1])).toBe("PK");
    expect(bytes.length).toBeGreaterThan(2000);
  });
});
