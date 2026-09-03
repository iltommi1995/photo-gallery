import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { createTagSchema } from "@/lib/schemas/tag";
import { slugify } from "@/lib/slug";

export async function GET() {
  const tags = await prisma.tag.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ tags });
}

/** Create-or-get: returns the existing tag if the slug already exists. */
export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createTagSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const slug = slugify(parsed.data.name);
  if (!slug) {
    return NextResponse.json(
      { error: "Name must contain at least one letter or number" },
      { status: 400 },
    );
  }

  const tag = await prisma.tag.upsert({
    where: { slug },
    update: {},
    create: { name: parsed.data.name, slug },
  });

  return NextResponse.json({ tag }, { status: 201 });
}
