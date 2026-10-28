"use client";

import { useId } from "react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SelectField } from "@/components/ui/select-field";
import { TextArea } from "@/components/ui/text-area";
import { TextField } from "@/components/ui/text-field";
import { CURRENCIES, DOCUMENT_TITLES } from "../constants";
import { formatMoney } from "../core/format";
import { computeTotals } from "../core/totals";
import type { InvoiceDispatch } from "../hooks/use-invoice-draft";
import type { DiscountType, InvoiceData } from "../types";
import { FormSection } from "./form-section";
import { LineItemsEditor } from "./line-items-editor";

const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} — ${c.name}` }));

const DISCOUNT_OPTIONS = [
  { value: "percent", label: "%" },
  { value: "amount", label: "Amount" },
] as const;

interface InvoiceDetailsFormProps {
  data: InvoiceData;
  dispatch: InvoiceDispatch;
}

export function InvoiceDetailsForm({ data, dispatch }: InvoiceDetailsFormProps) {
  const titleListId = useId();
  const set = (patch: Partial<InvoiceData>) => dispatch({ type: "data", patch });
  const totals = computeTotals(data);
  const money = (value: number) => formatMoney(value, data.currency);

  return (
    <div className="space-y-4">
      <FormSection title="Document">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Title"
            value={data.title}
            onChange={(title) => set({ title })}
            list={titleListId}
            maxLength={60}
            hint="Invoice, Quote, Receipt…"
          />
          <datalist id={titleListId}>
            {DOCUMENT_TITLES.map((title) => (
              <option key={title} value={title} />
            ))}
          </datalist>
          <TextField label="Number" value={data.number} onChange={(number) => set({ number })} maxLength={60} />
          <TextField label="Issue date" type="date" value={data.issueDate} onChange={(issueDate) => set({ issueDate })} />
          <TextField label="Due date" type="date" value={data.dueDate} onChange={(dueDate) => set({ dueDate })} />
          <SelectField
            label="Currency"
            value={data.currency}
            options={CURRENCY_OPTIONS}
            onChange={(currency) => set({ currency })}
            className="sm:col-span-2"
          />
        </div>
      </FormSection>

      <FormSection title="Who it’s from and to">
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["from", "From", "Your business"],
              ["billTo", "Bill to", "Client name"],
            ] as const
          ).map(([party, heading, placeholder]) => (
            <fieldset key={party} className="min-w-0 space-y-3">
              <legend className="mb-2 text-sm font-semibold">{heading}</legend>
              <TextField
                label="Name"
                placeholder={placeholder}
                value={data[party].name}
                onChange={(name) => dispatch({ type: "party", party, patch: { name } })}
                spellCheck
              />
              <TextArea
                label="Details"
                placeholder={"Address\nEmail · Phone\nTax ID"}
                rows={4}
                value={data[party].details}
                onChange={(details) => dispatch({ type: "party", party, patch: { details } })}
              />
            </fieldset>
          ))}
        </div>
      </FormSection>

      <FormSection title="Items">
        <LineItemsEditor items={data.items} currency={data.currency} dispatch={dispatch} />
      </FormSection>

      <FormSection title="Totals" description="Leave any field empty to hide it from the invoice.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-2">
            <TextField label="Tax name" value={data.taxLabel} onChange={(taxLabel) => set({ taxLabel })} maxLength={40} />
            <TextField
              label="Rate"
              inputMode="decimal"
              placeholder="0"
              suffix="%"
              value={data.taxRate}
              onChange={(taxRate) => set({ taxRate })}
            />
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_8rem] items-end gap-2">
            <TextField
              label="Discount"
              inputMode="decimal"
              placeholder="0"
              value={data.discount}
              onChange={(discount) => set({ discount })}
            />
            <div className="[&_legend]:sr-only">
              <SegmentedControl<DiscountType>
                label="Discount type"
                value={data.discountType}
                options={DISCOUNT_OPTIONS}
                onChange={(discountType) => set({ discountType })}
              />
            </div>
          </div>
          <TextField
            label="Shipping"
            inputMode="decimal"
            placeholder="0"
            value={data.shipping}
            onChange={(shipping) => set({ shipping })}
          />
          <TextField
            label="Amount paid"
            inputMode="decimal"
            placeholder="0"
            value={data.amountPaid}
            onChange={(amountPaid) => set({ amountPaid })}
            hint="Deposits or part-payments already received."
          />
        </div>

        <dl className="mt-5 space-y-1.5 rounded-xl bg-surface-muted p-4 text-sm tabular-nums">
          <SummaryRow label="Subtotal" value={money(totals.subtotal)} />
          {totals.discount > 0 && <SummaryRow label="Discount" value={`−${money(totals.discount)}`} />}
          {totals.tax > 0 && <SummaryRow label={data.taxLabel || "Tax"} value={money(totals.tax)} />}
          {totals.shipping > 0 && <SummaryRow label="Shipping" value={money(totals.shipping)} />}
          <SummaryRow label="Total" value={money(totals.total)} strong={totals.paid === 0} />
          {totals.paid > 0 && (
            <>
              <SummaryRow label="Paid" value={`−${money(totals.paid)}`} />
              <SummaryRow label="Balance due" value={money(totals.balance)} strong />
            </>
          )}
        </dl>
      </FormSection>

      <FormSection title="Notes & payment">
        <div className="grid gap-4">
          <TextArea
            label="Payment details"
            placeholder={"Bank name\nAccount name\nAccount number"}
            value={data.paymentDetails}
            onChange={(paymentDetails) => set({ paymentDetails })}
          />
          <TextArea label="Notes" value={data.notes} onChange={(notes) => set({ notes })} rows={2} />
          <TextArea
            label="Terms & conditions"
            placeholder="e.g. Payment due within 14 days."
            value={data.terms}
            onChange={(terms) => set({ terms })}
            rows={2}
          />
        </div>
      </FormSection>
    </div>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? "flex justify-between gap-4 border-t border-border pt-2 text-base font-semibold" : "flex justify-between gap-4"}>
      <dt className={strong ? undefined : "text-muted"}>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
