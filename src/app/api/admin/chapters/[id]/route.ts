import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { updateChapterSchema } from "@/lib/schemas/album";

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
  return NextResponse.json({ chapter });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const existing = await prisma.chapter.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.chapter.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
