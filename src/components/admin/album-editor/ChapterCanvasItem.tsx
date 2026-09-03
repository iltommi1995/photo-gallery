"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon, XIcon } from "lucide-react";
import Image from "next/image";
import type { PlacementSize } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { MOSAIC_SIZE_CLASSES } from "@/components/gallery/ChapterMosaic";
import { cn } from "@/lib/utils";
import type { EditorPlacement } from "./types";

const SIZES: PlacementSize[] = ["SMALL", "MEDIUM", "LARGE", "FULL"];
const SIZE_LABEL: Record<PlacementSize, string> = {
  SMALL: "S",
  MEDIUM: "M",
  LARGE: "L",
  FULL: "F",
};

type ChapterCanvasItemProps = {
  placement: EditorPlacement;
  onResize: (size: PlacementSize) => void;
  onRemove: () => void;
};

export function ChapterCanvasItem({
  placement,
  onResize,
  onRemove,
}: ChapterCanvasItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: placement.id,
    });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group bg-muted relative overflow-hidden rounded-md",
        MOSAIC_SIZE_CLASSES[placement.size],
        isDragging && "z-10 opacity-50",
      )}
    >
      <Image
        src={`/api/media/${placement.photo.id}/thumbnail`}
        alt={placement.photo.altText ?? placement.photo.filename}
        fill
        sizes="300px"
        className="pointer-events-none object-cover"
      />

      <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-1 bg-gradient-to-b from-black/60 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none rounded p-1 text-white active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVerticalIcon className="size-4" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="rounded p-1 text-white hover:bg-white/20"
          aria-label="Remove from chapter"
        >
          <XIcon className="size-4" />
        </button>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex justify-center gap-0.5 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        {SIZES.map((size) => (
          <Button
            key={size}
            type="button"
            size="icon"
            variant={size === placement.size ? "default" : "secondary"}
            className="size-6 text-xs"
            onClick={() => onResize(size)}
            aria-label={`Set size ${size}`}
            aria-pressed={size === placement.size}
          >
            {SIZE_LABEL[size]}
          </Button>
        ))}
      </div>
    </div>
  );
}
