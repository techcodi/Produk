"use client";

import { memo } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FileText, GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatBytes, pluralize } from "@/lib/format";
import type { PdfFile } from "../types";

interface PdfFileListProps {
  items: PdfFile[];
  onMove: (activeId: string, overId: string) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
}

export function PdfFileList({ items, onMove, onRemove, disabled }: PdfFileListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // Long-press on touch so the page can still scroll normally.
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) onMove(String(active.id), String(over.id));
  };

  const positionOf = (id: string | number) => items.findIndex((item) => item.id === id) + 1;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) => `Picked up file ${positionOf(active.id)}.`,
          onDragOver: ({ over }) => (over ? `Over position ${positionOf(over.id)}.` : "Not over a position."),
          onDragEnd: ({ over }) => (over ? `Dropped at position ${positionOf(over.id)}.` : "Dropped."),
          onDragCancel: () => "Reorder cancelled.",
        },
      }}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy} disabled={disabled}>
        <ol className="space-y-2">
          {items.map((item, index) => (
            <PdfFileRow key={item.id} item={item} position={index + 1} onRemove={onRemove} disabled={disabled} />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

interface PdfFileRowProps {
  item: PdfFile;
  position: number;
  onRemove: (id: string) => void;
  disabled?: boolean;
}

const PdfFileRow = memo(function PdfFileRow({ item, position, onRemove, disabled }: PdfFileRowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "relative flex items-center gap-3 rounded-xl border border-border bg-surface p-2 pr-3 shadow-sm",
        isDragging && "z-10 shadow-xl ring-2 ring-brand",
      )}
    >
      <div
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`File ${position}: ${item.name}. Press space to pick up and reorder.`}
        className="flex cursor-grab touch-none items-center gap-2 self-stretch rounded-lg px-1 text-muted focus-visible:outline-2 focus-visible:outline-brand active:cursor-grabbing"
      >
        <GripVertical className="size-4" aria-hidden />
        <span className="w-5 text-center text-xs font-semibold tabular-nums text-foreground">{position}</span>
      </div>
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-danger-soft text-danger">
        <FileText className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" title={item.name}>
          {item.name}
        </p>
        <p className="text-xs text-muted">
          {pluralize(item.pageCount, "page")} · {formatBytes(item.size)}
        </p>
      </div>
      <Button variant="danger" size="icon" aria-label={`Remove ${item.name}`} onClick={() => onRemove(item.id)} disabled={disabled}>
        <Trash2 />
      </Button>
    </li>
  );
});
