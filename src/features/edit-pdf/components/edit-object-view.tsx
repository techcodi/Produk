"use client";

import { memo, useEffect, useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/cn";
import { LINE_HEIGHT, PREVIEW_FONTS } from "../constants";
import type { EditObject, PageGeometry, Rect, TextObject } from "../types";

interface EditObjectViewProps {
  object: EditObject;
  geometry: PageGeometry;
  selected: boolean;
  /** Focus the text box right away (new or just-clicked text). */
  autoFocus: boolean;
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: Partial<EditObject>) => void;
}

const MIN_SIZE_PT = 6;

/** Positions in percent of the page, font sizes in container-query units, so everything scales with the page. */
const placement = (geometry: PageGeometry, rect: Partial<Rect> & { x: number; y: number }): CSSProperties => ({
  left: `${(rect.x / geometry.width) * 100}%`,
  top: `${(rect.y / geometry.height) * 100}%`,
  ...(rect.width !== undefined && { width: `${(rect.width / geometry.width) * 100}%` }),
  ...(rect.height !== undefined && { height: `${(rect.height / geometry.height) * 100}%` }),
});

/**
 * Tracks a pointer drag in page points. `onMove` gets the distance moved since
 * the drag started; `onClick` fires instead when the pointer barely moved.
 */
function startDrag(
  event: ReactPointerEvent,
  geometry: PageGeometry,
  onMove: (dx: number, dy: number) => void,
  onClick?: () => void,
) {
  const overlay = (event.currentTarget as HTMLElement).closest("[data-page-overlay]");
  if (!overlay) return;
  event.preventDefault();
  event.stopPropagation();

  const scale = overlay.getBoundingClientRect().width / geometry.width;
  const startX = event.clientX;
  const startY = event.clientY;
  let moved = false;

  const move = (e: PointerEvent) => {
    const dx = (e.clientX - startX) / scale;
    const dy = (e.clientY - startY) / scale;
    if (!moved && Math.hypot(e.clientX - startX, e.clientY - startY) < 4) return;
    moved = true;
    onMove(dx, dy);
  };
  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", up);
    if (!moved) onClick?.();
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", up);
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

export const EditObjectView = memo(function EditObjectView({ object, geometry, selected, autoFocus, onSelect, onUpdate }: EditObjectViewProps) {
  if (object.kind === "text") {
    return <TextObjectView object={object} geometry={geometry} selected={selected} autoFocus={autoFocus} onSelect={onSelect} onUpdate={onUpdate} />;
  }

  const startMove = (event: ReactPointerEvent) => {
    onSelect(object.id);
    const origin = { x: object.x, y: object.y };
    startDrag(event, geometry, (dx, dy) =>
      onUpdate(object.id, {
        x: clamp(origin.x + dx, -object.width / 2, geometry.width - object.width / 2),
        y: clamp(origin.y + dy, -object.height / 2, geometry.height - object.height / 2),
      }),
    );
  };

  const startResize = (event: ReactPointerEvent) => {
    const origin = { width: object.width, height: object.height };
    const ratio = origin.width / origin.height;
    startDrag(event, geometry, (dx, dy) => {
      if (object.kind === "image") {
        // Images keep their proportions; follow whichever direction moved more.
        const width = Math.max(MIN_SIZE_PT, Math.abs(dx) > Math.abs(dy * ratio) ? origin.width + dx : (origin.height + dy) * ratio);
        onUpdate(object.id, { width, height: width / ratio });
      } else {
        onUpdate(object.id, { width: Math.max(MIN_SIZE_PT, origin.width + dx), height: Math.max(MIN_SIZE_PT, origin.height + dy) });
      }
    });
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={object.kind === "image" ? (object.signature ? "Signature" : "Image") : "Whiteout box"}
      aria-pressed={selected}
      onPointerDown={startMove}
      onFocus={() => onSelect(object.id)}
      className={cn(
        "absolute touch-none cursor-move outline-offset-1 focus-visible:outline-2 focus-visible:outline-brand",
        selected ? "outline-2 outline-brand" : "hover:outline-1 hover:outline-dashed hover:outline-brand",
      )}
      style={{ ...placement(geometry, object), ...(object.kind === "whiteout" && { background: object.color }) }}
    >
      {object.kind === "image" && (
        // eslint-disable-next-line @next/next/no-img-element -- local data URL, next/image adds nothing here
        <img src={object.src} alt="" draggable={false} className="pointer-events-none size-full select-none" />
      )}
      {selected && (
        <span
          aria-hidden
          onPointerDown={startResize}
          className="absolute -bottom-2 -right-2 size-4 cursor-nwse-resize touch-none rounded-full border-2 border-white bg-brand shadow"
        />
      )}
    </div>
  );
});

interface TextObjectViewProps {
  object: TextObject;
  geometry: PageGeometry;
  selected: boolean;
  autoFocus: boolean;
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: Partial<EditObject>) => void;
}

function TextObjectView({ object, geometry, selected, autoFocus, onSelect, onUpdate }: TextObjectViewProps) {
  const textarea = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && selected) {
      const el = textarea.current;
      el?.focus({ preventScroll: true });
      el?.setSelectionRange(el.value.length, el.value.length);
    }
  }, [autoFocus, selected]);

  const startMove = (event: ReactPointerEvent, focusOnClick: boolean) => {
    onSelect(object.id);
    const origin = { x: object.x, y: object.y };
    startDrag(
      event,
      geometry,
      (dx, dy) => onUpdate(object.id, { x: clamp(origin.x + dx, 0, geometry.width - 4), y: clamp(origin.y + dy, 0, geometry.height - 4) }),
      focusOnClick ? () => textarea.current?.focus() : undefined,
    );
  };

  const textStyle: CSSProperties = {
    fontSize: `${(object.fontSize / geometry.width) * 100}cqw`,
    fontFamily: PREVIEW_FONTS[object.font],
    fontWeight: object.bold ? 700 : 400,
    color: object.color,
    lineHeight: LINE_HEIGHT,
  };

  return (
    <>
      {object.cover && (
        <div aria-hidden className="pointer-events-none absolute" style={{ ...placement(geometry, object.cover), background: object.cover.color }} />
      )}
      <div
        className={cn(
          "absolute whitespace-pre rounded-[1px]",
          selected ? "outline-2 outline-offset-2 outline-brand" : "outline-1 outline-offset-2 outline-transparent hover:outline-dashed hover:outline-brand",
        )}
        style={{ ...placement(geometry, object), ...textStyle }}
        // Unselected text drags from anywhere; a plain click starts typing.
        onPointerDown={selected ? undefined : (event) => startMove(event, true)}
      >
        {/* Invisible copy that sizes the box to the text; the textarea sits on top of it. */}
        <div aria-hidden className="invisible min-w-[0.5em] pr-[0.1em]">
          {object.text || " "}
          {object.text.endsWith("\n") && "​"}
        </div>
        <textarea
          ref={textarea}
          value={object.text}
          onChange={(event) => onUpdate(object.id, { text: event.target.value })}
          onFocus={() => onSelect(object.id)}
          wrap="off"
          spellCheck={false}
          aria-label={object.original !== undefined ? `Edit text: ${object.original}` : "Text"}
          placeholder="Type here"
          className={cn(
            "absolute inset-0 m-0 resize-none overflow-hidden border-0 bg-transparent p-0 outline-none placeholder:text-neutral-400",
            !selected && "pointer-events-none",
          )}
          style={{ font: "inherit", lineHeight: "inherit", color: "inherit", whiteSpace: "pre" }}
        />
        {selected && (
          <button
            type="button"
            aria-label="Drag to move text"
            onPointerDown={(event) => startMove(event, false)}
            className="absolute -left-6 top-1/2 flex size-5 -translate-y-1/2 cursor-move touch-none items-center justify-center rounded bg-brand text-brand-foreground shadow"
            style={{ fontSize: 0 }}
          >
            <GripVertical className="size-3.5" />
          </button>
        )}
      </div>
    </>
  );
}
