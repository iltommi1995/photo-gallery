import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { AlbumScrollView, type ScrollChapter } from "@/components/public/AlbumScrollView";
import { rowSpanForAspectRatio } from "@/lib/gallery/aspect-ratio";
import { getPublicPlaces } from "@/lib/public-places";
import { groupPhotosByYear } from "@/lib/places";
import { prisma } from "@/lib/db";

// Auto-generated chapters have no admin-picked sizes, unlike a real
// album. Two fixed columns (colSpan 6 of the 12-column grid) — not four
// (colSpan 3) — because resolveGrid's auto-flow only wraps to a new row
// once a row's width is full: four same-sized landscape photos at
// colSpan 3 fill one row exactly (4 * 3 = 12) and, since nothing
// occupies the row(s) below them, each still stretches to the mosaic's
// full height regardless of rowSpan — colSpan 3 never actually produced
// a 2-row layout. At colSpan 6, two photos fill a row and the rest wrap
// below it. rowSpan is still derived per photo from its real
// width/height, so a landscape photo reads as a wide cell within its
// half-width column and a portrait photo as a tall one.
const PLACE_PHOTO_COL_SPAN = 6;
// Each synthesized page holds exactly a 2x2 grid (2 columns from
// colSpan 6 above * 2 rows) — beyond 4 photos, the next 4 become a new
// page (chapter section) instead of stacking further rows onto the same
// one, matching how a real album's chapters are separate horizontal
// pages rather than one ever-taller mosaic.
const PLACE_PHOTOS_PER_PAGE = 4;

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
      for (let offset = 0; offset < photos.length; offset += PLACE_PHOTOS_PER_PAGE) {
        const pagePhotos = photos.slice(offset, offset + PLACE_PHOTOS_PER_PAGE);
        const rowSpans = pagePhotos.map((photo) =>
          rowSpanForAspectRatio(PLACE_PHOTO_COL_SPAN, photo.width, photo.height),
        );
        // A page with fewer than 4 photos (the last page of a year, most
        // often) would otherwise stretch its remaining photo(s) to fill
        // the whole page height instead of leaving the missing quadrant
        // empty — reserve the full 2-row grid using the top row's own
        // rowSpan as the unit, even if the bottom row has no photos.
        const minRowCount = Math.max(...rowSpans.slice(0, 2)) * 2;
        sections.push({
          id: `${place.slug}-${label}-${offset}`,
          label,
          minRowCount,
          placements: pagePhotos.map((photo, index) => ({
            id: photo.id,
            type: "PHOTO" as const,
            colSpan: PLACE_PHOTO_COL_SPAN,
            rowSpan: rowSpans[index],
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
      // Both admin-configurable per real album — hardcoded here instead,
      // since a place's "chapters" are just synthesized year groupings,
      // not curated sections worth a title or a page-break between them.
      showChapterLabels={false}
      chapterLayout="CONTINUOUS"
    />
  );
}
