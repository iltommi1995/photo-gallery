"use client";

import { useDraggable } from "@dnd-kit/core";
import Image from "next/image";

import { cn } from "@/lib/utils";
import type { EditorPhoto } from "./types";

type PhotoLibraryItemProps = {
  photo: EditorPhoto;
  usedInChapter: boolean;
};

export function PhotoLibraryItem({ photo, usedInChapter }: PhotoLibraryItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `library:${photo.id}`,
    data: { type: "library", photo },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      className={cn(
        "bg-muted relative aspect-square overflow-hidden rounded-md ring-offset-1 outline-none",
        "focus-visible:ring-ring focus-visible:ring-2",
        isDragging && "opacity-40",
        usedInChapter && "ring-primary ring-2",
      )}
      title={photo.filename}
    >
      <Image
        src={`/api/media/${photo.id}/thumbnail`}
        alt={photo.altText ?? photo.filename}
        fill
        sizes="100px"
        className="pointer-events-none object-cover"
      />
    </button>
  );
}
