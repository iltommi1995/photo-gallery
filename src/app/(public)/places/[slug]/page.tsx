import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AlbumScrollView } from "@/components/public/AlbumScrollView";
import { prisma } from "@/lib/db";

// Published albums are pre-rendered at build time and revalidated on
// publish/edit (see revalidatePath calls in the album/chapter API routes)
// rather than on a fixed interval — an hour is just a safety net.
export const revalidate = 3600;

type AlbumPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const albums = await prisma.album.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true },
  });
  return albums.map((album) => ({ slug: album.slug }));
}

async function getAlbum(slug: string) {
  return prisma.album.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: {
      chapters: {
        orderBy: { order: "asc" },
        include: {
          placements: { orderBy: { order: "asc" }, include: { photo: true } },
        },
      },
    },
  });
}

export async function generateMetadata({ params }: AlbumPageProps): Promise<Metadata> {
  const { slug } = await params;
  const album = await getAlbum(slug);
  if (!album) return {};
  return {
    title: album.title,
    description: album.description ?? album.subtitle ?? undefined,
  };
}

export default async function AlbumPage({ params }: AlbumPageProps) {
  const { slug } = await params;
  const album = await getAlbum(slug);
  if (!album) notFound();

  const coverPhoto = album.coverPhotoId
    ? await prisma.photo.findUnique({
        where: { id: album.coverPhotoId },
        select: { id: true, altText: true, blurDataUrl: true },
      })
    : null;

  return (
    <AlbumScrollView
      title={album.title}
      coverPhoto={coverPhoto}
      chapters={album.chapters.map((chapter) => ({
        id: chapter.id,
        label: chapter.label,
        placements: chapter.placements,
      }))}
    />
  );
}
