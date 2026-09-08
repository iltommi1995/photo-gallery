import type { Metadata } from "next";

import { IndexScrollGrid } from "@/components/public/IndexScrollGrid";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Albums",
};

export const revalidate = 3600;

export default async function AlbumsPage() {
  const albums = await prisma.album.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { order: "asc" },
  });

  const coverPhotos = await prisma.photo.findMany({
    where: {
      id: {
        in: albums.map((a) => a.coverPhotoId).filter((id): id is string => Boolean(id)),
      },
    },
    select: { id: true, altText: true, blurDataUrl: true },
  });
  const coverById = new Map(coverPhotos.map((p) => [p.id, p]));

  const items = albums.map((album) => ({
    key: album.id,
    href: `/albums/${album.slug}`,
    label: album.title,
    cover: album.coverPhotoId ? (coverById.get(album.coverPhotoId) ?? null) : null,
  }));

  return (
    <main className="p-portfolio-gutter pt-24 sm:pt-28 gallery-short:flex gallery-short:h-dvh gallery-short:flex-col gallery-short:pt-16">
      <h1 className="sr-only">Albums</h1>
      <IndexScrollGrid items={items} emptyMessage="No published albums yet." />
    </main>
  );
}
