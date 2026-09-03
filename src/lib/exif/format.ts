import { format } from "date-fns";

export type DisplayableExif = {
  cameraMake: string | null;
  cameraModel: string | null;
  lens: string | null;
  focalLengthMm: number | null;
  aperture: number | null;
  shutterSpeed: string | null;
  iso: number | null;
  takenAt: Date | null;
  locationName: string | null;
  isAnalog: boolean;
  filmStock: string | null;
};

export type ExifLine = { label: string; value: string };

/** Builds the ordered list of EXIF lines worth showing — skips anything null. */
export function formatExifLines(photo: DisplayableExif): ExifLine[] {
  const lines: ExifLine[] = [];

  const camera = [photo.cameraMake, photo.cameraModel].filter(Boolean).join(" ");
  if (camera) lines.push({ label: "Camera", value: camera });
  if (photo.isAnalog && photo.filmStock)
    lines.push({ label: "Film", value: photo.filmStock });
  if (photo.lens) lines.push({ label: "Lens", value: photo.lens });

  const exposureParts = [
    photo.focalLengthMm ? `${photo.focalLengthMm}mm` : null,
    photo.aperture ? `f/${photo.aperture}` : null,
    photo.shutterSpeed,
    photo.iso ? `ISO ${photo.iso}` : null,
  ].filter(Boolean);
  if (exposureParts.length > 0)
    lines.push({ label: "Exposure", value: exposureParts.join(" · ") });

  if (photo.takenAt)
    lines.push({ label: "Date", value: format(photo.takenAt, "MMMM d, yyyy") });
  if (photo.locationName) lines.push({ label: "Location", value: photo.locationName });

  return lines;
}
