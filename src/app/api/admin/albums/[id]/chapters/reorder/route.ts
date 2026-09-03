import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { reorderChaptersSchema } from "@/lib/schemas/album";
import { revalidateAlbum } from "@/lib/revalidate-public";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id: albumId } = await params;
  const body = await request.json();
  const parsed = reorderChaptersSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const chapters = await prisma.chapter.findMany({ where: { albumId } });
  const validIds = new Set(chapters.map((c) => c.id));
  if (
    parsed.data.chapterIds.length !== chapters.length ||
    !parsed.data.chapterIds.every((id) => validIds.has(id))
  ) {
    return NextResponse.json(
      { error: "chapterIds must be exactly this album's chapter ids" },
      { status: 400 },
    );
  }

  await prisma.$transaction(
    parsed.data.chapterIds.map((id, index) =>
      prisma.chapter.update({ where: { id }, data: { order: index } }),
    ),
  );

  await revalidateAlbum(albumId);
  return NextResponse.json({ ok: true });
}
