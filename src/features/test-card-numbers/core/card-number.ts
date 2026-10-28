import type { CardBrand, CardCheck } from "../types";

export const digitsOnly = (input: string) => input.replace(/\D/g, "");

/** Luhn (mod 10) checksum, which every major card scheme uses to catch typos. */
export function luhnValid(digits: string): boolean {
  if (!/^\d{12,19}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let digit = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

const between = (digits: string, length: number, low: number, high: number) => {
  const prefix = Number(digits.slice(0, length));
  return digits.length >= length && prefix >= low && prefix <= high;
};

/** Issuer ranges from the schemes' public BIN ranges; order matters where ranges overlap. */
const BRANDS: { brand: CardBrand; lengths: number[]; matches: (d: string) => boolean }[] = [
  {
    brand: "Verve",
    lengths: [16, 18, 19],
    matches: (d) => between(d, 6, 506099, 506198) || between(d, 6, 507865, 507964) || between(d, 6, 650002, 650027),
  },
  { brand: "American Express", lengths: [15], matches: (d) => /^3[47]/.test(d) },
  { brand: "Diners Club", lengths: [14, 16, 19], matches: (d) => between(d, 3, 300, 305) || /^3[689]/.test(d) },
  { brand: "JCB", lengths: [16, 17, 18, 19], matches: (d) => between(d, 4, 3528, 3589) },
  {
    brand: "Discover",
    lengths: [16, 19],
    matches: (d) => /^6011|^65/.test(d) || between(d, 3, 644, 649) || between(d, 6, 622126, 622925),
  },
  { brand: "UnionPay", lengths: [16, 17, 18, 19], matches: (d) => /^62/.test(d) },
  { brand: "Mastercard", lengths: [16], matches: (d) => between(d, 2, 51, 55) || between(d, 4, 2221, 2720) },
  { brand: "Visa", lengths: [13, 16, 19], matches: (d) => /^4/.test(d) },
  { brand: "Maestro", lengths: [12, 13, 14, 15, 16, 17, 18, 19], matches: (d) => /^(5[06-8]|6[39])/.test(d) },
];

export function detectBrand(digits: string): CardBrand | null {
  return BRANDS.find((entry) => entry.matches(digits))?.brand ?? null;
}

/** Format-only check: says nothing about whether a card exists, is active or has funds. */
export function checkCardNumber(input: string): CardCheck {
  const digits = digitsOnly(input);
  const entry = BRANDS.find((candidate) => candidate.matches(digits));
  return {
    digits,
    brand: entry?.brand ?? null,
    lengthOk: entry ? entry.lengths.includes(digits.length) : digits.length >= 12 && digits.length <= 19,
    luhnOk: luhnValid(digits),
  };
}

/** Groups digits for reading: Amex 4-6-5, everything else in fours. */
export function formatCardNumber(digits: string): string {
  if (/^3[47]/.test(digits) && digits.length === 15) return `${digits.slice(0, 4)} ${digits.slice(4, 10)} ${digits.slice(10)}`;
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}
