import { describe, expect, it } from "vitest";

import { formatExifLines, type DisplayableExif } from "./format";

const base: DisplayableExif = {
  cameraMake: null,
  cameraModel: null,
  lens: null,
  focalLengthMm: null,
  aperture: null,
  shutterSpeed: null,
  iso: null,
  takenAt: null,
  locationName: null,
  isAnalog: false,
  filmStock: null,
};

describe("formatExifLines", () => {
  it("returns an empty list when nothing is set", () => {
    expect(formatExifLines(base)).toEqual([]);
  });

  it("combines camera make and model", () => {
    const lines = formatExifLines({
      ...base,
      cameraMake: "Fujifilm",
      cameraModel: "X100V",
    });
    expect(lines).toContainEqual({ label: "Camera", value: "Fujifilm X100V" });
  });

  it("joins exposure fields with a separator, omitting missing ones", () => {
    const lines = formatExifLines({
      ...base,
      focalLengthMm: 23,
      aperture: 2.8,
      shutterSpeed: "1/250",
      iso: 400,
    });
    expect(lines).toContainEqual({
      label: "Exposure",
      value: "23mm · f/2.8 · 1/250 · ISO 400",
    });
  });

  it("shows film stock instead of exposure fields for analog photos", () => {
    const lines = formatExifLines({
      ...base,
      isAnalog: true,
      filmStock: "Kodak Portra 400",
      cameraMake: "Leica",
      cameraModel: "M6",
    });
    expect(lines).toContainEqual({ label: "Film", value: "Kodak Portra 400" });
    expect(lines.find((l) => l.label === "Exposure")).toBeUndefined();
  });

  it("formats the date as a readable string", () => {
    const lines = formatExifLines({ ...base, takenAt: new Date("2020-06-15T12:00:00Z") });
    expect(lines).toContainEqual({ label: "Date", value: "June 15, 2020" });
  });
});
