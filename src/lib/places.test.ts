import { describe, expect, it } from "vitest";
import { groupPhotosByPlace, groupPhotosByYear } from "./places";

const photo = (id: string, locationName: string | null, date: string | null) => ({
  id,
  locationName,
  takenAt: date ? new Date(date) : null,
  createdAt: new Date("2026-01-01"),
  gpsLat: null,
  gpsLng: null,
});

describe("public place collections", () => {
  it("combines the same location across albums, removes duplicates and sorts by capture date", () => {
    const early = photo("early", "Milan, Italy", "2018-02-01");
    const places = groupPhotosByPlace([
      photo("late", " milan,  Italy ", "2024-01-01"),
      photo("unknown", "Milan, Italy", null),
      early,
      early,
      photo("berlin", "Berlin, Germany", "2020-01-01"),
    ]);
    expect(places).toHaveLength(2);
    const milan = places.find((place) => place.slug === "milan, italy")!;
    expect(milan.photos.map((p) => p.id)).toEqual(["early", "late", "unknown"]);
    expect(groupPhotosByYear(milan.photos).map((group) => group.label)).toEqual([
      "2018",
      "2024",
      "Undated",
    ]);
  });

  it("keeps missing locations visible and distinct countries separate", () => {
    const places = groupPhotosByPlace([
      photo("a", null, null),
      photo("b", "  ", null),
      photo("c", "Paris, France", null),
      photo("d", "Paris, USA", null),
    ]);
    expect(places).toHaveLength(3);
    expect(places.find((p) => p.name === "Location not specified")?.photos).toHaveLength(
      2,
    );
  });

  it("uses the first photo with coordinates as the place's map position", () => {
    const places = groupPhotosByPlace([
      { ...photo("a", "Rome", null), gpsLat: null, gpsLng: null },
      { ...photo("b", "Rome", null), gpsLat: 41.9, gpsLng: 12.5 },
      { ...photo("c", "Rome", null), gpsLat: 41.8, gpsLng: 12.4 },
      photo("d", "Undated Place", null),
    ]);
    const rome = places.find((p) => p.name === "Rome")!;
    expect(rome.lat).toBe(41.9);
    expect(rome.lng).toBe(12.5);
    const undated = places.find((p) => p.name === "Undated Place")!;
    expect(undated.lat).toBeNull();
    expect(undated.lng).toBeNull();
  });

  it("does not reorder the input or use upload dates as capture dates", () => {
    const photos = [photo("b", "Rome", null), photo("a", "Rome", "2020-01-01")];
    groupPhotosByPlace(photos);
    expect(photos.map((p) => p.id)).toEqual(["b", "a"]);
    expect(groupPhotosByYear([photos[0]])[0].label).toBe("Undated");
  });
});
