"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/cn";

interface CopyButtonProps {
  value: string;
  /** Visible text; the button copies `value`. */
  children: React.ReactNode;
  label: string;
  className?: string;
}

/** Copies on click and confirms with a tick for a moment. */
export function CopyButton({ value, children, label, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard blocked (insecure origin or permissions): the value is still selectable on screen.
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      className={cn(
        "group inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left transition hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-brand",
        className,
      )}
    >
      <span className="select-all">{children}</span>
      {copied ? (
        <Check className="size-3.5 shrink-0 text-success" aria-hidden />
      ) : (
        <Copy className="size-3.5 shrink-0 text-muted opacity-60 group-hover:opacity-100" aria-hidden />
      )}
    </button>
  );
}
