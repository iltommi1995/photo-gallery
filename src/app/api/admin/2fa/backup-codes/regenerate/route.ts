import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { generateBackupCodes, hashBackupCodes } from "@/lib/auth/backup-codes";
import { prisma } from "@/lib/db";
import { regenerateBackupCodesSchema } from "@/lib/schemas/two-factor";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = regenerateBackupCodesSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const admin = await prisma.admin.findUnique({ where: { id: session.user.id } });
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!admin.totpEnabled) {
    return NextResponse.json({ error: "2FA is not enabled" }, { status: 400 });
  }

  const validPassword = await bcrypt.compare(parsed.data.password, admin.passwordHash);
  if (!validPassword) {
    return NextResponse.json({ error: "Invalid password" }, { status: 400 });
  }

  const backupCodes = generateBackupCodes();
  const hashedBackupCodes = await hashBackupCodes(backupCodes);
  await prisma.admin.update({
    where: { id: admin.id },
    data: { backupCodes: hashedBackupCodes },
  });

  return NextResponse.json({ backupCodes });
}
