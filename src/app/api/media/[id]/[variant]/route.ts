import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

const VARIANT_FIELDS = {
  thumbnail: "thumbnailPath",
  medium: "mediumPath",
  full: "fullPath",
} as const;

type Variant = keyof typeof VARIANT_FIELDS;

function isVariant(value: string): value is Variant {
  return value in VARIANT_FIELDS;
}

function contentTypeFor(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".tiff" || ext === ".tif") return "image/tiff";
  return "image/jpeg";
}

type RouteContext = { params: Promise<{ id: string; variant: string }> };

/**
 * Serves generated photo variants from the local storage volume (outside
 * public/, so Next.js can't serve them as static files). Deliberately
 * public/unauthenticated — published photos must be viewable on the site;
 * see src/proxy.ts for the matching auth-bypass.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const { id, variant } = await params;
  if (!isVariant(variant)) {
    return NextResponse.json({ error: "Unknown variant" }, { status: 404 });
  }

  const photo = await prisma.photo.findUnique({ where: { id } });
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const filePath = photo[VARIANT_FIELDS[variant]];
  if (!filePath)
    return NextResponse.json({ error: "Variant not generated" }, { status: 404 });

  try {
    await stat(filePath);
    const data = await readFile(filePath);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": contentTypeFor(filePath),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "File missing on disk" }, { status: 404 });
  }
}
