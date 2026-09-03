import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";

/** Call after any mutation that could change what a published album looks
 * like — the Places index, the album page itself, and (in case its cover
 * photo changed) the home hero. */
export async function revalidateAlbum(albumId: string) {
  const album = await prisma.album.findUnique({
    where: { id: albumId },
    select: { slug: true },
  });
  revalidatePath("/places");
  if (album) revalidatePath(`/places/${album.slug}`);
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
