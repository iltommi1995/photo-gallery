import type { Photo } from "@prisma/client";

type LocatedPhoto = Pick<
  Photo,
  "id" | "locationName" | "takenAt" | "createdAt" | "gpsLat" | "gpsLng"
>;

export function groupPhotosByPlace<T extends LocatedPhoto>(photos: T[]) {
  const places = new Map<
    string,
    { slug: string; name: string; photos: T[]; lat: number | null; lng: number | null }
  >();
  for (const photo of photos) {
    const name =
      photo.locationName?.trim().replace(/\s+/g, " ") || "Location not specified";
    // Keep the complete location, including country, to avoid city-name collisions.
    const slug = name.normalize("NFC").toLowerCase();
    const place = places.get(slug) ?? { slug, name, photos: [], lat: null, lng: null };
    if (!place.photos.some((existing) => existing.id === photo.id))
      place.photos.push(photo);
    // First photo in the group with real coordinates stands in as the
    // place's map marker position — good enough for a "which place" pin,
    // not meant to be a precise centroid.
    if (place.lat === null && photo.gpsLat != null && photo.gpsLng != null) {
      place.lat = photo.gpsLat;
      place.lng = photo.gpsLng;
    }
    places.set(slug, place);
  }
  for (const place of places.values()) {
    place.photos.sort((a, b) => {
      if (a.takenAt && !b.takenAt) return -1;
      if (!a.takenAt && b.takenAt) return 1;
      return (
        (a.takenAt?.getTime() ?? 0) - (b.takenAt?.getTime() ?? 0) ||
        a.createdAt.getTime() - b.createdAt.getTime() ||
        a.id.localeCompare(b.id)
      );
    });
  }
  return [...places.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function groupPhotosByYear<T extends LocatedPhoto>(photos: T[]) {
  const years = new Map<string, T[]>();
  for (const photo of photos) {
    const label = photo.takenAt ? String(photo.takenAt.getUTCFullYear()) : "Undated";
    const group = years.get(label) ?? [];
    group.push(photo);
    years.set(label, group);
  }
  return [...years].map(([label, photos]) => ({ label, photos }));
}
