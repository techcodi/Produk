import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { toolHref, type ToolDefinition } from "@/config/tools";
import { cn } from "@/lib/cn";

export function ToolCard({ tool }: { tool: ToolDefinition }) {
  const live = tool.status === "live";
  const Icon = tool.icon;

  const body = (
    <>
      <div className="flex items-start justify-between">
        <div className={cn("flex size-11 items-center justify-center rounded-xl", live ? "bg-brand text-brand-foreground" : "bg-surface-muted text-muted")}>
          <Icon className="size-5" />
        </div>
        {live ? (
          <ArrowUpRight className="size-5 text-muted transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand" />
        ) : (
          <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-muted">Coming soon</span>
        )}
      </div>
      <h3 className="mt-5 font-semibold">{tool.name}</h3>
      <p className="mt-1 text-sm text-muted">{tool.tagline}</p>
    </>
  );

  const base = "group block rounded-2xl border border-border bg-surface p-5 transition";

  return live ? (
    <Link href={toolHref(tool)} className={cn(base, "hover:border-brand hover:shadow-md focus-visible:outline-2 focus-visible:outline-brand")}>
      {body}
    </Link>
  ) : (
    <div className={cn(base, "opacity-70")} aria-disabled>
      {body}
    </div>
  );
}
