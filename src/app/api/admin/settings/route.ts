import { NextResponse } from "next/server";

import { getSiteSettings } from "@/lib/settings";
import { updateSettingsSchema } from "@/lib/schemas/settings";
import { prisma } from "@/lib/db";
import { revalidateSiteSettings } from "@/lib/revalidate-public";

export async function GET() {
  const settings = await getSiteSettings();
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await getSiteSettings(); // ensure the row exists
  const settings = await prisma.siteSettings.update({
    where: { id: "singleton" },
    data: parsed.data,
  });

  revalidateSiteSettings();
  return NextResponse.json({ settings });
}
