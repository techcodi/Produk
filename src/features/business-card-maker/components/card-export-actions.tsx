"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Download, FileImage, Loader2, Printer, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createOutputFile, releaseOutputFile, triggerDownload, type OutputFile } from "@/lib/download";
import { canShareFile, shareFile } from "@/lib/share";
import { exportCard, type ExportKind } from "../core/export";
import type { CardDetails, CardSizeId } from "../types";

interface CardExportActionsProps {
  front: string;
  back: string;
  details: CardDetails;
  size: CardSizeId;
  /** Exports stay off until there's at least a name; the preview shows sample text before that. */
  disabledReason: string | null;
}

type Busy = ExportKind | "share" | null;

export function CardExportActions({ front, back, details, size, disabledReason }: CardExportActionsProps) {
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [canShare] = useState(() => canShareFile("image/png", "card.png"));
  const lastRef = useRef<OutputFile | null>(null);

  useEffect(
    () => () => {
      if (lastRef.current) releaseOutputFile(lastRef.current);
    },
    [],
  );

  const run = async (kind: Exclude<Busy, null>) => {
    setBusy(kind);
    setError(null);
    try {
      const file = await exportCard(kind === "share" ? "png" : kind, { front, back, details, size });
      if (kind === "share") {
        await shareFile(new File([file.blob], file.fileName, { type: "image/png" }), { title: file.fileName });
        return;
      }
      if (lastRef.current) releaseOutputFile(lastRef.current);
      lastRef.current = createOutputFile(file.blob, file.fileName);
      triggerDownload(lastRef.current.url, lastRef.current.fileName);
    } catch (cause) {
      console.error(cause);
      setError(kind === "share" ? "Sharing failed. Download the image and send it instead." : "The file could not be created. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const disabled = busy !== null || disabledReason !== null;
  const icon = (kind: Busy, Icon: typeof Download) => (busy === kind ? <Loader2 className="animate-spin" /> : <Icon />);

  return (
    <div className="space-y-3">
      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-lg bg-danger-soft p-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {error}
        </div>
      )}
      {disabledReason && <p className="text-sm text-muted">{disabledReason}</p>}
      <Button size="lg" className="w-full" onClick={() => run("card-pdf")} disabled={disabled}>
        {icon("card-pdf", Download)} Download PDF
      </Button>
      <div className="grid auto-cols-fr grid-flow-col gap-2">
        <Button variant="secondary" className="px-2" onClick={() => run("sheet-pdf")} disabled={disabled} title="10 cards on an A4 page with crop marks">
          {icon("sheet-pdf", Printer)} <span className="whitespace-nowrap">A4 sheet</span>
        </Button>
        <Button variant="secondary" className="px-2" onClick={() => run("png")} disabled={disabled}>
          {icon("png", FileImage)} PNG
        </Button>
        {canShare && (
          <Button variant="secondary" className="px-2" onClick={() => run("share")} disabled={disabled}>
            {icon("share", Share2)} Share
          </Button>
        )}
      </div>
      <p className="text-xs text-muted max-lg:hidden">
        The PDF has the front and back at exact size, 300 dpi. The A4 sheet prints 10 cards per side: print double-sided, flipping on the long edge, then cut along the marks.
      </p>
    </div>
  );
}
