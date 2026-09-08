"use client";

import { useDroppable } from "@dnd-kit/core";
import { GRID_COLUMNS, GRID_MAX_ROWS, resolveGrid } from "@/lib/gallery/grid";
import { ChapterCanvasItem } from "./ChapterCanvasItem";
import type { EditorPlacement } from "./types";

type ChapterCanvasProps = {
  placements: EditorPlacement[];
  dropTarget?: {
    gridColumn: number;
    gridRow: number;
    colSpan: number;
    rowSpan: number;
    valid: boolean;
  } | null;
  onResize: (placementId: string, colSpan: number, rowSpan: number) => void;
  onRemove: (placementId: string) => void;
  onMove: (placementId: string, column: number, row: number) => void;
  onToggleAspectRatio: (placementId: string) => void;
  onEditText: (placementId: string) => void;
};

export function ChapterCanvas({
  placements,
  dropTarget,
  onResize,
  onRemove,
  onMove,
  onToggleAspectRatio,
  onEditText,
}: ChapterCanvasProps) {
  const { setNodeRef } = useDroppable({ id: "canvas-dropzone" });
  const positioned = resolveGrid(placements);
  return (
    <div className="min-w-0 rounded-lg border p-3">
      <p className="text-muted-foreground mb-3 text-sm">
        Fixed {GRID_COLUMNS}x{GRID_MAX_ROWS} grid. Drag a photo to a cell. Leave empty
        cells for spacing. Use the arrow keys on a photo to move it.
      </p>
      <div className="overflow-auto">
        <div
          ref={setNodeRef}
          data-testid="chapter-canvas-dropzone"
          className="relative grid min-w-[1080px] gap-2"
          style={{
            gridTemplateColumns: `repeat(${GRID_COLUMNS}, 1fr)`,
            gridTemplateRows: `repeat(${GRID_MAX_ROWS}, 72px)`,
          }}
        >
          {Array.from({ length: GRID_MAX_ROWS * GRID_COLUMNS }, (_, index) => (
            <div
              key={index}
              data-grid-cell={`${(index % GRID_COLUMNS) + 1}:${Math.floor(index / GRID_COLUMNS) + 1}`}
              className="pointer-events-none rounded border border-dashed bg-muted/30 text-muted-foreground/60 p-1 text-[0.6rem]"
              style={{
                gridColumn: (index % GRID_COLUMNS) + 1,
                gridRow: Math.floor(index / GRID_COLUMNS) + 1,
              }}
            >
              {Math.floor(index / GRID_COLUMNS) + 1} · {(index % GRID_COLUMNS) + 1}
            </div>
          ))}
          {positioned.map((placement) => (
            <ChapterCanvasItem
              key={placement.id}
              placement={placement}
              onResize={(colSpan, rowSpan) => onResize(placement.id, colSpan, rowSpan)}
              onRemove={() => onRemove(placement.id)}
              onMove={(column, row) => onMove(placement.id, column, row)}
              onToggleAspectRatio={() => onToggleAspectRatio(placement.id)}
              onEditText={() => onEditText(placement.id)}
            />
          ))}
          {dropTarget && (
            <div
              className={`pointer-events-none z-20 rounded border-2 ${dropTarget.valid ? "border-primary bg-primary/15" : "border-destructive bg-destructive/20"}`}
              style={{
                gridColumn: `${dropTarget.gridColumn} / span ${dropTarget.colSpan}`,
                gridRow: `${dropTarget.gridRow} / span ${dropTarget.rowSpan}`,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
