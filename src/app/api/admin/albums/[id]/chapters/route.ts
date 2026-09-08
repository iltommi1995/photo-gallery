import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { createChapterSchema } from "@/lib/schemas/album";
import { revalidateAlbum } from "@/lib/revalidate-public";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const { id: albumId } = await params;
  const body = await request.json();
  const parsed = createChapterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const album = await prisma.album.findUnique({ where: { id: albumId } });
  if (!album) return NextResponse.json({ error: "Album not found" }, { status: 404 });

  const maxOrder = await prisma.chapter.aggregate({
    where: { albumId, viewport: parsed.data.viewport },
    _max: { order: true },
  });

  const chapter = await prisma.chapter.create({
    data: {
      albumId,
      viewport: parsed.data.viewport,
      label: parsed.data.label,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  await revalidateAlbum(albumId);
  return NextResponse.json({ chapter }, { status: 201 });
}
