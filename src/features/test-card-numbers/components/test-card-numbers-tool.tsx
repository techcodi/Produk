"use client";

import { useState } from "react";
import { ExternalLink, Search, ShieldAlert } from "lucide-react";
import { SegmentedControl, type SegmentedOption } from "@/components/ui/segmented-control";
import { cn } from "@/lib/cn";
import { CHECKED_ON, PROVIDERS, TEST_CARDS } from "../constants";
import type { Outcome, ProviderId, TestCard } from "../types";
import { CARD_DESIGNS, CardFace, designFor, type CardDesignId } from "./card-face";
import { CardChecker } from "./card-checker";

type OutcomeFilter = Outcome | "all";

const PROVIDER_OPTIONS: SegmentedOption<ProviderId>[] = PROVIDERS.map((p) => ({ value: p.id, label: p.name }));

const OUTCOME_OPTIONS: SegmentedOption<OutcomeFilter>[] = [
  { value: "all", label: "All" },
  { value: "success", label: "Success" },
  { value: "declined", label: "Declined" },
  { value: "authentication", label: "Auth / 3DS" },
];

const OUTCOME_STYLES: Record<Outcome, { label: string; className: string }> = {
  success: { label: "Success", className: "bg-success-soft text-success" },
  declined: { label: "Declined", className: "bg-danger-soft text-danger" },
  authentication: { label: "Authentication", className: "bg-brand-soft text-brand" },
};

export function TestCardNumbersTool() {
  const [providerId, setProviderId] = useState<ProviderId>("stripe");
  const [outcome, setOutcome] = useState<OutcomeFilter>("all");
  const [query, setQuery] = useState("");
  const [design, setDesign] = useState<CardDesignId | "mixed">("mixed");

  const provider = PROVIDERS.find((p) => p.id === providerId)!;
  const needle = query.trim().toLowerCase();
  // Text matches brand or scenario; digits (spaces ignored) match the card number.
  const matches = (card: TestCard) =>
    !needle ||
    `${card.brand} ${card.scenario}`.toLowerCase().includes(needle) ||
    (/^[\d\s]+$/.test(needle) && card.number.includes(needle.replace(/\s/g, "")));
  const cards = TEST_CARDS.filter(
    (card) => card.provider === providerId && (outcome === "all" || card.outcome === outcome) && matches(card),
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <section aria-label="Test cards" className="min-w-0 space-y-4">
        <p className="flex items-start gap-2.5 rounded-xl bg-surface-muted p-3 text-sm">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
          <span>
            These are the providers’ own <strong>sandbox</strong> cards. They only work with test-mode keys and can’t
            pay for anything.
          </span>
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <SegmentedControl label="Provider" value={providerId} options={PROVIDER_OPTIONS} onChange={setProviderId} />
          <SegmentedControl label="Scenario" value={outcome} options={OUTCOME_OPTIONS} onChange={setOutcome} />
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search brand, scenario or number"
            aria-label="Search test cards"
            className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm outline-none focus-visible:outline-2 focus-visible:outline-brand"
          />
        </div>

        <div className="rounded-xl border border-border bg-surface p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">{provider.name}</p>
            <a
              href={provider.docsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-brand underline-offset-2 hover:underline"
            >
              Official docs <ExternalLink className="size-3.5" aria-hidden />
            </a>
          </div>
          <p className="mt-1 text-muted">
            Expiry: {provider.defaults.expiry} · CVC: {provider.defaults.cvc}
          </p>
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-muted">
            {provider.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Card design">
          <span className="mr-1 text-sm font-medium">Design</span>
          {[{ id: "mixed" as const, name: "Mixed", face: "bg-[conic-gradient(#4338ca,#0891b2,#ea580c,#10b981,#9333ea,#4338ca)]" }, ...CARD_DESIGNS].map(
            (option) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={design === option.id}
                aria-label={option.name}
                title={option.name}
                onClick={() => setDesign(option.id)}
                className={cn(
                  "size-7 rounded-full ring-offset-2 ring-offset-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                  option.face,
                  design === option.id && "ring-2 ring-foreground",
                )}
              />
            ),
          )}
        </div>

        {cards.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">No cards match.</p>
        ) : (
          <ul className="grid gap-x-5 gap-y-6 sm:grid-cols-2">
            {cards.map((card, index) => {
              const style = OUTCOME_STYLES[card.outcome];
              return (
                <li key={`${card.number}-${card.scenario}`}>
                  <CardFace
                    card={card}
                    provider={provider}
                    design={design === "mixed" ? designFor(card, index) : design}
                    badge={<span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-medium", style.className)}>{style.label}</span>}
                  />
                </li>
              );
            })}
          </ul>
        )}

        <p className="text-xs text-muted">
          Checked against each provider’s documentation on {CHECKED_ON}. Providers change their test data occasionally;
          if a card stops working, check the official docs.
        </p>
      </section>

      <aside className="lg:sticky lg:top-24">
        <CardChecker />
      </aside>
    </div>
  );
}
