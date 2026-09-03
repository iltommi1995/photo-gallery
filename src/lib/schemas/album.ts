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
});
export type UpdateAlbumInput = z.infer<typeof updateAlbumSchema>;

export const createChapterSchema = z.object({
  label: z.string().trim().min(1, "Label is required").max(80),
});
export type CreateChapterInput = z.infer<typeof createChapterSchema>;

export const updateChapterSchema = z.object({
  label: z.string().trim().min(1).max(80).optional(),
});
export type UpdateChapterInput = z.infer<typeof updateChapterSchema>;

export const reorderChaptersSchema = z.object({
  chapterIds: z.array(z.string()).min(1),
});

export const placementSizeEnum = z.enum(["SMALL", "MEDIUM", "LARGE", "FULL"]);

export const replacePlacementsSchema = z.object({
  placements: z.array(
    z.object({
      photoId: z.string(),
      size: placementSizeEnum,
    }),
  ),
});
export type ReplacePlacementsInput = z.infer<typeof replacePlacementsSchema>;
