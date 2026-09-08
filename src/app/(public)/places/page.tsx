import type { Metadata } from "next";

import { IndexScrollGrid } from "@/components/public/IndexScrollGrid";
import { getPublicPlaces } from "@/lib/public-places";

export const metadata: Metadata = { title: "Places" };
export const revalidate = 3600;

export default async function PlacesPage() {
  const places = await getPublicPlaces();
  const items = places.map((place) => ({
    key: place.slug,
    href: `/places/${encodeURIComponent(place.slug)}`,
    label: place.name,
    sublabel: `${place.photos.length} ${place.photos.length === 1 ? "photo" : "photos"}`,
    cover: place.photos[0] ?? null,
  }));

  return (
    <main className="p-portfolio-gutter pt-24 sm:pt-28 gallery-short:flex gallery-short:h-dvh gallery-short:flex-col gallery-short:pt-16">
      <h1 className="sr-only">Places</h1>
      <IndexScrollGrid items={items} emptyMessage="No published photos yet." />
    </main>
  );
}
