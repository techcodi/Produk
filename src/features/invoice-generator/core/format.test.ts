import { describe, expect, it } from "vitest";
import { formatDate, formatMoney, formatQuantity } from "./format";

describe("formatMoney", () => {
  it("uses the narrow symbol where the PDF font has one", () => {
    expect(formatMoney(1234.5, "NGN")).toBe("₦1,234.50");
    expect(formatMoney(1234.5, "USD")).toBe("$1,234.50");
    expect(formatMoney(9, "EUR")).toBe("€9.00");
  });

  it("falls back to the ISO code, separated by a plain space", () => {
    expect(formatMoney(1, "GHS")).toBe("GHS 1.00");
  });

  it("respects currencies without minor units", () => {
    expect(formatMoney(1500, "JPY")).toBe("¥1,500");
  });
});

describe("formatQuantity", () => {
  it("drops trailing zeros", () => {
    expect(formatQuantity(2)).toBe("2");
    expect(formatQuantity(1.5)).toBe("1.5");
  });
});

describe("formatDate", () => {
  it("formats a calendar date without timezone drift", () => {
    expect(formatDate("2026-01-01")).toBe("Jan 1, 2026");
    expect(formatDate("2026-12-31")).toBe("Dec 31, 2026");
  });

  it("returns an empty string for missing or malformed dates", () => {
    expect(formatDate("")).toBe("");
    expect(formatDate("31/12/2026")).toBe("");
  });
});
