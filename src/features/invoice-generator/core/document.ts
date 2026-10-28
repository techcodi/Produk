import type { Content, CustomTableLayout, TableCell, TDocumentDefinitions } from "pdfmake/interfaces";
import { sanitizeFileName } from "@/lib/files";
import { PAGE_SIZES } from "../constants";
import type { InvoiceData, InvoiceDraft, InvoiceStyle, InvoiceTotals, Party, TemplateId } from "../types";
import { readableOn, tint } from "@/lib/color";
import { formatDate, formatMoney, formatQuantity } from "./format";
import { computeTotals, lineTotal, parseAmount } from "./totals";

const INK = "#111827";
const MUTED = "#6b7280";
const LINE = "#e5e7eb";
const MARGIN = 48;

interface Ctx {
  data: InvoiceData;
  style: InvoiceStyle;
  totals: InvoiceTotals;
  accent: string;
  onAccent: string;
  soft: string;
  /** Usable width between the page margins, in points. */
  width: number;
  money: (value: number) => string;
}

/* ───────────────────────── shared building blocks ───────────────────────── */

const label = (text: string, color = MUTED): Content => ({
  text: text.toUpperCase(),
  fontSize: 7.5,
  bold: true,
  color,
  characterSpacing: 0.8,
  margin: [0, 0, 0, 4],
});

const hasParty = (party: Party) => Boolean(party.name.trim() || party.details.trim());

function partyBlock(heading: string, party: Party, options: { color?: string; alignment?: "left" | "right" } = {}): Content {
  if (!hasParty(party)) return { text: "" };
  const color = options.color ?? INK;
  return {
    alignment: options.alignment,
    stack: [
      label(heading, options.color ?? MUTED),
      party.name.trim() ? { text: party.name, bold: true, fontSize: 10.5, color } : "",
      party.details.trim() ? { text: party.details, fontSize: 9, color: options.color ?? MUTED, lineHeight: 1.3 } : "",
    ],
  };
}

function metaRows({ data }: Ctx, withNumber = true): [string, string][] {
  const rows: [string, string][] = [
    ["Number", withNumber ? data.number.trim() : ""],
    ["Issue date", formatDate(data.issueDate)],
    ["Due date", formatDate(data.dueDate)],
  ];
  return rows.filter(([, value]) => value);
}

/** Pass `withNumber: false` when the template already shows the number in its header. */
function metaTable(ctx: Ctx, withNumber = true): Content {
  const rows = metaRows(ctx, withNumber);
  if (rows.length === 0) return { text: "" };
  return {
    layout: "noBorders",
    table: {
      widths: ["*", "auto"],
      body: rows.map(([name, value]) => [
        { text: name, fontSize: 9, color: MUTED, alignment: "right", margin: [0, 1, 8, 1] },
        { text: value, fontSize: 9, bold: true, color: INK, alignment: "right", margin: [0, 1, 0, 1] },
      ]),
    },
  };
}

function logo({ style }: Ctx, fit: [number, number], alignment?: "left" | "center" | "right"): Content | null {
  return style.logo ? { image: style.logo, fit, alignment, margin: [0, 0, 0, 10] } : null;
}

const rule = (width: number, color: string, lineWidth = 1, margin: [number, number] = [16, 16]): Content => ({
  canvas: [{ type: "line", x1: 0, y1: 0, x2: width, y2: 0, lineWidth, lineColor: color }],
  margin: [0, margin[0], 0, margin[1]],
});

const amountDue = (ctx: Ctx, color: string, fontSize = 18): Content => ({
  stack: [
    label(ctx.totals.paid > 0 ? "Balance due" : "Amount due", color === INK ? MUTED : color),
    { text: ctx.money(ctx.totals.balance), fontSize, bold: true, color },
  ],
});

interface TableLook {
  headerFill?: string;
  headerColor: string;
  /** Line under the header row. */
  headerLine?: { color: string; width: number };
  /** Lines above and below the whole table. */
  frame?: { color: string; width: number };
  zebra?: string;
  rowLines?: boolean;
  headerItalic?: boolean;
}

function itemsTable(ctx: Ctx, look: TableLook): Content {
  const items = ctx.data.items.filter((item) => item.description.trim() || parseAmount(item.rate) > 0);
  const filled = Boolean(look.headerFill || look.zebra);
  const head = (text: string, alignment: "left" | "right" = "right"): TableCell => ({
    text: text.toUpperCase(),
    alignment,
    fontSize: 7.5,
    bold: true,
    italics: look.headerItalic,
    characterSpacing: 0.8,
    color: look.headerColor,
  });

  const body: TableCell[][] = [
    [head("Description", "left"), head("Qty"), head("Rate"), head("Amount")],
    ...items.map((item): TableCell[] => [
      { text: item.description, fontSize: 9.5, color: INK },
      { text: formatQuantity(parseAmount(item.quantity)), fontSize: 9.5, alignment: "right", color: MUTED },
      { text: ctx.money(parseAmount(item.rate)), fontSize: 9.5, alignment: "right", color: MUTED, noWrap: true },
      { text: ctx.money(lineTotal(item)), fontSize: 9.5, alignment: "right", color: INK, noWrap: true },
    ]),
  ];

  const lastRow = body.length;
  const layout: CustomTableLayout = {
    hLineWidth: (i) => {
      if (i === 0 || i === lastRow) return look.frame?.width ?? 0;
      if (i === 1) return look.headerLine?.width ?? 0;
      return look.rowLines ? 0.5 : 0;
    },
    vLineWidth: () => 0,
    hLineColor: (i) => {
      if (i === 0 || i === lastRow) return look.frame?.color ?? LINE;
      if (i === 1) return look.headerLine?.color ?? LINE;
      return LINE;
    },
    fillColor: (row) => {
      if (row === 0) return look.headerFill ?? null;
      return look.zebra && row % 2 === 0 ? look.zebra : null;
    },
    paddingLeft: (i) => (i === 0 && !filled ? 0 : 8),
    paddingRight: (i) => (i === 3 && !filled ? 0 : 8),
    paddingTop: () => 7,
    paddingBottom: () => 7,
  };

  return {
    margin: [0, 24, 0, 0],
    layout,
    table: { headerRows: 1, dontBreakRows: true, widths: ["*", 40, 80, 88], body },
  };
}

interface TotalsLook {
  /** Highlight for the final row (total, or balance due when something was paid). */
  finalFill?: string;
  finalColor: string;
  finalRule?: string;
  finalSize?: number;
}

function totalsTable(ctx: Ctx, look: TotalsLook): Content {
  const { data, totals, money } = ctx;
  const rows: [string, string][] = [["Subtotal", money(totals.subtotal)]];
  if (totals.discount > 0) {
    const pct = data.discountType === "percent" ? ` (${formatQuantity(parseAmount(data.discount))}%)` : "";
    rows.push([`Discount${pct}`, `−${money(totals.discount)}`]);
  }
  if (totals.tax > 0) rows.push([`${data.taxLabel.trim() || "Tax"} (${formatQuantity(parseAmount(data.taxRate))}%)`, money(totals.tax)]);
  if (totals.shipping > 0) rows.push(["Shipping", money(totals.shipping)]);
  rows.push(["Total", money(totals.total)]);
  if (totals.paid > 0) {
    rows.push(["Amount paid", `−${money(totals.paid)}`]);
    rows.push(["Balance due", money(totals.balance)]);
  }

  const finalIndex = rows.length - 1;
  const padX = look.finalFill ? 8 : 0;
  const body: TableCell[][] = rows.map(([name, value], index) => {
    const final = index === finalIndex;
    const cell = { bold: final, fontSize: final ? (look.finalSize ?? 11) : 9.5, color: final ? look.finalColor : MUTED };
    return [
      { ...cell, text: name },
      { ...cell, text: value, alignment: "right", noWrap: true, color: final ? look.finalColor : INK },
    ];
  });

  const layout: CustomTableLayout = {
    hLineWidth: (i) => (i === finalIndex && look.finalRule ? 1 : 0),
    vLineWidth: () => 0,
    hLineColor: () => look.finalRule ?? LINE,
    fillColor: (row) => (row === finalIndex ? (look.finalFill ?? null) : null),
    paddingLeft: () => padX,
    paddingRight: () => padX,
    paddingTop: (row) => (row === finalIndex ? 8 : 3),
    paddingBottom: (row) => (row === finalIndex ? 8 : 3),
  };

  return { layout, table: { widths: ["*", "auto"], body } };
}

/** Payment details on the left, totals on the right, then notes and terms. */
function summary(ctx: Ctx, look: TotalsLook, options: { centeredNotes?: boolean } = {}): Content[] {
  const { data } = ctx;
  const payment: Content = data.paymentDetails.trim()
    ? { stack: [label("Payment details"), { text: data.paymentDetails, fontSize: 9, color: INK, lineHeight: 1.3 }] }
    : { text: "" };

  const notes = (
    [
      ["Notes", data.notes],
      ["Terms & conditions", data.terms],
    ] as const
  )
    .filter(([, text]) => text.trim())
    .map(
      ([heading, text]): Content => ({
        alignment: options.centeredNotes ? "center" : "left",
        stack: [label(heading), { text, fontSize: 9, color: MUTED, lineHeight: 1.3, italics: options.centeredNotes }],
        margin: [0, 16, 0, 0],
      }),
    );

  return [
    {
      margin: [0, 16, 0, 0],
      unbreakable: true,
      columns: [
        { width: "*", stack: [payment], margin: [0, 4, 24, 0] },
        { width: 230, stack: [totalsTable(ctx, look)] },
      ],
    },
    ...(notes.length ? [{ margin: [0, 12, 0, 0], unbreakable: true, stack: notes } as Content] : []),
  ];
}

const nonNull = (items: (Content | null)[]) => items.filter((item): item is Content => item !== null);

/* ───────────────────────────────── templates ──────────────────────────────── */

interface Template {
  content: (ctx: Ctx) => Content[];
  background?: (ctx: Ctx) => TDocumentDefinitions["background"];
  /** Extra left margin, e.g. to clear a decorative stripe. */
  marginLeft?: number;
}

const templates: Record<TemplateId, Template> = {
  classic: {
    content: (ctx) => [
      {
        columns: [
          {
            width: "*",
            stack: nonNull([
              logo(ctx, [140, 56]),
              ctx.data.from.name.trim() ? { text: ctx.data.from.name, bold: true, fontSize: 13, color: INK } : null,
              ctx.data.from.details.trim() ? { text: ctx.data.from.details, fontSize: 9, color: MUTED, lineHeight: 1.3 } : null,
            ]),
          },
          {
            width: "auto",
            stack: [{ text: ctx.data.title, fontSize: 26, bold: true, color: ctx.accent, alignment: "right" }],
          },
        ],
      },
      rule(ctx.width, ctx.accent, 1.5, [18, 18]),
      {
        columns: [
          { width: "*", stack: [partyBlock("Bill to", ctx.data.billTo)] },
          { width: "auto", stack: [metaTable(ctx)] },
        ],
      },
      itemsTable(ctx, { headerColor: ctx.accent, headerLine: { color: ctx.accent, width: 1.2 }, rowLines: true }),
      ...summary(ctx, { finalColor: ctx.accent, finalRule: ctx.accent, finalSize: 12 }),
    ],
  },

  modern: {
    content: (ctx) => [
      {
        layout: "noBorders",
        table: {
          widths: ["*", "auto"],
          body: [
            [
              {
                fillColor: ctx.accent,
                margin: [18, 18, 8, 18],
                stack: nonNull([
                  logo(ctx, [130, 50]),
                  { text: ctx.data.title, fontSize: 24, bold: true, color: ctx.onAccent },
                  ctx.data.number.trim() ? { text: ctx.data.number, fontSize: 10, color: ctx.onAccent, opacity: 0.85 } : null,
                ]),
              },
              {
                fillColor: ctx.accent,
                margin: [8, 18, 18, 18],
                alignment: "right",
                stack: nonNull([
                  ctx.data.from.name.trim() ? { text: ctx.data.from.name, bold: true, fontSize: 11, color: ctx.onAccent } : null,
                  ctx.data.from.details.trim()
                    ? { text: ctx.data.from.details, fontSize: 9, color: ctx.onAccent, opacity: 0.85, lineHeight: 1.3 }
                    : null,
                ]),
              },
            ],
          ],
        },
      },
      {
        margin: [0, 24, 0, 0],
        columnGap: 16,
        columns: [
          { width: "*", stack: [partyBlock("Bill to", ctx.data.billTo)] },
          { width: "auto", stack: [metaTable(ctx, false)] },
          { width: "auto", stack: [amountDue(ctx, ctx.accent, 16)], alignment: "right" },
        ],
      },
      itemsTable(ctx, { headerFill: ctx.accent, headerColor: ctx.onAccent, zebra: ctx.soft }),
      ...summary(ctx, { finalFill: ctx.accent, finalColor: ctx.onAccent }),
    ],
  },

  minimal: {
    content: (ctx) => [
      {
        columns: [
          { width: "*", stack: [partyBlock("From", ctx.data.from)] },
          { width: "auto", stack: nonNull([logo(ctx, [120, 48], "right")]) },
        ],
      },
      {
        margin: [0, 36, 0, 0],
        stack: [
          { text: ctx.data.title.toUpperCase(), fontSize: 9, bold: true, color: MUTED, characterSpacing: 3 },
          ctx.data.number.trim() ? { text: ctx.data.number, fontSize: 22, color: INK, margin: [0, 4, 0, 0] } : "",
        ],
      },
      rule(ctx.width, LINE, 0.75, [20, 20]),
      {
        columnGap: 16,
        columns: [
          { width: "*", stack: [partyBlock("Bill to", ctx.data.billTo)] },
          { width: "auto", stack: [metaTable(ctx, false)] },
        ],
      },
      itemsTable(ctx, { headerColor: MUTED, headerLine: { color: INK, width: 0.75 }, rowLines: true }),
      ...summary(ctx, { finalColor: ctx.accent, finalRule: INK, finalSize: 12 }),
    ],
  },

  bold: {
    marginLeft: MARGIN + 12,
    background: (ctx) => (_page, size) => ({
      canvas: [{ type: "rect", x: 0, y: 0, w: 18, h: size.height, color: ctx.accent }],
    }),
    content: (ctx) => [
      {
        columns: [
          {
            width: "*",
            stack: [
              { text: ctx.data.title.toUpperCase(), fontSize: 36, bold: true, color: INK, characterSpacing: -0.5 },
              ctx.data.number.trim() ? { text: `No. ${ctx.data.number}`, fontSize: 11, bold: true, color: ctx.accent } : "",
            ],
          },
          { width: "auto", stack: nonNull([logo(ctx, [130, 56], "right")]) },
        ],
      },
      {
        margin: [0, 28, 0, 0],
        columnGap: 20,
        columns: [
          { width: "*", stack: [partyBlock("From", ctx.data.from)] },
          { width: "*", stack: [partyBlock("Bill to", ctx.data.billTo)] },
          { width: "auto", stack: [metaTable(ctx, false)] },
        ],
      },
      itemsTable(ctx, { headerFill: INK, headerColor: "#ffffff", rowLines: true }),
      ...summary(ctx, { finalFill: ctx.accent, finalColor: ctx.onAccent, finalSize: 13 }),
    ],
  },

  elegant: {
    content: (ctx) => {
      const meta = metaRows(ctx)
        .map(([name, value]) => (name === "Number" ? `No. ${value}` : `${name.replace(" date", "")} ${value}`))
        .join("   ·   ");
      return [
        {
          alignment: "center",
          stack: nonNull([
            logo(ctx, [150, 56], "center"),
            ctx.data.from.name.trim()
              ? { text: ctx.data.from.name.toUpperCase(), fontSize: 14, color: INK, characterSpacing: 3 }
              : null,
            ctx.data.from.details.trim()
              ? { text: ctx.data.from.details, fontSize: 8.5, color: MUTED, lineHeight: 1.3, margin: [0, 4, 0, 0] }
              : null,
          ]),
        },
        rule(ctx.width, ctx.accent, 0.75, [18, 2]),
        rule(ctx.width, ctx.accent, 0.25, [0, 18]),
        { text: ctx.data.title.toUpperCase(), alignment: "center", fontSize: 17, color: ctx.accent, characterSpacing: 6 },
        meta ? { text: meta, alignment: "center", fontSize: 8.5, color: MUTED, margin: [0, 6, 0, 26] } : { text: "", margin: [0, 0, 0, 20] },
        {
          columns: [
            { width: "*", stack: [partyBlock("Billed to", ctx.data.billTo)] },
            { width: "auto", alignment: "right", stack: [amountDue(ctx, ctx.accent, 16)] },
          ],
        },
        itemsTable(ctx, {
          headerColor: ctx.accent,
          headerItalic: true,
          headerLine: { color: ctx.accent, width: 0.5 },
          frame: { color: ctx.accent, width: 0.75 },
          rowLines: true,
        }),
        ...summary(ctx, { finalColor: ctx.accent, finalRule: ctx.accent, finalSize: 12 }, { centeredNotes: true }),
      ];
    },
  },
};

/** The pdfmake definition for an invoice. Pure: the same draft always produces the same document. */
export function buildInvoiceDocument({ data, style }: InvoiceDraft): TDocumentDefinitions {
  const template = templates[style.template];
  const page = PAGE_SIZES[style.pageSize];
  const marginLeft = template.marginLeft ?? MARGIN;
  const ctx: Ctx = {
    data,
    style,
    totals: computeTotals(data),
    accent: style.accent,
    onAccent: readableOn(style.accent),
    soft: tint(style.accent, 0.08),
    width: page.width - marginLeft - MARGIN,
    money: (value) => formatMoney(value, data.currency),
  };

  return {
    pageSize: style.pageSize,
    pageMargins: [marginLeft, MARGIN, MARGIN, 56],
    info: {
      title: [data.title, data.number].filter((part) => part.trim()).join(" "),
      author: data.from.name || undefined,
      creator: "ProDuk — Invoice Generator",
      producer: "ProDuk",
    },
    defaultStyle: { font: "Roboto", fontSize: 10, color: INK },
    background: template.background?.(ctx),
    footer: (current, count) =>
      count > 1
        ? { text: `Page ${current} of ${count}`, alignment: "center", fontSize: 8, color: MUTED, margin: [0, 24, 0, 0] }
        : null,
    content: template.content(ctx),
  };
}

export const invoiceFileName = (data: InvoiceData) =>
  sanitizeFileName([data.title, data.number].filter((part) => part.trim()).join(" "), "pdf", "invoice");
