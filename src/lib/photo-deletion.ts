import { rm } from "node:fs/promises";

import { prisma } from "@/lib/db";
import { photoDir } from "@/lib/storage";

/**
 * Deletes a photo and its files, refusing when it's still referenced
 * anywhere (a chapter placement, an album cover, or the site's hero/about
 * photo) — deleting it out from under one of those would silently break a
 * published page rather than fail loudly, so the admin has to clear those
 * uses first.
 */
export async function deletePhoto(
  photoId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [placementCount, coverCount, settings] = await Promise.all([
    prisma.placement.count({ where: { photoId } }),
    prisma.album.count({ where: { coverPhotoId: photoId } }),
    prisma.siteSettings.findUnique({
      where: { id: "singleton" },
      select: { heroPhotoId: true, aboutPhotoId: true },
    }),
  ]);
  const reasons = [
    placementCount > 0 && `${placementCount} placement${placementCount === 1 ? "" : "s"}`,
    coverCount > 0 && `${coverCount} album cover${coverCount === 1 ? "" : "s"}`,
    settings?.heroPhotoId === photoId && "the home hero photo",
    settings?.aboutPhotoId === photoId && "the About page photo",
  ].filter((r): r is string => Boolean(r));

  if (reasons.length > 0) {
    return { ok: false, error: `Still in use: ${reasons.join(", ")}` };
  }

  await prisma.photo.delete({ where: { id: photoId } });
  await rm(photoDir(photoId), { recursive: true, force: true });
  return { ok: true };
}
