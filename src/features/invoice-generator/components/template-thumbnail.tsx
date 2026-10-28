import { cn } from "@/lib/cn";
import type { TemplateId } from "../types";

// These depict paper, which stays white in dark mode just like the PDF — hence raw colours, not theme tokens.

/** Placeholder text lines. */
const Bar = ({ className }: { className?: string }) => <div className={cn("h-1 rounded-full bg-gray-300", className)} />;

const TableRows = ({ accent, header = "line" }: { accent: string; header?: "line" | "fill" | "dark" }) => (
  <div className="space-y-1">
    <div
      className={cn("h-1.5 rounded-[1px]", header === "line" && "h-0.5")}
      style={{ background: header === "dark" ? "#111827" : accent }}
    />
    {[0, 1, 2].map((row) => (
      <div key={row} className="flex justify-between">
        <Bar className="w-1/2" />
        <Bar className="w-1/6" />
      </div>
    ))}
  </div>
);

/** A tiny schematic of each layout, tinted with the current accent colour. */
export function TemplateThumbnail({ template, accent }: { template: TemplateId; accent: string }) {
  return (
    <div className="relative flex aspect-[3/4] flex-col gap-2 overflow-hidden rounded-md bg-white p-2.5 shadow-sm ring-1 ring-black/5">
      {template === "classic" && (
        <>
          <div className="flex justify-between">
            <div className="w-1/3 space-y-1">
              <Bar className="bg-gray-500" />
              <Bar />
            </div>
            <div className="h-2 w-1/3 rounded-sm" style={{ background: accent }} />
          </div>
          <div className="h-px" style={{ background: accent }} />
          <TableRows accent={accent} />
        </>
      )}
      {template === "modern" && (
        <>
          <div className="flex h-6 items-center justify-between rounded-sm px-1.5" style={{ background: accent }}>
            <div className="h-1.5 w-1/3 rounded-full bg-white/90" />
            <div className="h-1 w-1/4 rounded-full bg-white/60" />
          </div>
          <TableRows accent={accent} header="fill" />
        </>
      )}
      {template === "minimal" && (
        <>
          <Bar className="w-1/3 bg-gray-500" />
          <div className="mt-1 h-2 w-1/2 rounded-sm bg-gray-700" />
          <div className="h-px bg-gray-200" />
          <TableRows accent="#9ca3af" />
        </>
      )}
      {template === "bold" && (
        <>
          <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: accent }} />
          <div className="ml-1 h-3 w-2/3 rounded-sm bg-gray-900" />
          <div className="ml-1">
            <TableRows accent={accent} header="dark" />
          </div>
          <div className="ml-auto h-2 w-1/2 rounded-sm" style={{ background: accent }} />
        </>
      )}
      {template === "elegant" && (
        <>
          <Bar className="mx-auto w-1/2 bg-gray-500" />
          <div className="space-y-0.5">
            <div className="h-px" style={{ background: accent }} />
            <div className="h-px opacity-60" style={{ background: accent }} />
          </div>
          <div className="mx-auto h-1.5 w-1/3 rounded-full" style={{ background: accent }} />
          <TableRows accent={accent} />
        </>
      )}
    </div>
  );
}
