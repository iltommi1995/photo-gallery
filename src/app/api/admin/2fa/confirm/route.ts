import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { generateBackupCodes, hashBackupCodes } from "@/lib/auth/backup-codes";
import { verifyTotpCode } from "@/lib/auth/totp";
import { prisma } from "@/lib/db";
import { confirmTotpSchema } from "@/lib/schemas/two-factor";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = confirmTotpSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { secret, code } = parsed.data;
  const step = verifyTotpCode(secret, code, null);
  if (step === null) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const backupCodes = generateBackupCodes();
  const hashedBackupCodes = await hashBackupCodes(backupCodes);

  await prisma.admin.update({
    where: { id: session.user.id },
    data: {
      totpSecret: secret,
      totpEnabled: true,
      totpLastUsedStep: step,
      backupCodes: hashedBackupCodes,
    },
  });

  // Shown once — never retrievable again after this response.
  return NextResponse.json({ backupCodes });
}
