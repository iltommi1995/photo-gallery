import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { updateAlbumSchema } from "@/lib/schemas/album";
import { revalidateAlbum } from "@/lib/revalidate-public";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const album = await prisma.album.findUnique({
    where: { id },
    include: {
      chapters: {
        orderBy: { order: "asc" },
        include: {
          placements: {
            orderBy: { order: "asc" },
            include: { photo: { include: { tags: true } } },
          },
        },
      },
    },
  });
  if (!album) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ album });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const body = await request.json();
  const parsed = updateAlbumSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.album.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const album = await prisma.album.update({ where: { id }, data: parsed.data });
  await revalidateAlbum(id);
  return NextResponse.json({ album });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const existing = await prisma.album.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.album.delete({ where: { id } });
  // Not revalidateAlbum(id): the row is already gone, nothing left to look
  // up by id, so revalidate directly from the slug we already have.
  revalidatePath("/places");
  revalidatePath(`/places/${existing.slug}`);
  return NextResponse.json({ ok: true });
}
