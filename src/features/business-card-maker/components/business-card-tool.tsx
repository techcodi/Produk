"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Eye, Loader2, Palette, PencilLine, RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { canvasMeasure } from "@/lib/svg";
import { SAMPLE_DETAILS } from "../constants";
import { isEmpty } from "../core/draft";
import { buildCardQr } from "../core/qr-content";
import { renderCard, type Measurer } from "../core/templates";
import { useCardDraft } from "../hooks/use-card-draft";
import { CardDesignPanel } from "./card-design-panel";
import { CardDetailsForm } from "./card-details-form";
import { CardExportActions } from "./card-export-actions";
import { CardSvg } from "./card-svg";

type Tab = "details" | "design" | "preview";

const TABS: { id: Tab; label: string; icon: typeof Eye; mobileOnly?: boolean }[] = [
  { id: "details", label: "Details", icon: PencilLine },
  { id: "design", label: "Design", icon: Palette },
  { id: "preview", label: "Preview", icon: Eye, mobileOnly: true },
];

const noopSubscribe = () => () => {};

/** False during prerender and hydration: the draft lives in localStorage and text is measured with a canvas. */
const useIsClient = () =>
  useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

/** Canvas measurers are cheap but cached per font, since every keystroke re-lays out the card. */
const measurers = new Map<string, ReturnType<Measurer>>();
const measure: Measurer = (family, size, weight) => {
  const key = `${family}|${size}|${weight}`;
  let fn = measurers.get(key);
  if (!fn) measurers.set(key, (fn = canvasMeasure(family, size, weight)));
  return fn;
};

export function BusinessCardTool() {
  if (!useIsClient()) {
    return (
      <div className="flex h-96 items-center justify-center rounded-2xl border border-border bg-surface">
        <Loader2 className="size-6 animate-spin text-brand" aria-label="Loading the card designer" />
      </div>
    );
  }
  return <CardEditor />;
}

function CardEditor() {
  const { draft, setDetails, setStyle, reset } = useCardDraft();
  const [tab, setTab] = useState<Tab>("details");

  const empty = isEmpty(draft.details);
  // Until the user types, show sample details so the design is visible.
  const shown = empty ? SAMPLE_DETAILS : draft.details;
  const { qr, notice } = useMemo(() => buildCardQr(shown, draft.style.qr), [shown, draft.style.qr]);
  const { front, back } = useMemo(() => renderCard({ details: shown, style: draft.style, qr, measure }), [shown, draft.style, qr]);

  return (
    <div className="grid gap-6 pb-36 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-start lg:pb-0">
      <section aria-label="Card editor" className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="inline-flex items-center gap-1.5 text-sm text-muted">
            <ShieldCheck className="size-4 text-success" /> Autosaved on this device
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.confirm("Start over? This clears your details, logo and design.") && reset()}
            disabled={empty && !draft.style.logo}
          >
            <RotateCcw /> Start over
          </Button>
        </div>

        <div role="tablist" aria-label="Editor sections" className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-surface-muted p-1">
          {TABS.map(({ id, label, icon: Icon, mobileOnly }) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`card-tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`card-panel-${id}`}
              onClick={() => setTab(id)}
              className={cn(
                "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-sm font-medium text-muted transition [&_svg]:size-4",
                "focus-visible:outline-2 focus-visible:outline-brand",
                tab === id && "bg-surface text-foreground shadow-sm",
                mobileOnly && "lg:hidden",
              )}
            >
              <Icon /> {label}
            </button>
          ))}
        </div>

        {/* On desktop the preview has its own column, so a stale "preview" tab falls back to Details. */}
        <div
          role="tabpanel"
          id="card-panel-details"
          aria-labelledby="card-tab-details"
          className={tab === "details" ? "block" : tab === "preview" ? "hidden lg:block" : "hidden"}
        >
          <CardDetailsForm details={draft.details} onChange={setDetails} />
        </div>
        <div role="tabpanel" id="card-panel-design" aria-labelledby="card-tab-design" className={tab === "design" ? "block" : "hidden"}>
          <CardDesignPanel style={draft.style} previewDetails={shown} measure={measure} qrNotice={notice} onChange={setStyle} />
        </div>
      </section>

      <aside className="space-y-4 lg:sticky lg:top-24">
        <div
          role="tabpanel"
          id="card-panel-preview"
          aria-labelledby="card-tab-preview"
          className={cn("space-y-4 rounded-2xl bg-surface-muted p-4 sm:p-6 lg:block", tab === "preview" ? "block" : "hidden")}
        >
          {empty && <p className="text-center text-xs text-muted">Sample details: start typing to make it yours.</p>}
          <figure className="space-y-1.5">
            <CardSvg svg={front} label="Front of the card" />
            <figcaption className="text-center text-xs text-muted">Front</figcaption>
          </figure>
          <figure className="space-y-1.5">
            <CardSvg svg={back} label="Back of the card" />
            <figcaption className="text-center text-xs text-muted">Back</figcaption>
          </figure>
        </div>
        <div className="z-20 max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:border-t max-lg:border-border max-lg:bg-surface/95 max-lg:p-4 max-lg:backdrop-blur">
          <CardExportActions
            front={front}
            back={back}
            details={draft.details}
            size={draft.style.size}
            disabledReason={draft.details.name.trim() ? null : "Add your name to download your card."}
          />
        </div>
      </aside>
    </div>
  );
}
