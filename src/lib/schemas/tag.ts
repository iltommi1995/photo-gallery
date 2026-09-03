import { z } from "zod";

export const createTagSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(50),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;
