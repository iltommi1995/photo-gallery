import bcrypt from "bcryptjs";

import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/schemas/auth";
import { verifyAndConsumeBackupCode } from "@/lib/auth/backup-codes";
import { verifyTotpCode } from "@/lib/auth/totp";

export type VerifiedAdmin = { id: string; email: string; name: string | null };

export type VerifyCredentialsResult =
  | { status: "invalid" }
  | { status: "requires-2fa" }
  | { status: "invalid-code" }
  | { status: "ok"; admin: VerifiedAdmin };

const TOTP_TOKEN_PATTERN = /^\d{6}$/;

/**
 * Checks raw credentials against the single Admin row, then — if the
 * account has TOTP enabled — the submitted second factor. "invalid" and
 * "invalid-code" are deliberately distinct from each other but each
 * collapses several underlying failures (bad shape / unknown email / wrong
 * password; wrong TOTP / wrong backup code) so callers can't leak which
 * specific part was wrong.
 */
export async function verifyCredentials(raw: unknown): Promise<VerifyCredentialsResult> {
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return { status: "invalid" };

  const { email, password, code } = parsed.data;
  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin) return { status: "invalid" };

  const validPassword = await bcrypt.compare(password, admin.passwordHash);
  if (!validPassword) return { status: "invalid" };

  if (!admin.totpEnabled) {
    return {
      status: "ok",
      admin: { id: admin.id, email: admin.email, name: admin.name },
    };
  }

  if (!code) return { status: "requires-2fa" };

  if (admin.totpSecret && TOTP_TOKEN_PATTERN.test(code)) {
    const step = verifyTotpCode(admin.totpSecret, code, admin.totpLastUsedStep);
    if (step === null) return { status: "invalid-code" };

    await prisma.admin.update({
      where: { id: admin.id },
      data: { totpLastUsedStep: step },
    });
    return {
      status: "ok",
      admin: { id: admin.id, email: admin.email, name: admin.name },
    };
  }

  // Not a 6-digit TOTP token — only then pay for the bcrypt-compare loop
  // against the (much slower, pure-JS) backup codes.
  const matchedIndex = await verifyAndConsumeBackupCode(admin.backupCodes, code);
  if (matchedIndex === null) return { status: "invalid-code" };

  const remainingCodes = admin.backupCodes.filter((_, i) => i !== matchedIndex);
  await prisma.admin.update({
    where: { id: admin.id },
    data: { backupCodes: remainingCodes },
  });
  return { status: "ok", admin: { id: admin.id, email: admin.email, name: admin.name } };
}
