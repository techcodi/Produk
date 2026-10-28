"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Download, Loader2, Mail, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createOutputFile, releaseOutputFile, triggerDownload, type OutputFile } from "@/lib/download";
import { invoiceFileName } from "../core/document";
import { renderInvoicePdf } from "../core/render-pdf";
import { canShareFiles, emailLink, sharePdf } from "../core/share";
import type { InvoiceDraft } from "../types";

type Busy = "download" | "share" | null;

/** Download and share. Both build a fresh PDF, so they always match what's on screen. */
export function ExportActions({ draft }: { draft: InvoiceDraft }) {
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  // Checked once on mount — this component only ever renders on the client.
  const [shareFiles] = useState(canShareFiles);
  const lastFileRef = useRef<OutputFile | null>(null);

  useEffect(
    () => () => {
      if (lastFileRef.current) releaseOutputFile(lastFileRef.current);
    },
    [],
  );

  const run = async (kind: Exclude<Busy, null>, action: (blob: Blob, fileName: string) => Promise<void>) => {
    setBusy(kind);
    setError(null);
    try {
      await action(await renderInvoicePdf(draft), invoiceFileName(draft.data));
    } catch (cause) {
      console.error(cause);
      setError(kind === "share" ? "Sharing failed. Download the PDF and send it instead." : "The PDF could not be created. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const download = async (blob: Blob, fileName: string) => {
    if (lastFileRef.current) releaseOutputFile(lastFileRef.current);
    const file = createOutputFile(blob, fileName);
    lastFileRef.current = file;
    triggerDownload(file.url, file.fileName);
  };

  const share = async (blob: Blob, fileName: string) => {
    if (shareFiles) {
      await sharePdf(blob, fileName, draft.data);
      return;
    }
    // No system share sheet (most desktop browsers): download it and open a pre-filled email to attach it to.
    await download(blob, fileName);
    window.location.href = emailLink(draft.data, fileName);
  };

  return (
    <div className="space-y-3">
      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-lg bg-danger-soft p-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {error}
        </div>
      )}
      <div className="flex gap-2">
        <Button size="lg" className="flex-1" onClick={() => run("download", download)} disabled={busy !== null}>
          {busy === "download" ? <Loader2 className="animate-spin" /> : <Download />}
          Download PDF
        </Button>
        <Button
          size="lg"
          variant="secondary"
          onClick={() => run("share", share)}
          disabled={busy !== null}
          title={shareFiles ? "Share via WhatsApp, email, Drive and more" : "Download and attach to an email"}
        >
          {busy === "share" ? <Loader2 className="animate-spin" /> : shareFiles ? <Share2 /> : <Mail />}
          <span className="max-sm:sr-only">{shareFiles ? "Share" : "Email"}</span>
        </Button>
      </div>
    </div>
  );
}
