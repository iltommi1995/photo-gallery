import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";

/**
 * Invalidate both collections: a photo can appear in an album and a place.
 * No `"layout"` type argument — these are literal paths (no dynamic
 * segments), and passing `"layout"` for one looks for an actual
 * `layout.tsx` at that exact segment. Neither `/places` nor `/albums` has
 * one (only a `page.tsx`), so that call was a silent no-op: deleting an
 * album kept serving the stale, pre-deletion `/albums` page indefinitely,
 * discovered live in production. Per Next.js's own docs: "If path is a
 * literal path like /product/1, omit type."
 */
export function revalidatePublicGalleries() {
  revalidatePath("/places");
  revalidatePath("/albums");
  revalidatePath("/sitemap.xml");
}

/** Refresh album pages and their corresponding location collections after edits. */
export async function revalidateAlbum(albumId: string) {
  const album = await prisma.album.findUnique({
    where: { id: albumId },
    select: { slug: true },
  });
  revalidatePublicGalleries();
  if (album) revalidatePath(`/albums/${album.slug}`);
}

export async function revalidateAlbumByChapter(chapterId: string) {
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: { albumId: true },
  });
  if (chapter) await revalidateAlbum(chapter.albumId);
}

export function revalidateSiteSettings() {
  revalidatePath("/");
  revalidatePath("/about");
}
