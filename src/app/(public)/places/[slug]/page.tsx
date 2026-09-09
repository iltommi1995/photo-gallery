import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { AlbumScrollView, type ScrollChapter } from "@/components/public/AlbumScrollView";
import { rowSpanForAspectRatio } from "@/lib/gallery/aspect-ratio";
import { getPublicPlaces } from "@/lib/public-places";
import { groupPhotosByYear } from "@/lib/places";
import { prisma } from "@/lib/db";

// Auto-generated chapters have no admin-picked sizes, unlike a real
// album — a fixed square (colSpan 3, rowSpan 3) for every photo crops
// wide landscape shots into tall slivers. Keep colSpan fixed and derive
// rowSpan from each photo's real width/height instead, so a landscape
// photo reads as a wide cell and a portrait photo as a tall one.
const PLACE_PHOTO_COL_SPAN = 3;

export const revalidate = 3600;
type PlacePageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getPublicPlaces()).map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: PlacePageProps): Promise<Metadata> {
  const { slug } = await params;
  const place = (await getPublicPlaces()).find(
    (place) => encodeURIComponent(place.slug) === slug || place.slug === slug,
  );
  return place
    ? {
        title: place.name,
        alternates: { canonical: `/places/${encodeURIComponent(place.slug)}` },
      }
    : {};
}

export default async function PlacePage({ params }: PlacePageProps) {
  const { slug } = await params;
  const place = (await getPublicPlaces()).find(
    (place) => encodeURIComponent(place.slug) === slug || place.slug === slug,
  );
  if (!place) {
    // Preserve links to albums shared before Places became a location archive.
    const album = await prisma.album.findFirst({
      where: { slug, status: "PUBLISHED" },
      select: { slug: true },
    });
    if (album) permanentRedirect(`/albums/${album.slug}`);
    notFound();
  }
  const chapters: ScrollChapter[] = groupPhotosByYear(place.photos).flatMap(
    ({ label, photos }) => {
      const sections: ScrollChapter[] = [];
      // Keep long years in manageable mosaics without changing chronological order.
      for (let offset = 0; offset < photos.length; offset += 8) {
        sections.push({
          id: `${place.slug}-${label}-${offset}`,
          label,
          placements: photos.slice(offset, offset + 8).map((photo) => ({
            id: photo.id,
            type: "PHOTO" as const,
            colSpan: PLACE_PHOTO_COL_SPAN,
            rowSpan: rowSpanForAspectRatio(
              PLACE_PHOTO_COL_SPAN,
              photo.width,
              photo.height,
            ),
            photo,
          })),
        });
      }
      return sections;
    },
  );
  return (
    <AlbumScrollView
      title={place.name}
      coverPhoto={place.photos[0]}
      webChapters={chapters}
      // Synthesized on the fly from photos grouped by year — there's no
      // admin-authored Chapter row here to hold a mobile override, so this
      // view never has one; it always falls back to the chapters above.
      mobileLandscapeChapters={[]}
      mobilePortraitChapters={[]}
    />
  );
}
