import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { disable2faSchema } from "@/lib/schemas/two-factor";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = disable2faSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const admin = await prisma.admin.findUnique({ where: { id: session.user.id } });
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const validPassword = await bcrypt.compare(parsed.data.password, admin.passwordHash);
  if (!validPassword) {
    return NextResponse.json({ error: "Invalid password" }, { status: 400 });
  }

  await prisma.admin.update({
    where: { id: admin.id },
    data: {
      totpSecret: null,
      totpEnabled: false,
      totpLastUsedStep: null,
      backupCodes: [],
    },
  });

  return NextResponse.json({ ok: true });
}
