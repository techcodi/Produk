"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, FileDown, ImageDown, Loader2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createOutputFile, releaseOutputFile, triggerDownload, type OutputFile } from "@/lib/download";
import { canShareFile, shareFile } from "@/lib/share";
import { cardToPdf, cardToPng } from "../core/export";
import type { CardFormat } from "../types";

type Busy = "png" | "pdf" | "share" | null;

interface CardExportActionsProps {
  svg: string;
  format: CardFormat;
  fileStem: string;
}

export function CardExportActions({ svg, format, fileStem }: CardExportActionsProps) {
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  // Checked once on mount — this component only renders on the client.
  const [canShare] = useState(() => canShareFile("image/png", "card.png"));
  const lastFileRef = useRef<OutputFile | null>(null);

  useEffect(
    () => () => {
      if (lastFileRef.current) releaseOutputFile(lastFileRef.current);
    },
    [],
  );

  const download = (blob: Blob | Uint8Array, name: string, type?: string) => {
    if (lastFileRef.current) releaseOutputFile(lastFileRef.current);
    const file = createOutputFile(blob, name, type);
    lastFileRef.current = file;
    triggerDownload(file.url, file.fileName);
  };

  const run = async (kind: Exclude<Busy, null>, action: () => Promise<void>) => {
    setBusy(kind);
    setError(null);
    try {
      await action();
    } catch (cause) {
      console.error(cause);
      setError(kind === "share" ? "Sharing failed. Download the image and send it instead." : "The card couldn’t be exported. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const icon = (kind: Busy, Icon: typeof FileDown) => (busy === kind ? <Loader2 className="animate-spin" /> : <Icon />);

  return (
    <div className="space-y-3">
      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-lg bg-danger-soft p-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {error}
        </div>
      )}
      <div className="flex gap-2">
        <Button
          size="lg"
          className="flex-1"
          disabled={busy !== null}
          onClick={() => run("pdf", async () => download(await cardToPdf(svg, format, fileStem), `${fileStem}.pdf`, "application/pdf"))}
        >
          {icon("pdf", FileDown)} PDF
        </Button>
        <Button
          size="lg"
          variant="secondary"
          className="flex-1"
          disabled={busy !== null}
          onClick={() => run("png", async () => download(await cardToPng(svg, format), `${fileStem}.png`))}
        >
          {icon("png", ImageDown)} PNG
        </Button>
        {canShare && (
          <Button
            size="lg"
            variant="secondary"
            aria-label="Share"
            disabled={busy !== null}
            onClick={() =>
              run("share", async () => {
                const png = await cardToPng(svg, format);
                await shareFile(new File([png], `${fileStem}.png`, { type: "image/png" }), { title: fileStem });
              })
            }
          >
            {icon("share", Share2)}
          </Button>
        )}
      </div>
      <p className="text-xs text-muted">
        {format.widthMm} × {format.heightMm} mm · print-ready PDF and high-resolution PNG
      </p>
    </div>
  );
}
