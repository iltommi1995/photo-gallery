import { cache } from "react";
import { prisma } from "@/lib/db";
import { groupPhotosByPlace } from "@/lib/places";

// Being uploaded alone does not publish a photo. Only published album
// placements contribute to the public location archive; each photo appears once.
export const getPublicPlaces = cache(async () => {
  const photos = await prisma.photo.findMany({
    where: {
      placements: { some: { chapter: { album: { status: "PUBLISHED" } } } },
      altText: { not: null },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  return groupPhotosByPlace(photos.filter((photo) => photo.altText?.trim()));
});
