import { describe, expect, it, vi } from "vitest";

const parse = vi.fn();
vi.mock("exifr", () => ({
  default: { parse },
}));

const { extractExif } = await import("./extract");

describe("extractExif", () => {
  it("maps a full EXIF payload to our field shape", async () => {
    parse.mockResolvedValue({
      Make: "Fujifilm",
      Model: "X100V",
      LensModel: "23mm f/2",
      FocalLength: 23,
      FNumber: 2.8,
      ISO: 400,
      ExposureTime: 1 / 250,
      DateTimeOriginal: new Date("2020-06-15T10:30:00Z"),
      latitude: 45.4642,
      longitude: 9.19,
    });

    await expect(extractExif(Buffer.from("fake"))).resolves.toEqual({
      cameraMake: "Fujifilm",
      cameraModel: "X100V",
      lens: "23mm f/2",
      focalLengthMm: 23,
      aperture: 2.8,
      iso: 400,
      shutterSpeed: "1/250",
      takenAt: new Date("2020-06-15T10:30:00Z"),
      gpsLat: 45.4642,
      gpsLng: 9.19,
    });
  });

  it("formats exposures of a second or more as e.g. '2s'", async () => {
    parse.mockResolvedValue({ ExposureTime: 2 });
    await expect(extractExif(Buffer.from("fake"))).resolves.toEqual({
      shutterSpeed: "2s",
    });
  });

  it("returns an empty object when there is no EXIF (e.g. a scanned negative)", async () => {
    parse.mockResolvedValue(null);
    await expect(extractExif(Buffer.from("fake"))).resolves.toEqual({});
  });

  it("returns an empty object instead of throwing on a non-image buffer", async () => {
    parse.mockRejectedValue(new Error("not a valid image"));
    await expect(extractExif(Buffer.from("not an image"))).resolves.toEqual({});
  });

  it("ignores fields with unexpected types rather than passing them through", async () => {
    parse.mockResolvedValue({
      Make: 12345,
      FNumber: "wide open",
      DateTimeOriginal: "not-a-date",
    });
    await expect(extractExif(Buffer.from("fake"))).resolves.toEqual({});
  });
});
