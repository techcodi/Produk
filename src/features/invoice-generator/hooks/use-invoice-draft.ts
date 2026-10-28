"use client";

import { useEffect, useReducer } from "react";
import { createId } from "@/lib/id";
import { createBlankInvoice, DEFAULT_STYLE, DRAFT_STORAGE_KEY, MAX_ITEMS, TEMPLATES } from "../constants";
import { parseDraft } from "../core/draft";
import type { InvoiceData, InvoiceDraft, InvoiceStyle, LineItem, Party } from "../types";

const AUTOSAVE_DELAY_MS = 400;

type Action =
  | { type: "data"; patch: Partial<InvoiceData> }
  | { type: "party"; party: "from" | "billTo"; patch: Partial<Party> }
  | { type: "item"; id: string; patch: Partial<LineItem> }
  | { type: "addItem" }
  | { type: "removeItem"; id: string }
  | { type: "moveItem"; id: string; offset: -1 | 1 }
  | { type: "style"; patch: Partial<InvoiceStyle> }
  | { type: "template"; template: InvoiceStyle["template"] }
  | { type: "replace"; draft: InvoiceDraft };

const blankItem = (): LineItem => ({ id: createId(), description: "", quantity: "1", rate: "" });

const withData = (state: InvoiceDraft, patch: Partial<InvoiceData>): InvoiceDraft => ({
  ...state,
  data: { ...state.data, ...patch },
});

function reducer(state: InvoiceDraft, action: Action): InvoiceDraft {
  const { items } = state.data;
  switch (action.type) {
    case "data":
      return withData(state, action.patch);
    case "party":
      return withData(state, { [action.party]: { ...state.data[action.party], ...action.patch } });
    case "item":
      return withData(state, { items: items.map((item) => (item.id === action.id ? { ...item, ...action.patch } : item)) });
    case "addItem":
      return items.length >= MAX_ITEMS ? state : withData(state, { items: [...items, blankItem()] });
    case "removeItem": {
      const rest = items.filter((item) => item.id !== action.id);
      return withData(state, { items: rest.length > 0 ? rest : [blankItem()] });
    }
    case "moveItem": {
      const from = items.findIndex((item) => item.id === action.id);
      const to = from + action.offset;
      if (from < 0 || to < 0 || to >= items.length) return state;
      const next = [...items];
      [next[from], next[to]] = [next[to], next[from]];
      return withData(state, { items: next });
    }
    case "style":
      return { ...state, style: { ...state.style, ...action.patch } };
    case "template": {
      // Switching template also switches to its signature colour; the user can change it after.
      const accent = TEMPLATES.find((t) => t.id === action.template)?.accent ?? state.style.accent;
      return { ...state, style: { ...state.style, template: action.template, accent } };
    }
    case "replace":
      return action.draft;
  }
}

export const createBlankDraft = (): InvoiceDraft => ({ data: createBlankInvoice(new Date(), createId()), style: DEFAULT_STYLE });

function loadDraft(): InvoiceDraft {
  try {
    const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (saved) return parseDraft(JSON.parse(saved)) ?? createBlankDraft();
  } catch {
    // Storage blocked (private mode) or corrupted — start fresh.
  }
  return createBlankDraft();
}

/**
 * The invoice being edited, autosaved to this device only. Reads localStorage
 * in its initializer, so mount it on the client only (see `useIsClient`).
 */
export function useInvoiceDraft() {
  const [draft, dispatch] = useReducer(reducer, undefined, loadDraft);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      } catch {
        // Quota exceeded or storage blocked: the draft still lives in memory.
      }
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [draft]);

  return { draft, dispatch };
}

export type InvoiceDispatch = ReturnType<typeof useInvoiceDraft>["dispatch"];
