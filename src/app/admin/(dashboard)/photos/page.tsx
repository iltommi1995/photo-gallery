import type { Metadata } from "next";

import { PhotoLibraryGrid } from "@/components/admin/PhotoLibraryGrid";
import { PhotoUploadZone } from "@/components/admin/PhotoUploadZone";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Photos",
};

export default async function PhotosPage() {
  const [photos, tags] = await Promise.all([
    prisma.photo.findMany({
      orderBy: { createdAt: "desc" },
      include: { tags: true, placements: true },
    }),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Photos</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Upload photos, review extracted EXIF, and fill in what&apos;s missing (alt text
          is required before a photo can go into an album).
        </p>
      </div>

      <PhotoUploadZone />

      <PhotoLibraryGrid photos={photos} tags={tags} />
    </div>
  );
}
