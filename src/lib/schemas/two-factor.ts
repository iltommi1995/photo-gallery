import { z } from "zod";

export const confirmTotpSchema = z.object({
  secret: z.string().min(1),
  code: z.string().min(6).max(64),
});

export type ConfirmTotpInput = z.infer<typeof confirmTotpSchema>;

export const disable2faSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export type Disable2faInput = z.infer<typeof disable2faSchema>;

export const regenerateBackupCodesSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export type RegenerateBackupCodesInput = z.infer<typeof regenerateBackupCodesSchema>;
