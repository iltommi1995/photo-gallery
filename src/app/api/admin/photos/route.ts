import { mkdir, writeFile } from "node:fs/promises";

import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { extractExif } from "@/lib/exif/extract";
import { generateImageVariants } from "@/lib/image/variants";
import { validateUploadFile } from "@/lib/schemas/photo";
import { newPhotoId, photoPaths } from "@/lib/storage";

export async function GET() {
  const photos = await prisma.photo.findMany({
    orderBy: { createdAt: "desc" },
    include: { tags: true, placements: true },
  });
  return NextResponse.json({ photos });
}

type UploadResult =
  | { filename: string; ok: true; photo: { id: string } }
  | { filename: string; ok: false; error: string };

export async function POST(request: Request) {
  const formData = await request.formData();
  const files = formData.getAll("files").filter((f): f is File => f instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const results: UploadResult[] = [];

  for (const file of files) {
    const validation = validateUploadFile(file);
    if (!validation.ok) {
      results.push({ filename: file.name, ok: false, error: validation.error });
      continue;
    }

    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const id = newPhotoId();
      const paths = photoPaths(id, validation.ext);

      await mkdir(paths.dir, { recursive: true });
      await writeFile(paths.original, buffer);

      const [exif, variants] = await Promise.all([
        extractExif(buffer),
        generateImageVariants(buffer, paths),
      ]);

      const photo = await prisma.photo.create({
        data: {
          id,
          filename: file.name,
          originalPath: paths.original,
          thumbnailPath: paths.thumbnail,
          mediumPath: paths.medium,
          fullPath: paths.full,
          width: variants.width,
          height: variants.height,
          blurDataUrl: variants.blurDataUrl,
          ...exif,
        },
      });

      results.push({ filename: file.name, ok: true, photo: { id: photo.id } });
    } catch (error) {
      results.push({
        filename: file.name,
        ok: false,
        error: error instanceof Error ? error.message : "Processing failed",
      });
    }
  }

  const status = results.every((r) => r.ok) ? 201 : 207;
  return NextResponse.json({ results }, { status });
}
