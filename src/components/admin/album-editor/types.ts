import type { Photo, Tag } from "@prisma/client";

export type EditorPhoto = Photo & { tags: Tag[] };

type EditorPlacementCommon = {
  /** Real Placement id from the DB, or a client-generated "temp:<uuid>" id
   * for a placement added in this session and not yet saved. */
  id: string;
  colSpan: number;
  rowSpan: number;
  gridColumn?: number | null;
  gridRow?: number | null;
};

export type EditorPlacement = EditorPlacementCommon &
  (
    | { type: "PHOTO"; preserveAspectRatio: boolean; photo: EditorPhoto }
    | { type: "TEXT"; textContent: string }
  );

export type EditorChapter = {
  id: string;
  label: string;
  order: number;
  placements: EditorPlacement[];
};

/** Which independent chapter structure is being edited — Web, or a fully
 * independent Mobile landscape/portrait one (own chapter count/split, not
 * just own photos within Web's chapter boundaries). See
 * docs/ai/add-album-layout-variant.md. */
export type Viewport = "WEB" | "MOBILE_LANDSCAPE" | "MOBILE_PORTRAIT";

export type SaveStatus = "idle" | "unsaved" | "saving" | "saved" | "error";
