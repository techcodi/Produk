"use client";

import { useState, type ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatCardNumber } from "../core/card-number";
import type { Provider, TestCard } from "../types";
import { CopyButton } from "./copy-button";

/**
 * Card faces are pictures of a physical card, so they keep fixed colours
 * (not theme tokens) and look the same in light and dark mode.
 */
export const CARD_DESIGNS = [
  { id: "midnight", name: "Midnight", face: "bg-[linear-gradient(135deg,#1e1b4b_0%,#312e81_55%,#4338ca_100%)]" },
  { id: "aurora", name: "Aurora", face: "bg-[linear-gradient(135deg,#0f766e_0%,#0891b2_50%,#6366f1_100%)]" },
  { id: "sunset", name: "Sunset", face: "bg-[linear-gradient(135deg,#be123c_0%,#ea580c_60%,#f59e0b_100%)]" },
  { id: "graphite", name: "Graphite", face: "bg-[linear-gradient(135deg,#111827_0%,#374151_60%,#4b5563_100%)]" },
  { id: "emerald", name: "Emerald", face: "bg-[linear-gradient(135deg,#064e3b_0%,#047857_55%,#10b981_100%)]" },
  { id: "orchid", name: "Orchid", face: "bg-[linear-gradient(135deg,#581c87_0%,#9333ea_55%,#db2777_100%)]" },
] as const;

export type CardDesignId = (typeof CARD_DESIGNS)[number]["id"];

/** Stable "mixed" design per card, so the grid looks varied but never reshuffles. */
export function designFor(card: TestCard, index: number): CardDesignId {
  let hash = index;
  for (const char of card.number) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return CARD_DESIGNS[hash % CARD_DESIGNS.length].id;
}

/** The scheme name as plain text: a label, deliberately not the schemes' trademarked logos. */
function BrandMark({ brand }: { brand: string }) {
  const name = brand.replace(/\s*\(.*\)$/, "").split(" / ")[0];
  return <span className="text-right text-lg font-extrabold uppercase italic leading-none tracking-tight drop-shadow-sm">{name}</span>;
}

/** The gold contact chip, drawn in CSS. */
function Chip() {
  return (
    <span
      aria-hidden
      className="relative block h-7 w-9 overflow-hidden rounded-md bg-[linear-gradient(135deg,#fde68a,#d4a017_60%,#fbbf24)] shadow-inner ring-1 ring-black/10"
    >
      <span className="absolute inset-x-0 top-1/2 h-px bg-black/20" />
      <span className="absolute inset-y-0 left-1/3 w-px bg-black/20" />
      <span className="absolute inset-y-0 right-1/3 w-px bg-black/20" />
    </span>
  );
}

interface CardFaceProps {
  card: TestCard;
  provider: Provider;
  design: CardDesignId;
  /** Shown above the caption, e.g. the outcome. */
  badge?: ReactNode;
}

export function CardFace({ card, provider, design, badge }: CardFaceProps) {
  const [flipped, setFlipped] = useState(false);
  const face = CARD_DESIGNS.find((d) => d.id === design)?.face;
  const expiry = card.expiry ?? (provider.defaults.expiry.startsWith("Any future") ? "12/34" : "—");
  const cvc = card.cvc ?? (/amex|american express/i.test(card.brand) ? "Any 4" : "Any 3");
  const secrets = [
    ["CVC", cvc],
    ["PIN", card.pin],
    ["OTP", card.otp],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  const sides = "absolute inset-0 overflow-hidden rounded-2xl text-white shadow-lg ring-1 ring-black/10 [backface-visibility:hidden]";

  return (
    <div className="space-y-2">
      <div className="@container relative aspect-[85.6/53.98] [perspective:1200px]">
        <div
          className={cn(
            "relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] motion-reduce:transition-none",
            flipped && "[transform:rotateY(180deg)]",
          )}
        >
          {/* Front */}
          <div className={cn(sides, face)} aria-hidden={flipped}>
            <div className="pointer-events-none absolute -right-10 -top-16 size-48 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 size-56 rounded-full bg-white/5" />
            <div className="relative flex h-full flex-col justify-between p-[6%]">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold leading-tight">{provider.name}</p>
                  <p className="mt-0.5 inline-block rounded bg-white/20 px-1.5 py-px text-[0.6rem] font-bold uppercase tracking-widest">
                    Test card · Sandbox
                  </p>
                </div>
                <BrandMark brand={card.brand} />
              </div>
              <Chip />
              <div>
                <CopyButton
                  value={card.number}
                  label={`${card.brand} card number`}
                  className="-ml-1.5 font-mono text-[clamp(0.95rem,4.2cqw,1.35rem)] tracking-[0.12em] text-white hover:bg-white/15 [text-shadow:0_1px_2px_rgb(0_0_0/0.35)]"
                >
                  {formatCardNumber(card.number)}
                </CopyButton>
                <div className="mt-1.5 flex items-end justify-between gap-2 text-[0.65rem] uppercase tracking-wider">
                  <div>
                    <p className="text-white/70">Cardholder</p>
                    <p className="text-xs font-semibold">Test Cardholder</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/70">Valid thru</p>
                    <p className="font-mono text-xs font-semibold">{expiry}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Back */}
          <div className={cn(sides, face, "[transform:rotateY(180deg)]")} aria-hidden={!flipped}>
            <div className="mt-[7%] h-[18%] bg-black/80" />
            <div className="flex flex-col gap-3 p-[6%]">
              <div className="flex items-center gap-2">
                <div className="h-8 flex-1 rounded bg-[repeating-linear-gradient(-45deg,#f8fafc_0_6px,#e2e8f0_6px_12px)]" />
                {secrets
                  .filter(([name]) => name === "CVC")
                  .map(([name, value]) => (
                    <span key={name} className="rounded bg-white px-2 py-1 font-mono text-sm font-semibold italic text-gray-900">
                      {value}
                    </span>
                  ))}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {secrets.map(([name, value]) => (
                  <span key={name} className="inline-flex items-center gap-1">
                    <span className="uppercase tracking-wider text-white/70">{name}</span>
                    <CopyButton value={value} label={name} className="font-mono font-semibold text-white hover:bg-white/15">
                      {value}
                    </CopyButton>
                  </span>
                ))}
              </div>
              <p className="text-[0.6rem] uppercase tracking-widest text-white/70">
                Sandbox only · works with test-mode keys · not a real card
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          {badge}
          <p className="text-sm font-medium">{card.scenario}</p>
          <p className="text-xs text-muted">{card.brand}</p>
        </div>
        <button
          type="button"
          onClick={() => setFlipped((value) => !value)}
          aria-pressed={flipped}
          className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-muted hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand"
        >
          <RotateCcw className="size-3.5" aria-hidden /> {flipped ? "Show front" : `Show ${secrets.map(([n]) => n).join(" / ")}`}
        </button>
      </div>
    </div>
  );
}
