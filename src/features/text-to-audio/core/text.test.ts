import { describe, expect, it } from "vitest";
import { normalizeText, splitIntoChunks } from "./text";

describe("normalizeText", () => {
  it("unifies quotes, dashes, whitespace and drops emoji", () => {
    expect(normalizeText("  “Hi” there — it’s 🎉 fine\r\n")).toBe(`"Hi" there , it's fine`);
  });
});

describe("splitIntoChunks", () => {
  it("splits sentences and marks paragraph ends", () => {
    expect(splitIntoChunks("Hello there. How are you?\n\nFine!")).toEqual([
      { text: "Hello there.", pause: "sentence" },
      { text: "How are you?", pause: "paragraph" },
      { text: "Fine!", pause: "paragraph" },
    ]);
  });

  it("keeps a final sentence without punctuation", () => {
    expect(splitIntoChunks("One. Two")).toEqual([
      { text: "One.", pause: "sentence" },
      { text: "Two", pause: "paragraph" },
    ]);
  });

  it("keeps closing quotes with their sentence", () => {
    expect(splitIntoChunks('He said "stop." Then left.').map((c) => c.text)).toEqual(['He said "stop."', "Then left."]);
  });

  it("breaks long sentences at commas, then spaces, under the limit", () => {
    const long = `${"word ".repeat(30)}, ${"more ".repeat(30)}`;
    const chunks = splitIntoChunks(long, 100);
    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks.every((c) => c.text.length <= 100)).toBe(true);
    expect(chunks.map((c) => c.text).join(" ").replace(/\s+/g, " ")).toBe(normalizeText(long).replace(/\s+/g, " "));
  });

  it("drops fragments with nothing to say", () => {
    expect(splitIntoChunks("... !!! \n\n ---")).toEqual([]);
  });
});
