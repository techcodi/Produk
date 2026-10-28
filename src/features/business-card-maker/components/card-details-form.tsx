"use client";

import { TextArea } from "@/components/ui/text-area";
import { TextField } from "@/components/ui/text-field";
import type { CardDetails } from "../types";

interface CardDetailsFormProps {
  details: CardDetails;
  onChange: (patch: Partial<CardDetails>) => void;
}

export function CardDetailsForm({ details, onChange }: CardDetailsFormProps) {
  const field = (key: keyof CardDetails, label: string, extra: Partial<Parameters<typeof TextField>[0]> = {}) => (
    <TextField label={label} value={details[key]} onChange={(value) => onChange({ [key]: value })} maxLength={120} {...extra} />
  );

  return (
    <div className="space-y-4">
      <section className="space-y-4 rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <h3 className="text-base font-semibold">You</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {field("name", "Full name", { placeholder: "Ada Okafor", spellCheck: true, autoComplete: "name" })}
          {field("title", "Job title", { placeholder: "Creative Director", spellCheck: true, autoComplete: "organization-title" })}
          {field("company", "Company", { placeholder: "Lumen Studio", spellCheck: true, autoComplete: "organization" })}
          {field("tagline", "Tagline (back of card)", { placeholder: "Design that moves people", spellCheck: true })}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <h3 className="text-base font-semibold">Contact</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {field("phone", "Phone", { type: "tel", inputMode: "tel", placeholder: "+234 801 234 5678", autoComplete: "tel" })}
          {field("email", "Email", { type: "email", inputMode: "email", placeholder: "ada@lumen.studio", autoComplete: "email" })}
          {field("website", "Website", { inputMode: "url", placeholder: "lumen.studio", autoComplete: "url" })}
        </div>
        <TextArea
          label="Address"
          rows={2}
          value={details.address}
          onChange={(address) => onChange({ address })}
          placeholder={"12 Admiralty Way, Lekki\nLagos, Nigeria"}
          maxLength={300}
          hint="Up to two lines fit on the card."
        />
      </section>
    </div>
  );
}
