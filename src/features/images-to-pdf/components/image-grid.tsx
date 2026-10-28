"use client";

import type { ReactNode } from "react";
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
import { rectSortingStrategy, SortableContext, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { ImageItem } from "../types";
import { ImageCard } from "./image-card";

interface ImageGridProps {
  items: ImageItem[];
  onMove: (activeId: string, overId: string) => void;
  onRotate: (id: string, direction: 1 | -1) => void;
  onRemove: (id: string) => void;
  /** Rendered as the last grid cell (e.g. an "add more" tile). */
  trailing?: ReactNode;
}

export function ImageGrid({ items, onMove, onRotate, onRemove, trailing }: ImageGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // Long-press on touch so the page can still scroll normally.
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) onMove(String(active.id), String(over.id));
  };

  const pageOf = (id: string | number) => items.findIndex((item) => item.id === id) + 1;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) => `Picked up page ${pageOf(active.id)}.`,
          onDragOver: ({ over }) => (over ? `Over position ${pageOf(over.id)}.` : "Not over a position."),
          onDragEnd: ({ over }) => (over ? `Dropped at position ${pageOf(over.id)}.` : "Dropped."),
          onDragCancel: () => "Reorder cancelled.",
        },
      }}
    >
      <SortableContext items={items} strategy={rectSortingStrategy}>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
          {items.map((item, index) => (
            <ImageCard key={item.id} item={item} pageNumber={index + 1} onRotate={onRotate} onRemove={onRemove} />
          ))}
          {trailing && <li>{trailing}</li>}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
