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

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

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

async function getCoverPhoto(coverPhotoId: string | null) {
  if (!coverPhotoId) return null;
  return prisma.photo.findUnique({
    where: { id: coverPhotoId },
    select: { id: true, altText: true, blurDataUrl: true, width: true, height: true },
  });
}

export async function generateMetadata({ params }: AlbumPageProps): Promise<Metadata> {
  const { slug } = await params;
  const album = await getAlbum(slug);
  if (!album) return {};

  const cover = await getCoverPhoto(album.coverPhotoId);
  const description = album.description ?? album.subtitle ?? undefined;
  const url = `${siteUrl()}/places/${album.slug}`;

  return {
    title: album.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: album.title,
      description,
      url,
      type: "website",
      images: cover
        ? [
            {
              url: `${siteUrl()}/api/media/${cover.id}/full`,
              width: cover.width,
              height: cover.height,
              alt: cover.altText ?? album.title,
            },
          ]
        : undefined,
    },
  };
}

export default async function AlbumPage({ params }: AlbumPageProps) {
  const { slug } = await params;
  const album = await getAlbum(slug);
  if (!album) notFound();

  const coverPhoto = await getCoverPhoto(album.coverPhotoId);

  const allPhotos = album.chapters.flatMap((c) => c.placements.map((p) => p.photo));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ImageGallery",
    name: album.title,
    description: album.description ?? album.subtitle ?? undefined,
    url: `${siteUrl()}/places/${album.slug}`,
    image: allPhotos.map((photo) => ({
      "@type": "Photograph",
      contentUrl: `${siteUrl()}/api/media/${photo.id}/full`,
      name: photo.caption ?? photo.altText ?? undefined,
      ...(photo.locationName ? { contentLocation: photo.locationName } : {}),
      ...(photo.takenAt ? { dateCreated: photo.takenAt.toISOString() } : {}),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Escape "<" so admin-entered text (caption, location) can't break
        // out of the script tag via a literal "</script>" substring.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <AlbumScrollView
        title={album.title}
        coverPhoto={coverPhoto}
        chapters={album.chapters.map((chapter) => ({
          id: chapter.id,
          label: chapter.label,
          placements: chapter.placements,
        }))}
      />
    </>
  );
}
