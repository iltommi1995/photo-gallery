import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { AccentLabel } from "@/components/public/AccentLabel";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Places",
};

export const revalidate = 3600;

export default async function PlacesPage() {
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

  return (
    <main className="p-portfolio-gutter pt-24 sm:pt-28">
      <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
        {albums.map((album) => {
          const cover = album.coverPhotoId
            ? coverById.get(album.coverPhotoId)
            : undefined;
          return (
            <Link
              key={album.id}
              href={`/places/${album.slug}`}
              className="group flex flex-col gap-3"
            >
              <div className="bg-muted relative aspect-[4/3] overflow-hidden grayscale transition-[filter] group-hover:grayscale-0">
                {cover && (
                  <Image
                    src={`/api/media/${cover.id}/medium`}
                    alt={cover.altText ?? ""}
                    fill
                    placeholder={cover.blurDataUrl ? "blur" : undefined}
                    blurDataURL={cover.blurDataUrl ?? undefined}
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                    className="object-cover"
                  />
                )}
              </div>
              <AccentLabel>{album.title}</AccentLabel>
            </Link>
          );
        })}
      </div>
      {albums.length === 0 && (
        <p className="text-portfolio-ink/60 text-sm">No published albums yet.</p>
      )}
    </main>
  );
}
