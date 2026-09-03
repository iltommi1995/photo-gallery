"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import type { PlacementSize } from "@prisma/client";

import { cn } from "@/lib/utils";
import { ChapterCanvasItem } from "./ChapterCanvasItem";
import type { EditorPlacement } from "./types";

type ChapterCanvasProps = {
  placements: EditorPlacement[];
  onResize: (placementId: string, size: PlacementSize) => void;
  onRemove: (placementId: string) => void;
};

export function ChapterCanvas({ placements, onResize, onRemove }: ChapterCanvasProps) {
  const { setNodeRef, isOver } = useDroppable({ id: "canvas-dropzone" });

  return (
    <div
      ref={setNodeRef}
      data-testid="chapter-canvas-dropzone"
      className={cn(
        "min-h-64 rounded-lg border-2 border-dashed p-3 transition-colors",
        isOver ? "border-primary bg-muted/50" : "border-border",
      )}
    >
      {placements.length === 0 ? (
        <p className="text-muted-foreground flex h-56 items-center justify-center text-sm">
          Drag photos here from the library to build this chapter.
        </p>
      ) : (
        <SortableContext items={placements.map((p) => p.id)}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:auto-rows-[9rem]">
            {placements.map((placement) => (
              <ChapterCanvasItem
                key={placement.id}
                placement={placement}
                onResize={(size) => onResize(placement.id, size)}
                onRemove={() => onRemove(placement.id)}
              />
            ))}
          </div>
        </SortableContext>
      )}
    </div>
  );
}
