"use client";

import { useMemo, useSyncExternalStore } from "react";
import { BadgeCheck, Cake, Heart, Loader2, Mail, Ticket } from "lucide-react";
import { ToolWorkspace } from "@/components/files/tool-workspace";
import { cn } from "@/lib/cn";
import { canvasMeasure } from "@/lib/svg";
import { getFormat, KINDS } from "../constants";
import { cardFileStem, renderCard } from "../core/render";
import { useCardMaker } from "../hooks/use-card-maker";
import type { CardKind, MeasureFactory } from "../types";
import { CardExportActions } from "./card-export-actions";
import { CardForm } from "./card-form";
import { CardPreview } from "./card-preview";

const KIND_ICONS: Record<CardKind, typeof Cake> = {
  birthday: Cake,
  thankyou: Heart,
  invitation: Mail,
  pass: Ticket,
  membership: BadgeCheck,
};

const noopSubscribe = () => () => {};

/** False during prerender and hydration, true after: drafts live in localStorage and text is measured with a canvas. */
const useIsClient = () =>
  useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

export function CardMakerTool() {
  if (!useIsClient()) {
    return (
      <div className="flex h-96 items-center justify-center rounded-2xl border border-border bg-surface">
        <Loader2 className="size-6 animate-spin text-brand" aria-label="Loading the card maker" />
      </div>
    );
  }
  return <CardEditor />;
}

const measure: MeasureFactory = (family, size, weight) => canvasMeasure(family, size, weight);

function CardEditor() {
  const { kind, draft, dispatch } = useCardMaker();
  const format = getFormat(kind, draft.format);
  const svg = useMemo(() => renderCard({ kind, draft, measure }), [kind, draft]);
  const fileStem = cardFileStem(kind, draft);
  const aspect = format.widthMm / format.heightMm;

  return (
    <ToolWorkspace
      mainLabel="Card editor"
      settingsTitle="Preview"
      settings={<CardPreview svg={svg} aspect={aspect} className="max-lg:hidden" />}
      action={<CardExportActions svg={svg} format={format} fileStem={fileStem} />}
    >
      <div role="tablist" aria-label="Card type" className="grid grid-cols-5 gap-1 rounded-xl bg-surface-muted p-1">
        {KINDS.map(({ id, label }) => {
          const Icon = KIND_ICONS[id];
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={kind === id}
              onClick={() => dispatch({ type: "kind", kind: id })}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-xs font-medium text-muted transition sm:flex-row sm:text-sm [&_svg]:size-4",
                "focus-visible:outline-2 focus-visible:outline-brand",
                kind === id && "bg-surface text-foreground shadow-sm",
              )}
            >
              <Icon /> <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>

      {/* On phones the sidebar sits below the form, so show the preview up top too. */}
      <CardPreview svg={svg} aspect={aspect} className="lg:hidden" />

      <CardForm kind={kind} draft={draft} dispatch={dispatch} />
    </ToolWorkspace>
  );
}
