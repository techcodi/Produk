import { describe, expect, it } from "vitest";
import { PROVIDERS, TEST_CARDS } from "../constants";
import { checkCardNumber, detectBrand, formatCardNumber, luhnValid } from "./card-number";

describe("luhnValid", () => {
  it("accepts valid numbers and rejects typos", () => {
    expect(luhnValid("4242424242424242")).toBe(true);
    expect(luhnValid("4242424242424241")).toBe(false);
    expect(luhnValid("378282246310005")).toBe(true);
  });

  it("rejects too short, too long or non-digit input", () => {
    expect(luhnValid("0")).toBe(false);
    expect(luhnValid("4".repeat(20))).toBe(false);
    expect(luhnValid("4242-4242-4242-4242")).toBe(false);
  });
});

describe("detectBrand", () => {
  it.each([
    ["4242424242424242", "Visa"],
    ["5555555555554444", "Mastercard"],
    ["2223003122003222", "Mastercard"],
    ["378282246310005", "American Express"],
    ["6011111111111117", "Discover"],
    ["3056930009020004", "Diners Club"],
    ["3566002020360505", "JCB"],
    ["6200000000000005", "UnionPay"],
    ["5061460410120223210", "Verve"],
  ])("%s is %s", (number, brand) => {
    expect(detectBrand(number)).toBe(brand);
  });

  it("returns null for unknown prefixes", () => {
    expect(detectBrand("9999999999999999")).toBeNull();
  });
});

describe("checkCardNumber", () => {
  it("ignores spaces and dashes and reports each check", () => {
    expect(checkCardNumber("4242 4242-4242 4242")).toEqual({ digits: "4242424242424242", brand: "Visa", lengthOk: true, luhnOk: true });
  });

  it("flags a length the brand doesn't issue", () => {
    expect(checkCardNumber("37828224631000").lengthOk).toBe(false);
  });
});

describe("formatCardNumber", () => {
  it("groups Amex 4-6-5 and others in fours", () => {
    expect(formatCardNumber("378282246310005")).toBe("3782 822463 10005");
    expect(formatCardNumber("4242424242424242")).toBe("4242 4242 4242 4242");
    expect(formatCardNumber("6205500000000000004")).toBe("6205 5000 0000 0000 004");
  });
});

describe("test card data", () => {
  it("stores digits only and has no duplicate scenario per provider", () => {
    const keys = new Set<string>();
    for (const card of TEST_CARDS) {
      expect(card.number).toMatch(/^\d{12,19}$/);
      const key = `${card.provider}:${card.number}:${card.scenario}`;
      expect(keys.has(key)).toBe(false);
      keys.add(key);
    }
  });

  it("every Stripe number passes Luhn, except the one meant to fail as an incorrect number", () => {
    const failing = TEST_CARDS.filter((card) => card.provider === "stripe" && !luhnValid(card.number)).map((card) => card.number);
    expect(failing).toEqual(["4242424242424241"]);
  });

  it("every card belongs to a known provider", () => {
    const ids = new Set(PROVIDERS.map((provider) => provider.id));
    expect(TEST_CARDS.every((card) => ids.has(card.provider))).toBe(true);
  });
});
