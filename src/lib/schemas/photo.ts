import { z } from "zod";

const optionalTrimmedString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === "" ? undefined : v));

/** Empty-string form inputs must become `undefined`, not reach z.coerce:
 * z.coerce.number() on "" reads as `Number("") === 0`, which then fails a
 * `.positive()` check even though the field is optional — same problem
 * with z.coerce.date() on "" (produces an Invalid Date). Wrap every
 * optional coerced field in this so leaving it blank actually means
 * "no value" instead of silently blocking the whole form. */
const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

/**
 * Metadata form — used both to finalize a freshly uploaded photo and to
 * hand-edit an existing one (notably every `isAnalog` photo, which has no
 * EXIF to draw from). altText is required here even though it's nullable
 * in the DB: a photo can exist unpublished/unplaced without one, but this
 * is the form that's supposed to fill it in.
 */
export const photoMetadataSchema = z.object({
  altText: z.string().trim().min(1, "Alt text is required").max(300),
  caption: optionalTrimmedString(500),
  cameraMake: optionalTrimmedString(100),
  cameraModel: optionalTrimmedString(100),
  lens: optionalTrimmedString(150),
  focalLengthMm: z.preprocess(
    emptyToUndefined,
    z.coerce.number().positive().max(2000).optional(),
  ),
  aperture: z.preprocess(
    emptyToUndefined,
    z.coerce.number().positive().max(64).optional(),
  ),
  shutterSpeed: optionalTrimmedString(20),
  iso: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().positive().max(1_000_000).optional(),
  ),
  takenAt: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  locationName: optionalTrimmedString(200),
  gpsLat: z.preprocess(emptyToUndefined, z.coerce.number().min(-90).max(90).optional()),
  gpsLng: z.preprocess(emptyToUndefined, z.coerce.number().min(-180).max(180).optional()),
  isAnalog: z.coerce.boolean().default(false),
  filmStock: optionalTrimmedString(100),
  tagIds: z.array(z.string()).optional(),
});

/** Raw field values as the form/DOM hold them (e.g. numbers-as-strings,
 * a "YYYY-MM-DD" date string) — before zod's coercion runs. */
export type PhotoMetadataFormInput = z.input<typeof photoMetadataSchema>;
/** Parsed/coerced shape produced after validation — what gets sent to the API. */
export type PhotoMetadataOutput = z.output<typeof photoMetadataSchema>;

const MAX_UPLOAD_BYTES = 40 * 1024 * 1024; // 40MB — generous for camera JPEGs/scans
const ACCEPTED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/tiff": "tiff",
};

export function validateUploadFile(
  file: File,
): { ok: true; ext: string } | { ok: false; error: string } {
  if (file.size === 0) return { ok: false, error: "Empty file" };
  if (file.size > MAX_UPLOAD_BYTES)
    return { ok: false, error: "File exceeds 40MB limit" };
  const ext = ACCEPTED_MIME_TYPES[file.type];
  if (!ext)
    return { ok: false, error: `Unsupported file type: ${file.type || "unknown"}` };
  return { ok: true, ext };
}
