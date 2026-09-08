/**
 * Placement rows come back from Prisma as one flat shape (every column
 * present, `photo`/`textContent` nullable) regardless of `type` — this
 * reshapes a row into the PHOTO | TEXT discriminated union that
 * ChapterMosaic and the admin editor actually want, dropping rows whose
 * required field for their type is missing (a photo deleted out from
 * under a placement, or empty text) instead of rendering a broken item.
 * Used by both the public album page and the admin editor loader so they
 * can't drift apart.
 */
export type RawPlacement<TPhoto> = {
  id: string;
  type: "PHOTO" | "TEXT";
  colSpan: number;
  rowSpan: number;
  gridColumn: number | null;
  gridRow: number | null;
  preserveAspectRatio: boolean;
  textContent: string | null;
  photo: TPhoto | null;
};

export type BlockPlacement<TPhoto> =
  | {
      id: string;
      type: "PHOTO";
      colSpan: number;
      rowSpan: number;
      gridColumn: number | null;
      gridRow: number | null;
      preserveAspectRatio: boolean;
      photo: TPhoto;
    }
  | {
      id: string;
      type: "TEXT";
      colSpan: number;
      rowSpan: number;
      gridColumn: number | null;
      gridRow: number | null;
      textContent: string;
    };

export function toBlockPlacement<TPhoto>(
  p: RawPlacement<TPhoto>,
): BlockPlacement<TPhoto> | null {
  const common = {
    id: p.id,
    colSpan: p.colSpan,
    rowSpan: p.rowSpan,
    gridColumn: p.gridColumn,
    gridRow: p.gridRow,
  };
  if (p.type === "PHOTO")
    return p.photo
      ? {
          ...common,
          type: "PHOTO",
          preserveAspectRatio: p.preserveAspectRatio,
          photo: p.photo,
        }
      : null;
  return p.textContent ? { ...common, type: "TEXT", textContent: p.textContent } : null;
}

export type Viewport = "WEB" | "MOBILE_LANDSCAPE" | "MOBILE_PORTRAIT";

export type RawChapter<TPhoto> = {
  id: string;
  label: string;
  order: number;
  viewport: Viewport;
  placements: RawPlacement<TPhoto>[];
};

/**
 * Splits an album's flat chapter list (all three viewports mixed together,
 * as Prisma returns them) into the three independent chapter structures
 * ChapterMosaic's callers need — Web, Mobile landscape, Mobile portrait —
 * each chapter's placements already reshaped through toBlockPlacement. An
 * album's chapter *count and split* can differ per viewport (own chapters,
 * not just own photos within shared chapter boundaries); an empty list for
 * a mobile viewport means "no override," Web's chapters render instead.
 * Used by both the public album loader and the admin editor loader so they
 * can't drift apart.
 */
export function groupChaptersByViewport<TPhoto>(chapters: RawChapter<TPhoto>[]) {
  const byViewport = (viewport: Viewport) =>
    chapters
      .filter((c) => c.viewport === viewport)
      .map((c) => ({
        id: c.id,
        label: c.label,
        order: c.order,
        placements: c.placements.flatMap((p) => {
          const mapped = toBlockPlacement(p);
          return mapped ? [mapped] : [];
        }),
      }));
  return {
    webChapters: byViewport("WEB"),
    mobileLandscapeChapters: byViewport("MOBILE_LANDSCAPE"),
    mobilePortraitChapters: byViewport("MOBILE_PORTRAIT"),
  };
}
