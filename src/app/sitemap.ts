import { getPublicPlaces } from "@/lib/public-places";
import type { MetadataRoute } from "next";

import { prisma } from "@/lib/db";

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const albums = await prisma.album.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true, updatedAt: true },
  });

  const places = await getPublicPlaces();

  return [
    { url: base, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/places`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/about`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/albums`, changeFrequency: "weekly", priority: 0.8 },
    ...places.map((place) => ({
      url: `${base}/places/${encodeURIComponent(place.slug)}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...albums.map((album) => ({
      url: `${base}/albums/${album.slug}`,
      lastModified: album.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
