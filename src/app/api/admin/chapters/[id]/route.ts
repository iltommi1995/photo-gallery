import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { updateChapterSchema } from "@/lib/schemas/album";
import { revalidateAlbum, revalidateAlbumByChapter } from "@/lib/revalidate-public";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const body = await request.json();
  const parsed = updateChapterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.chapter.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const chapter = await prisma.chapter.update({ where: { id }, data: parsed.data });
  await revalidateAlbumByChapter(id);
  return NextResponse.json({ chapter });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const existing = await prisma.chapter.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.chapter.delete({ where: { id } });
  // Not revalidateAlbumByChapter: the chapter row is already gone, so use
  // the albumId we already fetched above instead of looking it up again.
  await revalidateAlbum(existing.albumId);
  return NextResponse.json({ ok: true });
}
