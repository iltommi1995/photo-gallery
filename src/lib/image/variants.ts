import { mkdir } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const SIZES = {
  thumbnail: 480,
  medium: 1600,
  full: 2400,
} as const;

const LQIP_WIDTH = 16;

export type ImageVariantPaths = {
  thumbnail: string;
  medium: string;
  full: string;
};

export type GeneratedVariants = {
  width: number;
  height: number;
  blurDataUrl: string;
};

/**
 * Generates the thumbnail/medium/full JPEG variants and an LQIP blur
 * placeholder from a source image buffer, writing them to the given paths.
 * Variants are always re-encoded JPEG (deliberately stripped of EXIF —
 * variants are for display, `originalPath` is the metadata source of
 * truth). Modern formats (AVIF/WebP) are negotiated at request time by
 * next/image rather than pre-generated here.
 */
export async function generateImageVariants(
  source: Buffer,
  paths: ImageVariantPaths,
): Promise<GeneratedVariants> {
  const image = sharp(source, { failOn: "none" }).rotate(); // auto-orient from EXIF
  const metadata = await image.metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  await mkdir(path.dirname(paths.thumbnail), { recursive: true });

  await Promise.all(
    (Object.entries(SIZES) as [keyof typeof SIZES, number][]).map(([key, targetWidth]) =>
      image
        .clone()
        .resize({ width: targetWidth, withoutEnlargement: true })
        .jpeg({ quality: key === "thumbnail" ? 78 : 86 })
        .toFile(paths[key]),
    ),
  );

  const lqipBuffer = await image
    .clone()
    .resize({ width: LQIP_WIDTH })
    .blur()
    .jpeg({ quality: 40 })
    .toBuffer();
  const blurDataUrl = `data:image/jpeg;base64,${lqipBuffer.toString("base64")}`;

  return { width, height, blurDataUrl };
}
