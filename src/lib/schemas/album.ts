import {
  canPlace,
  GRID_COLUMNS,
  GRID_MAX_ROWS,
  MAX_ITEM_SPAN,
  resolveGrid,
} from "@/lib/gallery/grid";
import { sanitizeTextBlockHtml } from "@/lib/sanitize-html";
import { z } from "zod";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createAlbumSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(slugPattern, "Use lowercase letters, numbers, and hyphens only")
    .optional(),
});
export type CreateAlbumInput = z.infer<typeof createAlbumSchema>;

export const updateAlbumSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  subtitle: z.string().trim().max(200).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  coverPhotoId: z.string().optional().nullable(),
  locationName: z.string().trim().max(200).optional().nullable(),
  countryCode: z.string().trim().length(2).optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
  order: z.coerce.number().int().optional(),
  showChapterLabels: z.boolean().optional(),
  chapterLayout: z.enum(["PAGED", "CONTINUOUS"]).optional(),
});
export type UpdateAlbumInput = z.infer<typeof updateAlbumSchema>;

// A chapter belongs to exactly one of these — Web, or an independent
// Mobile landscape/portrait structure (own chapters, not just own photos).
// An album's chapter *count and split* can differ per viewport, not just
// each chapter's content; an empty viewport (no chapters at all) falls
// back to Web's chapters wholesale. See docs/ai/add-album-layout-variant.md.
export const viewportSchema = z.enum(["WEB", "MOBILE_LANDSCAPE", "MOBILE_PORTRAIT"]);
export type Viewport = z.infer<typeof viewportSchema>;

export const createChapterSchema = z.object({
  label: z.string().trim().min(1, "Label is required").max(80),
  viewport: viewportSchema.default("WEB"),
});
export type CreateChapterInput = z.infer<typeof createChapterSchema>;

export const updateChapterSchema = z.object({
  label: z.string().trim().min(1).max(80).optional(),
});
export type UpdateChapterInput = z.infer<typeof updateChapterSchema>;

export const reorderChaptersSchema = z.object({
  chapterIds: z.array(z.string()).min(1),
  viewport: viewportSchema,
});

// Clones every Web chapter (and its placements) into new rows under
// `toViewport`, same labels/order/positions — an editable starting point
// for a chapter structure that doesn't yet exist for that viewport, since
// authoring N chapters from a blank canvas is a lot more work than editing
// a copy. See POST /api/admin/albums/[id]/chapters/clone.
export const cloneChaptersSchema = z.object({
  toViewport: z.enum(["MOBILE_LANDSCAPE", "MOBILE_PORTRAIT"]),
});

const placementCommon = {
  colSpan: z.number().int().min(1).max(MAX_ITEM_SPAN),
  rowSpan: z.number().int().min(1).max(MAX_ITEM_SPAN),
  gridColumn: z.number().int().min(1).max(GRID_COLUMNS).nullable().optional(),
  gridRow: z.number().int().min(1).max(GRID_MAX_ROWS).nullable().optional(),
};

const photoPlacementSchema = z.object({
  type: z.literal("PHOTO"),
  photoId: z.string(),
  preserveAspectRatio: z.boolean().default(false),
  ...placementCommon,
});

const textPlacementSchema = z.object({
  type: z.literal("TEXT"),
  textContent: z
    .string()
    .trim()
    .min(1, "Text block can't be empty")
    .max(2000)
    .transform(sanitizeTextBlockHtml),
  ...placementCommon,
});

export const placementSchema = z.discriminatedUnion("type", [
  photoPlacementSchema,
  textPlacementSchema,
]);

export const replacePlacementsSchema = z.object({
  placements: z.array(placementSchema),
});
export const gridPlacementsSchema = replacePlacementsSchema.superRefine(
  ({ placements }, ctx) => {
    for (const [index, p] of placements.entries()) {
      if ((p.gridColumn == null) !== (p.gridRow == null))
        ctx.addIssue({
          code: "custom",
          path: ["placements", index],
          message: "Provide both grid coordinates",
        });
    }
    const resolved = resolveGrid(placements);
    resolved.forEach((p, index) => {
      if (
        !canPlace(
          p,
          resolved.filter((_, i) => i !== index),
        )
      )
        ctx.addIssue({
          code: "custom",
          path: ["placements", index],
          message: "Photos must fit the grid without overlapping",
        });
    });
  },
);
export type ReplacePlacementsInput = z.infer<typeof replacePlacementsSchema>;
