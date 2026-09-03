import type { Photo, PlacementSize, Tag } from "@prisma/client";

export type EditorPhoto = Photo & { tags: Tag[] };

export type EditorPlacement = {
  /** Real Placement id from the DB, or a client-generated "temp:<uuid>" id
   * for a placement added in this session and not yet saved. */
  id: string;
  size: PlacementSize;
  photo: EditorPhoto;
};

export type EditorChapter = {
  id: string;
  label: string;
  order: number;
  placements: EditorPlacement[];
};

export type SaveStatus = "idle" | "unsaved" | "saving" | "saved" | "error";
