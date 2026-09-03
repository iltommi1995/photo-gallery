import exifr from "exifr";

export type ExtractedExif = {
  cameraMake?: string;
  cameraModel?: string;
  lens?: string;
  focalLengthMm?: number;
  aperture?: number;
  shutterSpeed?: string;
  iso?: number;
  takenAt?: Date;
  gpsLat?: number;
  gpsLng?: number;
};

function formatShutterSpeed(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  if (seconds >= 1) return `${Number(seconds.toFixed(1))}s`;
  const denominator = Math.round(1 / seconds);
  return `1/${denominator}`;
}

/**
 * Extracts the EXIF fields we care about from an image buffer. Returns an
 * empty object (never throws) when the file has no EXIF — e.g. scanned
 * analog negatives, which get their metadata filled in by hand instead.
 */
export async function extractExif(buffer: Buffer): Promise<ExtractedExif> {
  let raw: Record<string, unknown> | null = null;
  try {
    raw = await exifr.parse(buffer, {
      tiff: true,
      exif: true,
      gps: true,
      translateValues: true,
      reviveValues: true,
    });
  } catch {
    return {};
  }
  if (!raw) return {};

  const result: ExtractedExif = {};

  if (typeof raw.Make === "string") result.cameraMake = raw.Make.trim();
  if (typeof raw.Model === "string") result.cameraModel = raw.Model.trim();

  const lens = raw.LensModel ?? raw.LensMake;
  if (typeof lens === "string" && lens.trim()) result.lens = lens.trim();

  if (typeof raw.FocalLength === "number") result.focalLengthMm = raw.FocalLength;
  if (typeof raw.FNumber === "number") result.aperture = raw.FNumber;
  if (typeof raw.ISO === "number") result.iso = raw.ISO;

  if (typeof raw.ExposureTime === "number") {
    const formatted = formatShutterSpeed(raw.ExposureTime);
    if (formatted) result.shutterSpeed = formatted;
  }

  const takenAt = raw.DateTimeOriginal ?? raw.CreateDate;
  if (takenAt instanceof Date && !Number.isNaN(takenAt.getTime())) {
    result.takenAt = takenAt;
  }

  if (typeof raw.latitude === "number") result.gpsLat = raw.latitude;
  if (typeof raw.longitude === "number") result.gpsLng = raw.longitude;

  return result;
}
