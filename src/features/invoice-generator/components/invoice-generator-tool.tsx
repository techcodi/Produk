"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { Eye, FilePlus2, FolderOpen, Loader2, Palette, PencilLine, Save, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { createOutputFile, releaseOutputFile, triggerDownload } from "@/lib/download";
import { sanitizeFileName } from "@/lib/files";
import { importDraft, InvoiceImportError, serializeDraft, startNextInvoice } from "../core/draft";
import { useInvoiceDraft } from "../hooks/use-invoice-draft";
import { useInvoicePreview } from "../hooks/use-invoice-preview";
import { DesignPanel } from "./design-panel";
import { ExportActions } from "./export-actions";
import { InvoiceDetailsForm } from "./invoice-details-form";
import { InvoicePreview } from "./invoice-preview";

type Tab = "details" | "design" | "preview";

const TABS: { id: Tab; label: string; icon: typeof Eye; mobileOnly?: boolean }[] = [
  { id: "details", label: "Details", icon: PencilLine },
  { id: "design", label: "Design", icon: Palette },
  { id: "preview", label: "Preview", icon: Eye, mobileOnly: true },
];

const noopSubscribe = () => () => {};

/** False during prerender and hydration, true after — the draft lives in localStorage, which only the browser has. */
const useIsClient = () =>
  useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

export function InvoiceGeneratorTool() {
  if (!useIsClient()) {
    return (
      <div className="flex h-96 items-center justify-center rounded-2xl border border-border bg-surface">
        <Loader2 className="size-6 animate-spin text-brand" aria-label="Loading the invoice editor" />
      </div>
    );
  }
  return <InvoiceEditor />;
}

function InvoiceEditor() {
  const { draft, dispatch } = useInvoiceDraft();
  const preview = useInvoicePreview(draft);
  const [tab, setTab] = useState<Tab>("details");
  const [fileError, setFileError] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const startNew = () => {
    if (window.confirm("Start a new invoice? Your business details, design and payment info are kept; the client, items and amounts are cleared.")) {
      dispatch({ type: "replace", draft: startNextInvoice(draft) });
      setTab("details");
    }
  };

  const saveFile = () => {
    const name = sanitizeFileName([draft.data.title, draft.data.number].join(" "), "json", "invoice");
    const file = createOutputFile(new Blob([serializeDraft(draft)], { type: "application/json" }), name);
    triggerDownload(file.url, file.fileName);
    setTimeout(() => releaseOutputFile(file), 10_000);
  };

  const openFile = async (file: File | undefined) => {
    if (!file) return;
    setFileError(null);
    try {
      dispatch({ type: "replace", draft: importDraft(await file.text()) });
    } catch (error) {
      setFileError(error instanceof InvoiceImportError ? `${error.message}. Choose a .json file saved from this tool.` : "That file couldn’t be opened.");
    }
  };

  return (
    <div className="grid gap-6 pb-28 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:items-start lg:pb-0">
      <section aria-label="Invoice editor" className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="inline-flex items-center gap-1.5 text-sm text-muted">
            <ShieldCheck className="size-4 text-success" /> Autosaved on this device
          </p>
          <div className="flex flex-wrap gap-1">
            <Button variant="ghost" size="sm" onClick={startNew}>
              <FilePlus2 /> New
            </Button>
            <Button variant="ghost" size="sm" onClick={() => importRef.current?.click()}>
              <FolderOpen /> Open
            </Button>
            <Button variant="ghost" size="sm" onClick={saveFile} title="Save an editable copy you can open again later">
              <Save /> Save copy
            </Button>
            <input
              ref={importRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(event) => {
                void openFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </div>
        </div>

        {fileError && (
          <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">
            {fileError}
          </p>
        )}

        <div role="tablist" aria-label="Editor sections" className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-surface-muted p-1">
          {TABS.map(({ id, label, icon: Icon, mobileOnly }) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`invoice-tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`invoice-panel-${id}`}
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
          id="invoice-panel-details"
          aria-labelledby="invoice-tab-details"
          className={cn(tab === "details" ? "block" : tab === "preview" ? "hidden lg:block" : "hidden")}
        >
          <InvoiceDetailsForm data={draft.data} dispatch={dispatch} />
        </div>
        <div role="tabpanel" id="invoice-panel-design" aria-labelledby="invoice-tab-design" className={tab === "design" ? "block" : "hidden"}>
          <DesignPanel style={draft.style} dispatch={dispatch} />
        </div>
      </section>

      <aside className="space-y-4 lg:sticky lg:top-24">
        <div
          role="tabpanel"
          id="invoice-panel-preview"
          aria-labelledby="invoice-tab-preview"
          className={cn(
            "rounded-2xl bg-surface-muted p-3 sm:p-4 lg:block lg:max-h-[calc(100dvh-13rem)] lg:overflow-y-auto",
            tab === "preview" ? "block" : "hidden",
          )}
        >
          <InvoicePreview preview={preview} pageSize={draft.style.pageSize} />
        </div>
        <div className="z-20 max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:border-t max-lg:border-border max-lg:bg-surface/95 max-lg:p-4 max-lg:backdrop-blur">
          <ExportActions draft={draft} />
        </div>
      </aside>
    </div>
  );
}
