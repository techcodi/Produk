import { canShareFile, shareFile } from "@/lib/share";
import type { InvoiceData } from "../types";
import { formatDate, formatMoney } from "./format";
import { computeTotals } from "./totals";

/** One-paragraph summary used as the share/email body. */
export function shareMessage(data: InvoiceData): string {
  const { balance } = computeTotals(data);
  const parts = [
    `${data.title}${data.number.trim() ? ` ${data.number}` : ""}${data.from.name.trim() ? ` from ${data.from.name}` : ""}`,
    `Amount due: ${formatMoney(balance, data.currency)}`,
  ];
  const due = formatDate(data.dueDate);
  if (due) parts.push(`Due ${due}`);
  return parts.join(" · ");
}

export const canShareFiles = () => canShareFile("application/pdf", "invoice.pdf");

/** Resolves false when the user closed the share sheet without picking anything. */
export const sharePdf = (blob: Blob, fileName: string, data: InvoiceData) =>
  shareFile(new File([blob], fileName, { type: "application/pdf" }), { title: fileName, text: shareMessage(data) });

/** Fallback for desktop browsers without file sharing: a pre-filled email; the user attaches the downloaded PDF. */
export function emailLink(data: InvoiceData, fileName: string): string {
  const subject = `${data.title}${data.number.trim() ? ` ${data.number}` : ""}`;
  const body = `${shareMessage(data)}\n\nPlease find the invoice attached (${fileName}).`;
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
