"use client";

import { useEffect, useState } from "react";
import { DRAFT_STORAGE_KEY } from "../constants";
import { blankDraft, parseDraft } from "../core/draft";
import type { CardDetails, CardDraft, CardStyle } from "../types";

const AUTOSAVE_DELAY_MS = 400;

function loadDraft(): CardDraft {
  try {
    const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
    return saved ? parseDraft(JSON.parse(saved)) : blankDraft();
  } catch {
    return blankDraft();
  }
}

/** The card being designed, autosaved on this device. Reads localStorage on init, so mount it on the client only. */
export function useCardDraft() {
  const [draft, setDraft] = useState<CardDraft>(loadDraft);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      } catch {
        // Storage full or blocked: the draft still lives in memory.
      }
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [draft]);

  return {
    draft,
    setDetails: (patch: Partial<CardDetails>) => setDraft((d) => ({ ...d, details: { ...d.details, ...patch } })),
    setStyle: (patch: Partial<CardStyle>) => setDraft((d) => ({ ...d, style: { ...d.style, ...patch } })),
    reset: () => setDraft(blankDraft()),
  };
}
