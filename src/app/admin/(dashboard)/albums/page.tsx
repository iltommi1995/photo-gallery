import type { Metadata } from "next";
import Link from "next/link";

import { NewAlbumForm } from "@/components/admin/NewAlbumForm";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Albums",
};

export default async function AlbumsPage() {
  const albums = await prisma.album.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { chapters: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Albums</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Each album is organized into chapters — build the mosaic layout inside the
            editor.
          </p>
        </div>
        <NewAlbumForm />
      </div>

      <div className="flex flex-col divide-y rounded-lg border">
        {albums.map((album) => (
          <Link
            key={album.id}
            href={`/admin/albums/${album.id}`}
            className="hover:bg-muted/50 flex items-center justify-between gap-4 px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium">{album.title}</p>
              <p className="text-muted-foreground text-xs">
                /places/{album.slug} · {album._count.chapters} chapter
                {album._count.chapters === 1 ? "" : "s"}
              </p>
            </div>
            <Badge variant={album.status === "PUBLISHED" ? "default" : "outline"}>
              {album.status}
            </Badge>
          </Link>
        ))}
        {albums.length === 0 && (
          <p className="text-muted-foreground px-4 py-6 text-sm">
            No albums yet — create one above.
          </p>
        )}
      </div>
    </div>
  );
}
