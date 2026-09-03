import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { createAlbumSchema } from "@/lib/schemas/album";
import { slugify } from "@/lib/slug";

export async function GET() {
  const albums = await prisma.album.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { chapters: true } } },
  });
  return NextResponse.json({ albums });
}

async function uniqueSlug(base: string): Promise<string> {
  let candidate = base || "album";
  let suffix = 2;
  while (await prisma.album.findUnique({ where: { slug: candidate } })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createAlbumSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const slug = await uniqueSlug(parsed.data.slug || slugify(parsed.data.title));
  const maxOrder = await prisma.album.aggregate({ _max: { order: true } });

  const album = await prisma.album.create({
    data: {
      title: parsed.data.title,
      slug,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  return NextResponse.json({ album }, { status: 201 });
}
