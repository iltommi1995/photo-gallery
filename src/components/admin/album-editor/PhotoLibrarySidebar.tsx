"use client";

import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { PhotoLibraryItem } from "./PhotoLibraryItem";
import type { EditorPhoto } from "./types";

type PhotoLibrarySidebarProps = {
  photos: EditorPhoto[];
  chapterPhotoIds: Set<string>;
};

export function PhotoLibrarySidebar({
  photos,
  chapterPhotoIds,
}: PhotoLibrarySidebarProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return photos;
    return photos.filter(
      (p) =>
        p.filename.toLowerCase().includes(q) ||
        p.cameraModel?.toLowerCase().includes(q) ||
        p.locationName?.toLowerCase().includes(q) ||
        p.tags.some((t) => t.name.toLowerCase().includes(q)),
    );
  }, [photos, query]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold">Photo library</h2>
        <p className="text-muted-foreground text-xs">
          Drag a photo onto the canvas to add it to this chapter.
        </p>
      </div>
      <Input
        placeholder="Search…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="grid grid-cols-3 gap-2 overflow-y-auto">
        {filtered.map((photo) => (
          <PhotoLibraryItem
            key={photo.id}
            photo={photo}
            usedInChapter={chapterPhotoIds.has(photo.id)}
          />
        ))}
        {filtered.length === 0 && (
          <p className="text-muted-foreground col-span-3 text-xs">No photos found.</p>
        )}
      </div>
    </div>
  );
}
