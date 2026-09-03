import type { Metadata } from "next";
import Image from "next/image";

import { PhotoMetadataDialog } from "@/components/admin/PhotoMetadataDialog";
import { PhotoUploadZone } from "@/components/admin/PhotoUploadZone";
import { Button } from "@/components/ui/button";
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

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {photos.map((photo) => (
          <div key={photo.id} className="flex flex-col gap-2">
            <div className="bg-muted relative aspect-[3/2] overflow-hidden rounded-md">
              {photo.thumbnailPath && (
                <Image
                  src={`/api/media/${photo.id}/thumbnail`}
                  alt={photo.altText ?? ""}
                  fill
                  sizes="200px"
                  className="object-cover"
                />
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{photo.filename}</p>
                <p className="text-muted-foreground text-xs">
                  {photo.altText ? "" : "Needs alt text · "}
                  {photo.placements.length} placement
                  {photo.placements.length === 1 ? "" : "s"}
                </p>
              </div>
              <PhotoMetadataDialog
                photo={photo}
                allTags={tags}
                trigger={
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                }
              />
            </div>
          </div>
        ))}
        {photos.length === 0 && (
          <p className="text-muted-foreground col-span-full text-sm">
            No photos yet — upload some above.
          </p>
        )}
      </div>
    </div>
  );
}
