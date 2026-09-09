import type { Metadata } from "next";

import { PlacesView } from "@/components/public/PlacesView";
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
  const mapPlaces = places
    .filter((place) => place.lat != null && place.lng != null)
    .map((place) => ({
      slug: place.slug,
      name: place.name,
      photoCount: place.photos.length,
      lat: place.lat as number,
      lng: place.lng as number,
    }));

  return (
    <main className="p-portfolio-gutter pt-24 sm:pt-28 flex min-h-dvh flex-col gallery-wide:block gallery-wide:min-h-0 gallery-short:flex gallery-short:h-dvh gallery-short:flex-col gallery-short:pt-16">
      <h1 className="sr-only">Places</h1>
      <PlacesView
        items={items}
        mapPlaces={mapPlaces}
        emptyMessage="No published photos yet."
      />
    </main>
  );
}
