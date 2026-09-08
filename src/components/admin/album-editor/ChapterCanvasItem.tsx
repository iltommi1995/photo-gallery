"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVerticalIcon,
  MinusIcon,
  MoveDiagonal2Icon,
  PencilIcon,
  PlusIcon,
  RatioIcon,
  XIcon,
} from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  GRID_COLUMNS,
  GRID_GAP,
  GRID_ROW_HEIGHT,
  MAX_ITEM_SPAN,
} from "@/lib/gallery/grid";
import { cn } from "@/lib/utils";
import type { EditorPlacement } from "./types";

type ChapterCanvasItemProps = {
  placement: EditorPlacement;
  onResize: (colSpan: number, rowSpan: number) => void;
  onRemove: () => void;
  onMove: (column: number, row: number) => void;
  /** PHOTO placements only. */
  onToggleAspectRatio?: () => void;
  /** TEXT placements only. */
  onEditText?: () => void;
};

type ResizeState = {
  pointerId: number;
  startX: number;
  startY: number;
  startColSpan: number;
  startRowSpan: number;
  colWidth: number;
};

export function ChapterCanvasItem({
  placement,
  onResize,
  onRemove,
  onMove,
  onToggleAspectRatio,
  onEditText,
}: ChapterCanvasItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: placement.id,
  });
  const heightLocked = placement.type === "PHOTO" && placement.preserveAspectRatio;

  // Drag-the-corner resizing, alongside the +/- steppers below. Sized live
  // while dragging (resizePreview), committed through the same onResize
  // (and its canPlace validation) as the steppers only once the pointer is
  // released — dragging through transiently invalid sizes shouldn't spam
  // toasts on every pixel of movement.
  const [resizePreview, setResizePreview] = useState<{
    colSpan: number;
    rowSpan: number;
  } | null>(null);
  const resizeState = useRef<ResizeState | null>(null);

  function handleResizeStart(event: React.PointerEvent<HTMLButtonElement>) {
    event.stopPropagation();
    const rect = document
      .querySelector('[data-testid="chapter-canvas-dropzone"]')
      ?.getBoundingClientRect();
    if (!rect) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startColSpan: placement.colSpan,
      startRowSpan: placement.rowSpan,
      colWidth: (rect.width + GRID_GAP) / GRID_COLUMNS,
    };
  }

  function handleResizeMove(event: React.PointerEvent<HTMLButtonElement>) {
    const state = resizeState.current;
    if (!state || event.pointerId !== state.pointerId) return;
    const deltaCols = Math.round((event.clientX - state.startX) / state.colWidth);
    const deltaRows = Math.round(
      (event.clientY - state.startY) / (GRID_ROW_HEIGHT + GRID_GAP),
    );
    const colSpan = Math.min(MAX_ITEM_SPAN, Math.max(1, state.startColSpan + deltaCols));
    const rowSpan = heightLocked
      ? state.startRowSpan
      : Math.min(MAX_ITEM_SPAN, Math.max(1, state.startRowSpan + deltaRows));
    setResizePreview({ colSpan, rowSpan });
  }

  function handleResizeEnd(event: React.PointerEvent<HTMLButtonElement>) {
    if (!resizeState.current || event.pointerId !== resizeState.current.pointerId) return;
    resizeState.current = null;
    // Read the last preview from this render's closure and call the parent
    // callback directly here, rather than from inside a setResizePreview
    // updater — updater functions can run during React's render phase,
    // and calling a parent setState from there ("Cannot update a component
    // while rendering a different component") is undefined-ish enough that
    // the resize sometimes silently never reached the parent's state.
    if (resizePreview) onResize(resizePreview.colSpan, resizePreview.rowSpan);
    setResizePreview(null);
  }

  const colSpan = resizePreview?.colSpan ?? placement.colSpan;
  const rowSpan = resizePreview?.rowSpan ?? placement.rowSpan;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      tabIndex={0}
      aria-label={
        placement.type === "PHOTO"
          ? `Move ${placement.photo.altText ?? placement.photo.filename}`
          : "Move text block"
      }
      data-placement-id={placement.id}
      data-grid-column={placement.gridColumn}
      data-grid-row={placement.gridRow}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        const moves: Record<string, [number, number]> = {
          ArrowLeft: [-1, 0],
          ArrowRight: [1, 0],
          ArrowUp: [0, -1],
          ArrowDown: [0, 1],
        };
        const move = moves[event.key];
        if (move) {
          event.preventDefault();
          onMove(
            (placement.gridColumn ?? 1) + move[0],
            (placement.gridRow ?? 1) + move[1],
          );
        }
      }}
      style={{
        transform: CSS.Translate.toString(transform),
        gridColumn: `${placement.gridColumn} / span ${colSpan}`,
        gridRow: `${placement.gridRow} / span ${rowSpan}`,
      }}
      className={cn(
        "group bg-muted relative cursor-grab touch-none overflow-hidden rounded-md active:cursor-grabbing",
        (isDragging || resizePreview) && "z-10",
        isDragging && "opacity-50",
        resizePreview && "ring-primary ring-2",
      )}
    >
      {placement.type === "PHOTO" ? (
        <Image
          src={`/api/media/${placement.photo.id}/thumbnail`}
          alt={placement.photo.altText ?? placement.photo.filename}
          fill
          sizes="300px"
          className={cn(
            "pointer-events-none",
            placement.preserveAspectRatio ? "object-contain" : "object-cover",
          )}
        />
      ) : (
        <div
          className="prose-portfolio-text bg-portfolio-paper pointer-events-none absolute inset-0 overflow-hidden p-2 text-[0.65rem] leading-tight"
          dangerouslySetInnerHTML={{ __html: placement.textContent }}
        />
      )}

      <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-1 bg-gradient-to-b from-black/60 to-transparent p-1.5 transition-opacity">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none rounded p-1 text-white active:cursor-grabbing"
          aria-label="Drag to position"
        >
          <GripVerticalIcon className="size-4" />
        </button>
        <div className="flex items-center gap-1">
          {placement.type === "PHOTO" && (
            <Button
              type="button"
              size="icon"
              variant={placement.preserveAspectRatio ? "default" : "ghost"}
              className={cn(
                "size-6",
                !placement.preserveAspectRatio &&
                  "text-white hover:bg-white/20 hover:text-white",
              )}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={onToggleAspectRatio}
              aria-label="Preserve original proportions"
              aria-pressed={placement.preserveAspectRatio}
              title="Preserve original proportions"
            >
              <RatioIcon className="size-3.5" />
            </Button>
          )}
          {placement.type === "TEXT" && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-6 text-white hover:bg-white/20 hover:text-white"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={onEditText}
              aria-label="Edit text"
            >
              <PencilIcon className="size-3.5" />
            </Button>
          )}
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onRemove}
            className="rounded p-1 text-white hover:bg-white/20"
            aria-label="Remove from chapter"
          >
            <XIcon className="size-4" />
          </button>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-gradient-to-t from-black/60 to-transparent p-1.5 transition-opacity">
        <div className="flex items-center gap-0.5 rounded bg-black/40 px-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-6 text-white hover:bg-white/20 hover:text-white"
            disabled={colSpan <= 1}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => onResize(colSpan - 1, rowSpan)}
            aria-label="Decrease width"
          >
            <MinusIcon className="size-3" />
          </Button>
          <span className="w-4 text-center text-xs text-white" aria-hidden>
            {colSpan}
          </span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-6 text-white hover:bg-white/20 hover:text-white"
            disabled={colSpan >= MAX_ITEM_SPAN}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => onResize(colSpan + 1, rowSpan)}
            aria-label="Increase width"
          >
            <PlusIcon className="size-3" />
          </Button>
        </div>
        <span className="text-xs text-white/70" aria-hidden>
          ×
        </span>
        <div className="flex items-center gap-0.5 rounded bg-black/40 px-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-6 text-white hover:bg-white/20 hover:text-white"
            disabled={heightLocked || rowSpan <= 1}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => onResize(colSpan, rowSpan - 1)}
            aria-label="Decrease height"
          >
            <MinusIcon className="size-3" />
          </Button>
          <span className="w-4 text-center text-xs text-white" aria-hidden>
            {rowSpan}
          </span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-6 text-white hover:bg-white/20 hover:text-white"
            disabled={heightLocked || rowSpan >= MAX_ITEM_SPAN}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => onResize(colSpan, rowSpan + 1)}
            aria-label="Increase height"
          >
            <PlusIcon className="size-3" />
          </Button>
        </div>
      </div>

      <button
        type="button"
        onPointerDown={handleResizeStart}
        onPointerMove={handleResizeMove}
        onPointerUp={handleResizeEnd}
        onPointerCancel={handleResizeEnd}
        className="absolute right-0 bottom-0 z-10 flex size-6 cursor-nwse-resize touch-none items-center justify-center rounded-tl-md bg-black/50 text-white hover:bg-black/70"
        aria-label="Drag to resize"
      >
        <MoveDiagonal2Icon className="size-3.5" />
      </button>
    </div>
  );
}
