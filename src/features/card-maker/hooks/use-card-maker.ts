"use client";

import { useEffect, useReducer } from "react";
import { createDraft, DRAFT_STORAGE_KEY } from "../constants";
import { createInitialState, parseState, type CardMakerState } from "../core/draft";
import type { CardDraft, CardKind, FieldKey } from "../types";

const AUTOSAVE_DELAY_MS = 400;

type Action =
  | { type: "kind"; kind: CardKind }
  | { type: "draft"; patch: Partial<CardDraft> }
  | { type: "field"; key: FieldKey; value: string }
  | { type: "reset" };

function reducer(state: CardMakerState, action: Action): CardMakerState {
  const current = state.drafts[state.kind];
  const withDraft = (draft: CardDraft) => ({ ...state, drafts: { ...state.drafts, [state.kind]: draft } });
  switch (action.type) {
    case "kind":
      return { ...state, kind: action.kind };
    case "draft":
      return withDraft({ ...current, ...action.patch });
    case "field":
      return withDraft({ ...current, fields: { ...current.fields, [action.key]: action.value } });
    case "reset":
      return withDraft(createDraft(state.kind));
  }
}

function load(): CardMakerState {
  try {
    const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (saved) return parseState(JSON.parse(saved));
  } catch {
    // Storage blocked or corrupted — start fresh.
  }
  return createInitialState();
}

/**
 * The card being edited, one draft per card type, autosaved to this device.
 * Reads localStorage in its initializer, so mount it on the client only.
 */
export function useCardMaker() {
  const [state, dispatch] = useReducer(reducer, undefined, load);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(state));
      } catch {
        // Quota exceeded (large photos) or storage blocked: the card still works for this visit.
      }
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state]);

  return { kind: state.kind, draft: state.drafts[state.kind], dispatch };
}

export type CardMakerDispatch = ReturnType<typeof useCardMaker>["dispatch"];
