"use client";

import { useRef, useState, type DragEvent } from "react";
import { Plus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

interface DropZoneProps {
  onFiles: (files: File[]) => void;
  /** Value for the file input's `accept` attribute. */
  accept: string;
  multiple?: boolean;
  icon: LucideIcon;
  /** Hero heading, e.g. "Drag & drop photos here". */
  title: string;
  /** Hero heading while files are dragged over, e.g. "Drop to add your images". */
  dropTitle: string;
  /** Supported formats, shown under the heading. */
  hint: string;
  /** Hero button text, e.g. "Choose images". */
  buttonLabel: string;
  /** Text of the compact "add more" tile. */
  compactLabel?: string;
  variant?: "hero" | "compact";
  className?: string;
}

const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer.types).includes("Files");

export function DropZone({
  onFiles,
  accept,
  multiple = true,
  icon: Icon,
  title,
  dropTitle,
  hint,
  buttonLabel,
  compactLabel = "Add more",
  variant = "hero",
  className,
}: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragDepth = useRef(0);

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) onFiles(multiple ? files : files.slice(0, 1));
  };

  const dragHandlers = {
    onDragEnter: (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragDepth.current += 1;
      setIsDragging(true);
    },
    onDragOver: (event: DragEvent) => {
      if (hasFiles(event)) event.preventDefault();
    },
    onDragLeave: () => {
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setIsDragging(false);
    },
    onDrop: handleDrop,
  };

  const input = (
    <input
      ref={inputRef}
      type="file"
      multiple={multiple}
      accept={accept}
      className="sr-only"
      tabIndex={-1}
      onChange={(event) => {
        const files = Array.from(event.target.files ?? []);
        event.target.value = ""; // allow re-selecting the same files
        if (files.length > 0) onFiles(files);
      }}
    />
  );

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        {...dragHandlers}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-sm font-medium transition",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
          isDragging ? "border-brand bg-brand-soft text-brand" : "border-border text-muted hover:border-brand hover:text-brand",
          className,
        )}
      >
        <Plus className="size-6" />
        {compactLabel}
        {input}
      </button>
    );
  }

  return (
    <div
      {...dragHandlers}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition sm:py-20",
        isDragging ? "border-brand bg-brand-soft" : "border-border bg-surface",
        className,
      )}
    >
      <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-brand-soft text-brand">
        <Icon className="size-8" />
      </div>
      <p className="text-lg font-semibold">{isDragging ? dropTitle : title}</p>
      <p className="mt-1 text-sm text-muted">{hint}</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-6 inline-flex h-12 items-center gap-2 rounded-lg bg-brand px-6 font-medium text-brand-foreground shadow-sm transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <Icon className="size-4" />
        {buttonLabel}
      </button>
      {input}
    </div>
  );
}
