import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";

/** Invalidate both collections: a photo can appear in an album and a place. */
export function revalidatePublicGalleries() {
  revalidatePath("/places", "layout");
  revalidatePath("/albums", "layout");
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
