"use client";

import { useId, useState } from "react";
import { CheckCircle2, CircleHelp, XCircle } from "lucide-react";
import { PROVIDERS, TEST_CARDS } from "../constants";
import { checkCardNumber, formatCardNumber } from "../core/card-number";

function Result({ ok, label }: { ok: boolean; label: string }) {
  const Icon = ok ? CheckCircle2 : XCircle;
  return (
    <li className="flex items-center gap-2">
      <Icon className={ok ? "size-4 text-success" : "size-4 text-danger"} aria-hidden />
      <span>
        {label}: <span className="font-medium">{ok ? "valid" : "invalid"}</span>
      </span>
    </li>
  );
}

/** Format check only, run on this device; nothing is sent anywhere. */
export function CardChecker() {
  const id = useId();
  const [input, setInput] = useState("");
  const check = checkCardNumber(input);
  const known = TEST_CARDS.filter((card) => card.number === check.digits);
  const providerName = (providerId: string) => PROVIDERS.find((p) => p.id === providerId)?.name ?? providerId;

  return (
    <section aria-labelledby={`${id}-title`} className="space-y-4 rounded-2xl border border-border bg-surface p-5">
      <div>
        <h2 id={`${id}-title`} className="text-base font-semibold">
          Card number checker
        </h2>
        <p className="mt-0.5 text-sm text-muted">See a number’s brand and whether its format is valid.</p>
      </div>

      <div>
        <label htmlFor={id} className="mb-2 block text-sm font-medium">
          Card number
        </label>
        <input
          id={id}
          value={formatCardNumber(check.digits)}
          onChange={(event) => setInput(event.target.value)}
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          maxLength={23}
          placeholder="4242 4242 4242 4242"
          className="h-11 w-full rounded-lg border border-border bg-surface px-3 font-mono text-base tracking-wide outline-none focus-visible:outline-2 focus-visible:outline-brand"
        />
      </div>

      {check.digits.length >= 12 ? (
        <div className="space-y-3 text-sm" aria-live="polite">
          <p>
            Brand: <span className="font-medium">{check.brand ?? "Unknown"}</span>
            <span className="text-muted"> · {check.digits.length} digits</span>
          </p>
          <ul className="space-y-1.5">
            <Result ok={check.lengthOk} label="Length" />
            <Result ok={check.luhnOk} label="Checksum (Luhn)" />
          </ul>
          {known.length > 0 && (
            <div className="rounded-lg bg-brand-soft p-3">
              <p className="font-medium">This is a known test card</p>
              <ul className="mt-1 space-y-0.5 text-muted">
                {known.map((card) => (
                  <li key={`${card.provider}-${card.scenario}`}>
                    {providerName(card.provider)}: {card.scenario}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted">
          <CircleHelp className="size-4" aria-hidden /> Enter at least 12 digits.
        </p>
      )}

      <p className="text-xs text-muted">
        This only checks the number’s format. It can’t tell whether a card exists or has money on it. Checked on your
        device; nothing is sent anywhere. Don’t paste real card numbers into websites you don’t trust.
      </p>
    </section>
  );
}
