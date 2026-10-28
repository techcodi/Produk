import { describe, expect, it } from "vitest";
import { createDraft, DESIGNS, FORMATS, KINDS } from "../constants";
import type { CardKind, MeasureFactory } from "../types";
import { parseState } from "./draft";
import { cardFileStem, renderCard } from "./render";

/** Rough average glyph width, good enough to exercise wrapping. */
const measure: MeasureFactory = (_family, size) => (text) => text.length * size * 0.55;

const render = (kind: CardKind, patch: Partial<ReturnType<typeof createDraft>> = {}) =>
  renderCard({ kind, draft: { ...createDraft(kind), ...patch }, measure });

describe("renderCard", () => {
  it.each(KINDS.flatMap(({ id }) => DESIGNS[id].map((design) => [id, design.id] as const)))("%s / %s renders a sized SVG", (kind, design) => {
    const svg = render(kind, { design });
    const format = FORMATS[kind][0];
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain(`viewBox="0 0 ${format.widthMm} ${format.heightMm}"`);
    expect(svg).not.toContain("undefined");
    expect(svg).not.toContain("NaN");
  });

  it("escapes user text", () => {
    const svg = render("birthday", { fields: { headline: `<script>alert("x")</script> & co` } });
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;");
    expect(svg).toContain("&amp; co");
  });

  it("wraps long messages onto several lines", () => {
    const svg = render("thankyou", { fields: { headline: "Thanks", message: "word ".repeat(60) } });
    expect(svg.match(/<text /g)!.length).toBeGreaterThan(5);
  });

  it("uses the chosen format's size", () => {
    expect(render("birthday", { format: "square" })).toContain('viewBox="0 0 150 150"');
    expect(render("membership")).toContain('viewBox="0 0 85.6 54"');
    expect(render("pass")).toContain('viewBox="0 0 152.4 101.6"');
  });

  it("adds a QR code to passes only when there's text for it", () => {
    const withQr = render("pass", { fields: { ...createDraft("pass").fields, qr: "TICKET-123" } });
    const without = render("pass");
    expect(withQr).toContain("crispEdges");
    expect(without).not.toContain("crispEdges");
    expect(render("pass", { design: "badge", fields: { ...createDraft("pass").fields, qr: "x" } })).toContain("crispEdges");
  });

  it("embeds the photo when there is one", () => {
    const photo = "data:image/jpeg;base64,AAAA";
    expect(render("membership", { photo })).toContain(`href="${photo}"`);
    expect(render("birthday", { design: "photo", photo })).toContain(`href="${photo}"`);
  });

  it("shows initials on membership cards without a photo", () => {
    expect(render("membership", { fields: { member: "Ada Lovelace" } })).toContain(">AL</text>");
  });
});

describe("parseState", () => {
  it("defaults everything for junk input", () => {
    expect(parseState("nope").kind).toBe("birthday");
    expect(parseState(null).drafts.pass.design).toBe("ticket");
  });

  it("keeps valid values and drops unsafe ones", () => {
    const state = parseState({
      kind: "pass",
      drafts: {
        pass: { design: "badge", accent: "red", photo: "javascript:alert(1)", fields: { event: "Gig", bogus: "x" } },
        membership: { photo: "data:image/png;base64,AAAA", font: "classic" },
      },
    });
    expect(state.kind).toBe("pass");
    expect(state.drafts.pass.design).toBe("badge");
    expect(state.drafts.pass.accent).toBe(createDraft("pass").accent);
    expect(state.drafts.pass.photo).toBeNull();
    expect(state.drafts.pass.fields.event).toBe("Gig");
    expect(state.drafts.pass.fields).not.toHaveProperty("bogus");
    expect(state.drafts.membership.photo).toBe("data:image/png;base64,AAAA");
    expect(state.drafts.membership.font).toBe("classic");
  });
});

describe("cardFileStem", () => {
  it("slugs the main text, with a fallback", () => {
    expect(cardFileStem("birthday", createDraft("birthday"))).toBe("happy-birthday");
    expect(cardFileStem("pass", { ...createDraft("pass"), fields: { event: "" } })).toBe("pass-card");
  });
});
