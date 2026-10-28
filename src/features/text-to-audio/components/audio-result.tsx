"use client";

import { useState } from "react";
import { Download, Share2 } from "lucide-react";
import { Button, buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { OutputFile } from "@/lib/download";
import { formatBytes } from "@/lib/format";
import { canShareFile, shareFile } from "@/lib/share";

export const formatDuration = (seconds: number) => {
  const total = Math.max(1, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

export function AudioResult({ file, durationSeconds, aiVoice }: { file: OutputFile; durationSeconds: number; aiVoice?: boolean }) {
  const [canShare] = useState(() => canShareFile("audio/wav", "audio.wav"));
  const [shareError, setShareError] = useState(false);

  const share = async () => {
    setShareError(false);
    try {
      const blob = await (await fetch(file.url)).blob();
      await shareFile(new File([blob], file.fileName, { type: "audio/wav" }), { title: file.fileName });
    } catch (error) {
      console.error(error);
      setShareError(true);
    }
  };

  return (
    <section aria-label="Your audio" className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">Your audio</h2>
        <p className="text-sm text-muted tabular-nums">
          {formatDuration(durationSeconds)} · {formatBytes(file.size)}
        </p>
      </div>
      {aiVoice && (
        <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-muted">
          AI-generated voice. Please tell listeners it isn’t a real recording.
        </p>
      )}
      <audio controls src={file.url} className="w-full" preload="metadata" />
      <div className="flex gap-2">
        <a href={file.url} download={file.fileName} className={cn(buttonStyles({ variant: "secondary" }), "flex-1")}>
          <Download /> Download WAV
        </a>
        {canShare && (
          <Button variant="secondary" onClick={share}>
            <Share2 /> Share
          </Button>
        )}
      </div>
      {shareError && (
        <p role="alert" className="text-sm text-danger">
          Sharing failed. Download the file and send it instead.
        </p>
      )}
    </section>
  );
}
