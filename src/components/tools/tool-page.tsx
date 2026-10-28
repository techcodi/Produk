import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import type { ToolDefinition } from "@/config/tools";
import { jsonLdHtml, toolJsonLd } from "@/lib/metadata";

/** Shared chrome for every tool page: heading, privacy promise, and "how it works". */
export function ToolPage({ tool, children }: { tool: ToolDefinition; children: ReactNode }) {
  const Icon = tool.icon;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdHtml(toolJsonLd(tool))} />
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground">
            <Icon className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{tool.name}</h1>
            <p className="mt-1 max-w-xl text-muted">{tool.description}</p>
          </div>
        </div>
        <p className="inline-flex items-center gap-1.5 self-start rounded-full bg-success-soft px-3 py-1 text-xs font-medium text-success sm:self-auto">
          <ShieldCheck className="size-3.5" /> Processed locally · nothing uploaded
        </p>
      </header>

      {children}

      {tool.steps && (
        <section className="mt-16 border-t border-border pt-10">
          <h2 className="text-lg font-semibold">How it works</h2>
          <ol className="mt-5 grid gap-4 sm:grid-cols-3">
            {tool.steps.map((step, index) => (
              <li key={step} className="rounded-xl bg-surface-muted p-4 text-sm">
                <span className="mb-2 flex size-7 items-center justify-center rounded-full bg-brand text-xs font-semibold text-brand-foreground">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
