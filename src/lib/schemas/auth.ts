import { z } from "zod";

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1, "Password is required"),
  // TOTP code (6 digits) or a backup code (e.g. "ABCDE-FGHJK") — only
  // required on the second submit once the account is known to have 2FA
  // enabled (see RequiresTwoFactorError).
  code: z.string().min(6).max(64).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
