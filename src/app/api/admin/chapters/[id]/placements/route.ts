import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { gridPlacementsSchema } from "@/lib/schemas/album";
import { revalidateAlbumByChapter } from "@/lib/revalidate-public";

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
  const parsed = gridPlacementsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const chapter = await prisma.chapter.findUnique({ where: { id: chapterId } });
  if (!chapter) return NextResponse.json({ error: "Chapter not found" }, { status: 404 });

  const photoIds = parsed.data.placements.flatMap((p) =>
    p.type === "PHOTO" ? [p.photoId] : [],
  );
  const existingPhotos = await prisma.photo.findMany({
    where: { id: { in: photoIds } },
    select: { id: true, altText: true },
  });
  if (existingPhotos.length !== new Set(photoIds).size) {
    return NextResponse.json(
      { error: "One or more photoIds do not exist" },
      { status: 400 },
    );
  }

  if (existingPhotos.some((photo) => !photo.altText?.trim())) {
    return NextResponse.json(
      { error: "Every photo needs alt text before placement" },
      { status: 400 },
    );
  }

  await prisma.$transaction([
    prisma.placement.deleteMany({ where: { chapterId } }),
    prisma.placement.createMany({
      data: parsed.data.placements.map((p, index) => ({
        chapterId,
        type: p.type,
        photoId: p.type === "PHOTO" ? p.photoId : null,
        preserveAspectRatio: p.type === "PHOTO" ? p.preserveAspectRatio : false,
        textContent: p.type === "TEXT" ? p.textContent : null,
        colSpan: p.colSpan,
        rowSpan: p.rowSpan,
        gridColumn: p.gridColumn,
        gridRow: p.gridRow,
        order: index,
      })),
    }),
  ]);

  const placements = await prisma.placement.findMany({
    where: { chapterId },
    orderBy: { order: "asc" },
    include: { photo: { include: { tags: true } } },
  });

  await revalidateAlbumByChapter(chapterId);
  return NextResponse.json({ placements });
}
