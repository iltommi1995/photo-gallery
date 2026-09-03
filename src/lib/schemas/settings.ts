import { z } from "zod";

export const updateSettingsSchema = z.object({
  siteTitle: z.string().trim().min(1).max(100).optional(),
  heroPhotoId: z.string().optional().nullable(),
  aboutTitle: z.string().trim().max(100).optional().nullable(),
  aboutBody: z.string().trim().max(5000).optional().nullable(),
  aboutPhotoId: z.string().optional().nullable(),
});
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
