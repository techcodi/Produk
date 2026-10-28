"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { MAX_ITEMS } from "../constants";
import { formatMoney } from "../core/format";
import { lineTotal } from "../core/totals";
import type { InvoiceDispatch } from "../hooks/use-invoice-draft";
import type { LineItem } from "../types";

const inputStyles =
  "h-10 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus-visible:outline-2 focus-visible:outline-brand";

/**
 * Description spans the row on phones; from a 36rem-wide container every field sits on one line under shared
 * column headings. Each row is its own grid, so all columns but Description are fixed-width to stay aligned.
 */
const ROW_GRID = "grid grid-cols-2 gap-2 @xl:grid-cols-[minmax(0,1fr)_4.5rem_6.5rem_6.5rem_6.25rem] @xl:items-center";

interface LineItemsEditorProps {
  items: LineItem[];
  currency: string;
  dispatch: InvoiceDispatch;
}

export function LineItemsEditor({ items, currency, dispatch }: LineItemsEditorProps) {
  return (
    <div className="@container space-y-3">
      <div className={cn(ROW_GRID, "hidden text-xs font-medium text-muted @xl:grid")} aria-hidden>
        <span>Description</span>
        <span className="text-right">Qty</span>
        <span className="text-right">Rate</span>
        <span className="text-right">Amount</span>
        <span />
      </div>

      <ol className="space-y-3">
        {items.map((item, index) => {
          const position = `item ${index + 1}`;
          return (
            <li key={item.id} className={cn(ROW_GRID, "rounded-xl bg-surface-muted p-3 @xl:bg-transparent @xl:p-0")}>
              <input
                aria-label={`Description, ${position}`}
                placeholder="Item or service"
                value={item.description}
                onChange={(event) => dispatch({ type: "item", id: item.id, patch: { description: event.target.value } })}
                className={cn(inputStyles, "col-span-2 @xl:col-span-1")}
              />
              <input
                aria-label={`Quantity, ${position}`}
                placeholder="Qty"
                inputMode="decimal"
                value={item.quantity}
                onChange={(event) => dispatch({ type: "item", id: item.id, patch: { quantity: event.target.value } })}
                className={cn(inputStyles, "text-right tabular-nums")}
              />
              <input
                aria-label={`Rate, ${position}`}
                placeholder="Rate"
                inputMode="decimal"
                value={item.rate}
                onChange={(event) => dispatch({ type: "item", id: item.id, patch: { rate: event.target.value } })}
                className={cn(inputStyles, "text-right tabular-nums")}
              />
              <output
                aria-label={`Amount, ${position}`}
                className="self-center truncate text-sm font-medium tabular-nums @xl:text-right"
              >
                {formatMoney(lineTotal(item), currency)}
              </output>
              <div className="flex justify-end gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Move ${position} up`}
                  disabled={index === 0}
                  onClick={() => dispatch({ type: "moveItem", id: item.id, offset: -1 })}
                >
                  <ArrowUp />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Move ${position} down`}
                  disabled={index === items.length - 1}
                  onClick={() => dispatch({ type: "moveItem", id: item.id, offset: 1 })}
                >
                  <ArrowDown />
                </Button>
                <Button
                  variant="danger"
                  size="icon"
                  aria-label={`Remove ${position}`}
                  onClick={() => dispatch({ type: "removeItem", id: item.id })}
                >
                  <Trash2 />
                </Button>
              </div>
            </li>
          );
        })}
      </ol>

      <Button variant="secondary" size="sm" onClick={() => dispatch({ type: "addItem" })} disabled={items.length >= MAX_ITEMS}>
        <Plus /> Add item
      </Button>
    </div>
  );
}
