import { CURRENCIES } from "../constants";

const formatters = new Map<string, Intl.NumberFormat>();

/** `1234.5, "NGN"` → `"₦1,234.50"`; currencies whose symbol the PDF font lacks print their code. */
export function formatMoney(value: number, currency: string): string {
  let formatter = formatters.get(currency);
  if (!formatter) {
    const display = CURRENCIES.find((c) => c.code === currency)?.display ?? "code";
    try {
      formatter = new Intl.NumberFormat("en-US", { style: "currency", currency, currencyDisplay: display });
    } catch {
      formatter = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    formatters.set(currency, formatter);
  }
  // Intl separates codes with a no-break space; a plain space is safer for every PDF font.
  return formatter.format(value).replace(/ /g, " ");
}

/** Plain number for quantities: `2` → `"2"`, `1.5` → `"1.5"`. */
export const formatQuantity = (value: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 }).format(value);

/** `"2026-10-28"` → `"Oct 28, 2026"`. Parsed as a calendar date, so no timezone can shift the day. */
export function formatDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return "";
  const [, year, month, day] = match.map(Number);
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}
