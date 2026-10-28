"use client";

import { memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, RotateCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/format";
import type { ImageItem } from "../types";

interface ImageCardProps {
  item: ImageItem;
  pageNumber: number;
  onRotate: (id: string, direction: 1 | -1) => void;
  onRemove: (id: string) => void;
}

export const ImageCard = memo(function ImageCard({ item, pageNumber, onRotate, onRemove }: ImageCardProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm",
        isDragging && "z-10 scale-[1.03] shadow-xl ring-2 ring-brand",
      )}
    >
      <div
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Page ${pageNumber}: ${item.name}. Press space to pick up and reorder.`}
        className="relative aspect-[3/4] cursor-grab touch-none overflow-hidden bg-surface-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand active:cursor-grabbing"
      >
        {/* A square stage keeps the image inside the card at every rotation. */}
        <div className="absolute inset-3 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- local blob URL, next/image adds nothing here */}
          <img
            src={item.previewUrl}
            alt=""
            draggable={false}
            decoding="async"
            className="aspect-square w-full object-contain drop-shadow-sm transition-transform duration-300"
            style={{ transform: `rotate(${item.rotation}deg)` }}
          />
        </div>
        <span className="absolute left-2 top-2 z-10 rounded-md bg-foreground/80 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-background">
          {pageNumber}
        </span>
        <GripVertical className="absolute right-2 top-2 size-4 text-muted opacity-0 transition group-hover:opacity-100" aria-hidden />
      </div>

      <div className="flex items-center gap-1 border-t border-border px-2 py-1.5">
        <div className="min-w-0 flex-1 px-1">
          <p className="truncate text-xs font-medium" title={item.name}>
            {item.name}
          </p>
          <p className="whitespace-nowrap text-[11px] text-muted">{formatBytes(item.size)}</p>
        </div>
        <Button variant="ghost" size="icon" aria-label={`Rotate page ${pageNumber} right`} onClick={() => onRotate(item.id, 1)}>
          <RotateCw />
        </Button>
        <Button variant="danger" size="icon" aria-label={`Remove page ${pageNumber}`} onClick={() => onRemove(item.id)}>
          <Trash2 />
        </Button>
      </div>
    </li>
  );
});
