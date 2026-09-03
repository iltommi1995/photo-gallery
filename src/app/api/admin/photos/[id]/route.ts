import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { photoMetadataSchema } from "@/lib/schemas/photo";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const photo = await prisma.photo.findUnique({ where: { id }, include: { tags: true } });
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ photo });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const body = await request.json();
  const parsed = photoMetadataSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.photo.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { tagIds, ...fields } = parsed.data;

  const photo = await prisma.photo.update({
    where: { id },
    data: {
      ...fields,
      ...(tagIds ? { tags: { set: tagIds.map((tagId) => ({ id: tagId })) } } : {}),
    },
    include: { tags: true },
  });

  return NextResponse.json({ photo });
}
