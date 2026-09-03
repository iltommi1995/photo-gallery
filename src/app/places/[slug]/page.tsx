import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AlbumScrollView } from "@/components/public/AlbumScrollView";
import { prisma } from "@/lib/db";

type AlbumPageProps = {
  params: Promise<{ slug: string }>;
};

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
