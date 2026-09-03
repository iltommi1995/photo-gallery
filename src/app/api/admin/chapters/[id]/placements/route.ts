import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { replacePlacementsSchema } from "@/lib/schemas/album";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Replaces every placement in this chapter with the given list, in order.
 * Full-replace rather than diffing: the editor always holds the complete
 * intended layout client-side, and a chapter has at most a few dozen
 * photos, so this is simpler and more robust than reconciling individual
 * add/remove/reorder operations against server state.
 */
export async function PUT(request: Request, { params }: RouteContext) {
  const { id: chapterId } = await params;
  const body = await request.json();
  const parsed = replacePlacementsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const chapter = await prisma.chapter.findUnique({ where: { id: chapterId } });
  if (!chapter) return NextResponse.json({ error: "Chapter not found" }, { status: 404 });

  const photoIds = parsed.data.placements.map((p) => p.photoId);
  const existingPhotos = await prisma.photo.findMany({
    where: { id: { in: photoIds } },
    select: { id: true },
  });
  if (existingPhotos.length !== new Set(photoIds).size) {
    return NextResponse.json(
      { error: "One or more photoIds do not exist" },
      { status: 400 },
    );
  }

  await prisma.$transaction([
    prisma.placement.deleteMany({ where: { chapterId } }),
    prisma.placement.createMany({
      data: parsed.data.placements.map((p, index) => ({
        chapterId,
        photoId: p.photoId,
        size: p.size,
        order: index,
      })),
    }),
  ]);

  const placements = await prisma.placement.findMany({
    where: { chapterId },
    orderBy: { order: "asc" },
    include: { photo: { include: { tags: true } } },
  });

  return NextResponse.json({ placements });
}
