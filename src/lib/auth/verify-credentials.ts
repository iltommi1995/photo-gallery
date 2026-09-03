import bcrypt from "bcryptjs";

import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/schemas/auth";

export type VerifiedAdmin = { id: string; email: string; name: string | null };

/**
 * Checks raw credentials against the single Admin row. Returns null on any
 * failure (bad shape, unknown email, wrong password) — deliberately without
 * distinguishing which, so callers can't leak which part was wrong.
 */
export async function verifyCredentials(raw: unknown): Promise<VerifiedAdmin | null> {
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return null;

  const { email, password } = parsed.data;
  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin) return null;

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) return null;

  return { id: admin.id, email: admin.email, name: admin.name };
}
