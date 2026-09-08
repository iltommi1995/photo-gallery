import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { cloneChaptersSchema } from "@/lib/schemas/album";
import { revalidateAlbum } from "@/lib/revalidate-public";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Deep-clones every Web chapter (and its placements) into new rows under
 * `toViewport` — an editable starting point for a mobile chapter structure
 * that doesn't exist yet, since authoring N chapters from a blank canvas
 * is a lot more work than editing a copy. Refuses if the target viewport
 * already has chapters: this is specifically the "start from Web" action
 * for an empty viewport, not a merge/overwrite tool.
 */
export async function POST(request: Request, { params }: RouteContext) {
  const { id: albumId } = await params;
  const body = await request.json();
  const parsed = cloneChaptersSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { toViewport } = parsed.data;

  const existingTarget = await prisma.chapter.count({
    where: { albumId, viewport: toViewport },
  });
  if (existingTarget > 0) {
    return NextResponse.json(
      {
        error: "This viewport already has chapters — clone only applies to an empty one",
      },
      { status: 400 },
    );
  }

  const webChapters = await prisma.chapter.findMany({
    where: { albumId, viewport: "WEB" },
    orderBy: { order: "asc" },
    include: { placements: { orderBy: { order: "asc" } } },
  });
  if (webChapters.length === 0) {
    return NextResponse.json({ error: "No Web chapters to clone" }, { status: 400 });
  }

  const cloned = await prisma.$transaction(async (tx) => {
    const chapters = [];
    for (const source of webChapters) {
      const chapter = await tx.chapter.create({
        data: {
          albumId,
          viewport: toViewport,
          label: source.label,
          order: source.order,
        },
      });
      if (source.placements.length > 0) {
        await tx.placement.createMany({
          data: source.placements.map((p) => ({
            chapterId: chapter.id,
            type: p.type,
            photoId: p.photoId,
            preserveAspectRatio: p.preserveAspectRatio,
            textContent: p.textContent,
            colSpan: p.colSpan,
            rowSpan: p.rowSpan,
            gridColumn: p.gridColumn,
            gridRow: p.gridRow,
            order: p.order,
          })),
        });
      }
      chapters.push(chapter);
    }
    return chapters;
  });

  const chapters = await prisma.chapter.findMany({
    where: { id: { in: cloned.map((c) => c.id) } },
    orderBy: { order: "asc" },
    include: {
      placements: {
        orderBy: { order: "asc" },
        include: { photo: { include: { tags: true } } },
      },
    },
  });

  await revalidateAlbum(albumId);
  return NextResponse.json({ chapters }, { status: 201 });
}
