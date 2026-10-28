import { describe, expect, it } from "vitest";
import { escapeXml, wrapLines } from "./svg";

/** Monospace measure: every character is 1 unit wide. */
const mono = (text: string) => text.length;

describe("escapeXml", () => {
  it("escapes markup characters", () => {
    expect(escapeXml(`<a href="x">Tom & Jerry's</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&apos;s&lt;/a&gt;");
  });
});

describe("wrapLines", () => {
  it("wraps on word boundaries", () => {
    expect(wrapLines("the quick brown fox", 10, mono)).toEqual(["the quick", "brown fox"]);
  });

  it("keeps explicit line breaks, including blank lines", () => {
    expect(wrapLines("a\n\nb", 10, mono)).toEqual(["a", "", "b"]);
  });

  it("breaks words longer than a line", () => {
    expect(wrapLines("abcdefghij", 4, mono)).toEqual(["abcd", "efgh", "ij"]);
  });

  it("truncates with an ellipsis at maxLines", () => {
    expect(wrapLines("one two three four five", 9, mono, 2)).toEqual(["one two", "three…"]);
  });
});
