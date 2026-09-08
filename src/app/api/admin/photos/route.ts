import { z } from "zod";
import { mkdir, writeFile } from "node:fs/promises";

import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { extractExif } from "@/lib/exif/extract";
import { generateImageVariants } from "@/lib/image/variants";
import { deletePhoto } from "@/lib/photo-deletion";
import { revalidatePublicGalleries } from "@/lib/revalidate-public";
import { validateUploadFile, photoMetadataSchema } from "@/lib/schemas/photo";
import { newPhotoId, photoPaths } from "@/lib/storage";

const photoPageQuery = z.object({
  limit: z.coerce.number().int().min(1).max(60).default(24),
  cursor: z.string().min(1).optional(),
  q: z.string().trim().max(200).default(""),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  // Preserve the existing complete-library response for the editor and metadata UI.
  if (!url.searchParams.has("limit")) {
    const photos = await prisma.photo.findMany({
      orderBy: { createdAt: "desc" },
      include: { tags: true, placements: true },
    });
    return NextResponse.json({ photos });
  }
  const query = photoPageQuery.safeParse(Object.fromEntries(url.searchParams));
  if (!query.success)
    return NextResponse.json({ error: "Invalid photo query" }, { status: 400 });
  const { limit, cursor, q } = query.data;
  const photos = await prisma.photo.findMany({
    where: q
      ? {
          OR: [
            { filename: { contains: q, mode: "insensitive" } },
            { altText: { contains: q, mode: "insensitive" } },
            { locationName: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    take: limit + 1,
    select: { id: true, filename: true, altText: true },
  });
  const hasMore = photos.length > limit;
  const page = photos.slice(0, limit);
  return NextResponse.json({
    photos: page,
    nextCursor: hasMore ? page.at(-1)!.id : null,
  });
}
type UploadResult =
  | { filename: string; ok: true; photo: { id: string } }
  | { filename: string; ok: false; error: string };

export async function POST(request: Request) {
  const formData = await request.formData();
  const suppliedAlt = formData.get("altText");
  const metadata =
    suppliedAlt === null ? null : photoMetadataSchema.safeParse({ altText: suppliedAlt });
  if (metadata && !metadata.success)
    return NextResponse.json(
      { error: "Alt text is required (maximum 300 characters)" },
      { status: 400 },
    );
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
          altText: metadata?.success ? metadata.data.altText : undefined,
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

const bulkDeleteSchema = z.object({ ids: z.array(z.string()).min(1).max(200) });

/** Bulk delete for the Photos admin page's multi-select — each id is
 * checked independently (a photo still in use is skipped, not failed as a
 * batch) so one in-use photo doesn't block deleting the rest. */
export async function DELETE(request: Request) {
  const body = await request.json();
  const parsed = bulkDeleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const results = await Promise.all(
    parsed.data.ids.map(async (id) => ({ id, result: await deletePhoto(id) })),
  );
  const deleted = results.filter((r) => r.result.ok).map((r) => r.id);
  const failed = results.flatMap((r) =>
    r.result.ok ? [] : [{ id: r.id, error: r.result.error }],
  );

  if (deleted.length) revalidatePublicGalleries();
  return NextResponse.json({ deleted, failed });
}
