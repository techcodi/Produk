import { describe, expect, it } from "vitest";
import { CARD_SIZES, DEFAULT_STYLE, SAMPLE_DETAILS, SHEET_SIZE, TEMPLATES } from "../constants";
import type { CardDetails } from "../types";
import { blankDraft, isEmpty, parseDraft } from "./draft";
import { buildCardQr } from "./qr-content";
import { sheetLayout, sheetSvg } from "./sheet";
import { nestSvg } from "./svg-nest";
import { renderCard, type Measurer } from "./templates";
import { buildVcard, displayUrl, escapeVcard, normalizeUrl } from "./vcard";

/** Rough measure for tests: every character is 0.55 em wide. */
const measure: Measurer = (_family, size) => (text) => text.length * size * 0.55;

describe("vCard", () => {
  it("escapes reserved characters", () => {
    expect(escapeVcard("a,b;c\\d\ne")).toBe("a\\,b\\;c\\\\d\\ne");
  });

  it("builds a 3.0 card with CRLF lines and only filled fields", () => {
    const card = buildVcard({ ...SAMPLE_DETAILS, tagline: "ignored", phone: "" });
    const lines = card.split("\r\n");
    expect(lines[0]).toBe("BEGIN:VCARD");
    expect(lines).toContain("VERSION:3.0");
    expect(lines).toContain("N:Okafor;Ada;;;");
    expect(lines).toContain("FN:Ada Okafor");
    expect(lines).toContain("URL:https://lumen.studio");
    expect(lines).toContain("ADR;TYPE=WORK:;;12 Admiralty Way\\, Lekki\\nLagos\\, Nigeria;;;;");
    expect(card).not.toContain("TEL");
    expect(lines.at(-1)).toBe("END:VCARD");
  });

  it("normalises and displays URLs", () => {
    expect(normalizeUrl("lumen.studio")).toBe("https://lumen.studio");
    expect(normalizeUrl("http://x.co")).toBe("http://x.co");
    expect(displayUrl("https://www.lumen.studio/")).toBe("lumen.studio");
  });
});

describe("buildCardQr", () => {
  it("encodes a contact card", () => {
    const { qr, notice } = buildCardQr(SAMPLE_DETAILS, "vcard");
    expect(qr?.mode).toBe("vcard");
    expect(notice).toBeNull();
  });

  it("falls back to the website when the vCard is too long", () => {
    const huge: CardDetails = { ...SAMPLE_DETAILS, address: "x".repeat(3000) };
    const { qr, notice } = buildCardQr(huge, "vcard");
    expect(qr?.mode).toBe("website");
    expect(notice).toMatch(/website instead/);
  });

  it("explains what's missing", () => {
    expect(buildCardQr({ ...SAMPLE_DETAILS, website: "" }, "website").notice).toMatch(/Add your website/);
    expect(buildCardQr(SAMPLE_DETAILS, "none")).toEqual({ qr: null, notice: null });
  });
});

describe("sheetLayout", () => {
  const card = CARD_SIZES.standard;

  it("centres a 2×5 grid of butted cards on A4", () => {
    const { cards } = sheetLayout(SHEET_SIZE, card, 2, 5);
    expect(cards).toHaveLength(10);
    expect(cards[0]).toEqual({ x: 20, y: 11 });
    expect(cards[1]).toEqual({ x: 105, y: 11 });
    expect(cards[9]).toEqual({ x: 105, y: 231 });
  });

  it("mirrors columns for the back side", () => {
    const front = sheetLayout(SHEET_SIZE, card, 2, 5).cards;
    const back = sheetLayout(SHEET_SIZE, card, 2, 5, true).cards;
    expect(back[0]).toEqual(front[1]);
    expect(back[1]).toEqual(front[0]);
  });

  it("puts every crop mark in the margin, inside the page", () => {
    const { marks } = sheetLayout(SHEET_SIZE, CARD_SIZES.us, 2, 5);
    expect(marks).toHaveLength((2 + 1) * 2 + (5 + 1) * 2);
    const xs = marks.flatMap((m) => [m.x1, m.x2]);
    const ys = marks.flatMap((m) => [m.y1, m.y2]);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThanOrEqual(SHEET_SIZE.widthMm);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...ys)).toBeLessThanOrEqual(SHEET_SIZE.heightMm);
  });

  it("refuses cards that don't fit", () => {
    expect(() => sheetLayout(SHEET_SIZE, { widthMm: 120, heightMm: 55 }, 2, 5)).toThrow(RangeError);
  });

  it("nests the card at each slot", () => {
    const svg = sheetSvg(SHEET_SIZE, card, sheetLayout(SHEET_SIZE, card, 2, 5), '<svg xmlns="http://www.w3.org/2000/svg" width="85mm" height="55mm" viewBox="0 0 85 55"><rect/></svg>');
    expect(svg.match(/<svg /g)).toHaveLength(11);
    expect(svg).toContain('x="20" y="11" width="85" height="55"');
  });
});

describe("nestSvg", () => {
  it("replaces size and position but keeps other attributes", () => {
    expect(nestSvg('<svg xmlns="a" width="9" viewBox="0 0 9 9" shape-rendering="crispEdges"><g/></svg>', 1, 2, 3, 4)).toBe(
      '<svg xmlns="a" viewBox="0 0 9 9" shape-rendering="crispEdges" x="1" y="2" width="3" height="4"><g/></svg>',
    );
  });
});

describe("renderCard", () => {
  const details: CardDetails = { ...SAMPLE_DETAILS, name: `Tom & "Jerry" <Ltd>` };

  it.each(TEMPLATES.map((t) => t.id))("%s escapes text and sizes the card in mm", (template) => {
    const { front, back } = renderCard({ details, style: { ...DEFAULT_STYLE, template }, qr: null, measure });
    expect(front).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="85mm" height="55mm" viewBox="0 0 85 55">/);
    expect(front).toContain("Tom &amp; &quot;Jerry&quot; &lt;Ltd&gt;");
    expect(front).not.toContain("<Ltd>");
    expect(back).toMatch(/^<svg /);
  });

  it("uses the US size when chosen", () => {
    const { front } = renderCard({ details, style: { ...DEFAULT_STYLE, size: "us" }, qr: null, measure });
    expect(front).toContain('viewBox="0 0 88.9 50.8"');
  });

  it("puts the QR code and its caption on the back", () => {
    const { qr } = buildCardQr(SAMPLE_DETAILS, "vcard");
    const { back } = renderCard({ details: SAMPLE_DETAILS, style: DEFAULT_STYLE, qr, measure });
    expect(back).toContain('shape-rendering="crispEdges"');
    expect(back).toContain("Scan to save contact");
  });

  it("wraps the company beside the QR code instead of truncating it", () => {
    const { qr } = buildCardQr(SAMPLE_DETAILS, "vcard");
    const { back } = renderCard({ details: { ...SAMPLE_DETAILS, company: "Okafor Logistics Ltd" }, style: DEFAULT_STYLE, qr, measure });
    const words = [...back.matchAll(/font-weight="700"[^>]*>([^<]+)</g)].map((m) => m[1]).join(" ");
    expect(words).toBe("Okafor Logistics Ltd");
    expect(back).not.toContain("…");
  });

  it("truncates a name too long for the card", () => {
    const { front } = renderCard({ details: { ...SAMPLE_DETAILS, name: "A".repeat(80) }, style: DEFAULT_STYLE, qr: null, measure });
    expect(front).toContain("…");
  });
});

describe("parseDraft", () => {
  it("defaults invalid values and keeps valid ones", () => {
    const draft = parseDraft({ details: { name: "Ada", phone: 42 }, style: { template: "nope", accent: "red", size: "us", logo: "javascript:x", qr: "vcard" } });
    expect(draft.details.name).toBe("Ada");
    expect(draft.details.phone).toBe("");
    expect(draft.style).toEqual({ ...DEFAULT_STYLE, size: "us", qr: "vcard" });
  });

  it("treats garbage as a blank draft", () => {
    expect(parseDraft("x")).toEqual(blankDraft());
    expect(isEmpty(blankDraft().details)).toBe(true);
  });
});
