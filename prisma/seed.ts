/**
 * Dev seed: generates placeholder photos (gradient JPEGs via sharp, no real
 * photography needed) with fabricated EXIF-like metadata, and composes them
 * into a handful of Album -> Chapter -> Placement structures so every layer
 * (grid, mosaic, lightbox, admin library) has something to render. See
 * AGENTS.md "Data model" for the shape this mirrors.
 */
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";

import { PrismaClient, type PlacementSize } from "@prisma/client";
import bcrypt from "bcryptjs";
import sharp from "sharp";

const prisma = new PrismaClient();

const STORAGE_DIR = process.env.STORAGE_DIR ?? "./storage";
const PHOTOS_DIR = path.join(STORAGE_DIR, "photos");

const FULL_W = 2000;
const MEDIUM_W = 1200;
const THUMB_W = 400;

type SeedPhotoSpec = {
  hue1: number;
  hue2: number;
  aspect: "landscape" | "portrait" | "square";
  camera?: { make: string; model: string; lens: string };
  aperture?: number;
  shutterSpeed?: string;
  iso?: number;
  focalLengthMm?: number;
  isAnalog?: boolean;
  filmStock?: string;
  locationName?: string;
  gps?: [number, number];
  altText: string;
  caption?: string;
  daysAgo: number;
};

const CAMERAS = [
  { make: "Fujifilm", model: "X100V", lens: "23mm f/2" },
  { make: "Fujifilm", model: "X-T4", lens: "XF 35mm f/1.4" },
  { make: "Canon", model: "EOS 5D Mark IV", lens: "EF 24-70mm f/2.8L" },
  { make: "Sony", model: "A7 III", lens: "FE 55mm f/1.8" },
];

function hsl(h: number, s: number, l: number) {
  return `hsl(${h} ${s}% ${l}%)`;
}

function dims(aspect: SeedPhotoSpec["aspect"], targetW: number) {
  if (aspect === "portrait") return { w: Math.round(targetW * 0.75), h: targetW };
  if (aspect === "square") return { w: targetW, h: targetW };
  return { w: targetW, h: Math.round(targetW * 0.6667) };
}

function gradientSvg(w: number, h: number, hue1: number, hue2: number) {
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${hsl(hue1, 12, 22)}" />
        <stop offset="100%" stop-color="${hsl(hue2, 8, 10)}" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)" />
    <rect width="100%" height="100%" fill="black" opacity="0.04" />
  </svg>`;
}

async function generatePhotoFiles(spec: SeedPhotoSpec) {
  const id = randomUUID();
  const dir = path.join(PHOTOS_DIR, id);
  await mkdir(dir, { recursive: true });

  const full = dims(spec.aspect, FULL_W);
  const svg = Buffer.from(gradientSvg(full.w, full.h, spec.hue1, spec.hue2));
  const base = sharp(svg);

  const originalPath = path.join(dir, "original.jpg");
  const fullPath = path.join(dir, "full.jpg");
  const mediumPath = path.join(dir, "medium.jpg");
  const thumbnailPath = path.join(dir, "thumbnail.jpg");

  await base.clone().jpeg({ quality: 92 }).toFile(originalPath);
  await base.clone().jpeg({ quality: 90 }).toFile(fullPath);
  await sharp(svg)
    .resize(dims(spec.aspect, MEDIUM_W).w)
    .jpeg({ quality: 85 })
    .toFile(mediumPath);
  await sharp(svg)
    .resize(dims(spec.aspect, THUMB_W).w)
    .jpeg({ quality: 80 })
    .toFile(thumbnailPath);

  const lqipBuffer = await sharp(svg).resize(16).blur().jpeg({ quality: 40 }).toBuffer();
  const blurDataUrl = `data:image/jpeg;base64,${lqipBuffer.toString("base64")}`;

  return {
    id,
    dir: path.join("photos", id),
    originalPath,
    fullPath,
    mediumPath,
    thumbnailPath,
    full,
    blurDataUrl,
  };
}

async function createSeedPhoto(spec: SeedPhotoSpec) {
  const files = await generatePhotoFiles(spec);
  const takenAt = new Date(Date.now() - spec.daysAgo * 24 * 60 * 60 * 1000);

  return prisma.photo.create({
    data: {
      id: files.id,
      filename: `${files.id}.jpg`,
      originalPath: files.originalPath,
      thumbnailPath: files.thumbnailPath,
      mediumPath: files.mediumPath,
      fullPath: files.fullPath,
      width: files.full.w,
      height: files.full.h,
      blurDataUrl: files.blurDataUrl,
      altText: spec.altText,
      caption: spec.caption,
      cameraMake: spec.camera?.make,
      cameraModel: spec.camera?.model,
      lens: spec.camera?.lens,
      aperture: spec.aperture,
      shutterSpeed: spec.shutterSpeed,
      iso: spec.iso,
      focalLengthMm: spec.focalLengthMm,
      isAnalog: spec.isAnalog ?? false,
      filmStock: spec.filmStock,
      locationName: spec.locationName,
      gpsLat: spec.gps?.[0],
      gpsLng: spec.gps?.[1],
      takenAt,
    },
  });
}

function camera(i: number) {
  return CAMERAS[i % CAMERAS.length];
}

async function main() {
  await mkdir(PHOTOS_DIR, { recursive: true });

  // --- Admin -----------------------------------------------------------
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "change-me-now";
  const adminName = process.env.ADMIN_NAME ?? "Admin";
  const passwordHash = await bcrypt.hash(adminPassword, 12);
  await prisma.admin.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, passwordHash, name: adminName },
  });
  console.log(`Seeded admin: ${adminEmail}`);

  // --- Tags --------------------------------------------------------------
  const tagDefs = [
    { name: "Street", slug: "street" },
    { name: "Architecture", slug: "architecture" },
    { name: "Night", slug: "night" },
    { name: "Travel", slug: "travel" },
  ];
  const tags = await Promise.all(
    tagDefs.map((t) =>
      prisma.tag.upsert({ where: { slug: t.slug }, update: {}, create: t }),
    ),
  );
  const tagByslug = Object.fromEntries(tags.map((t) => [t.slug, t]));

  const placementSizes: PlacementSize[] = [
    "FULL",
    "MEDIUM",
    "MEDIUM",
    "SMALL",
    "SMALL",
    "LARGE",
  ];

  // --- Album: Milan --------------------------------------------------
  const milan = await prisma.album.create({
    data: {
      slug: "milan",
      title: "Milan",
      subtitle: "Duomo, galleria, and quiet mornings",
      locationName: "Milan, Italy",
      countryCode: "IT",
      status: "PUBLISHED",
      order: 0,
      chapters: {
        create: [
          { label: "2018", order: 0 },
          { label: "Night", order: 1 },
        ],
      },
    },
    include: { chapters: true },
  });

  const milanDayPhotos = await Promise.all(
    [
      {
        altText: "Commuters walking past the Duomo at dawn",
        aspect: "landscape" as const,
        hue1: 25,
        hue2: 210,
        daysAgo: 2700,
      },
      {
        altText: "Arcade of the Galleria Vittorio Emanuele II",
        aspect: "portrait" as const,
        hue1: 30,
        hue2: 20,
        daysAgo: 2699,
      },
      {
        altText: "A streetlamp against a concrete facade",
        aspect: "landscape" as const,
        hue1: 200,
        hue2: 40,
        daysAgo: 2698,
      },
      {
        altText: "Rooftop silhouettes near the cathedral spires",
        aspect: "square" as const,
        hue1: 15,
        hue2: 220,
        daysAgo: 2697,
      },
    ].map((s, i) =>
      createSeedPhoto({
        ...s,
        camera: camera(i),
        aperture: [2.8, 4, 5.6, 8][i % 4],
        shutterSpeed: ["1/250", "1/125", "1/500", "1/60"][i % 4],
        iso: [200, 400, 100, 800][i % 4],
        focalLengthMm: [23, 35, 50, 24][i % 4],
        locationName: "Milan, Italy",
        gps: [45.4642, 9.19],
      }),
    ),
  );

  const milanNightPhotos = await Promise.all(
    [
      {
        altText: "A crescent moon over industrial chimneys",
        aspect: "landscape" as const,
        hue1: 230,
        hue2: 15,
        daysAgo: 900,
      },
      {
        altText: "Overhead train wires at dusk",
        aspect: "landscape" as const,
        hue1: 250,
        hue2: 20,
        daysAgo: 899,
      },
      {
        altText: "A billboard glowing against the sunset",
        aspect: "portrait" as const,
        hue1: 15,
        hue2: 260,
        daysAgo: 898,
      },
      {
        altText: "A commuter train streaking past a lit platform",
        aspect: "landscape" as const,
        hue1: 40,
        hue2: 230,
        daysAgo: 897,
      },
    ].map((s, i) =>
      createSeedPhoto({
        ...s,
        camera: camera(i + 1),
        aperture: [1.8, 2, 2.8, 4][i % 4],
        shutterSpeed: ["1/30", "1/15", "1/60", "1/8"][i % 4],
        iso: [1600, 3200, 800, 6400][i % 4],
        focalLengthMm: [35, 50, 23, 35][i % 4],
        locationName: "Milan, Italy",
      }),
    ),
  );

  await prisma.placement.createMany({
    data: milanDayPhotos.map((p, i) => ({
      chapterId: milan.chapters[0].id,
      photoId: p.id,
      order: i,
      size: placementSizes[i % placementSizes.length],
    })),
  });
  await prisma.placement.createMany({
    data: milanNightPhotos.map((p, i) => ({
      chapterId: milan.chapters[1].id,
      photoId: p.id,
      order: i,
      size: placementSizes[(i + 2) % placementSizes.length],
    })),
  });
  await prisma.album.update({
    where: { id: milan.id },
    data: { coverPhotoId: milanDayPhotos[0].id },
  });
  await prisma.photo.update({
    where: { id: milanDayPhotos[0].id },
    data: {
      tags: { connect: [{ id: tagByslug.architecture.id }, { id: tagByslug.travel.id }] },
    },
  });
  await prisma.photo.update({
    where: { id: milanNightPhotos[0].id },
    data: { tags: { connect: [{ id: tagByslug.night.id }] } },
  });

  // --- Album: Berlin ---------------------------------------------------
  const berlin = await prisma.album.create({
    data: {
      slug: "berlin",
      title: "Berlin",
      subtitle: "Rain, bicycles, and grey light",
      locationName: "Berlin, Germany",
      countryCode: "DE",
      status: "PUBLISHED",
      order: 1,
      chapters: {
        create: [
          { label: "2019", order: 0 },
          { label: "Streets", order: 1 },
        ],
      },
    },
    include: { chapters: true },
  });

  const berlin2019 = await Promise.all(
    [
      {
        altText: "A cyclist crossing an empty street in the rain",
        aspect: "landscape" as const,
        hue1: 210,
        hue2: 200,
        daysAgo: 2200,
      },
      {
        altText: "Bare trees lining a wet avenue",
        aspect: "portrait" as const,
        hue1: 190,
        hue2: 30,
        daysAgo: 2199,
      },
      {
        altText: "A tram passing under overcast skies",
        aspect: "landscape" as const,
        hue1: 205,
        hue2: 190,
        daysAgo: 2198,
      },
    ].map((s, i) =>
      createSeedPhoto({
        ...s,
        camera: camera(i),
        aperture: [4, 5.6, 8][i % 3],
        shutterSpeed: ["1/500", "1/250", "1/1000"][i % 3],
        iso: [200, 100, 400][i % 3],
        focalLengthMm: [35, 50, 24][i % 3],
        locationName: "Berlin, Germany",
      }),
    ),
  );
  const berlinStreets = await Promise.all(
    [
      {
        altText: "A hand-held film shot of a passerby blowing bubbles",
        aspect: "portrait" as const,
        hue1: 20,
        hue2: 200,
        daysAgo: 2100,
        isAnalog: true,
        filmStock: "Kodak Portra 400",
        camera: { make: "Leica", model: "M6", lens: "35mm f/2" },
      },
      {
        altText: "A quiet residential canal at the edge of town",
        aspect: "landscape" as const,
        hue1: 100,
        hue2: 40,
        daysAgo: 2099,
      },
    ].map((s, i) =>
      createSeedPhoto(
        s.isAnalog
          ? s
          : {
              ...s,
              camera: camera(i + 2),
              aperture: 5.6,
              shutterSpeed: "1/250",
              iso: 200,
              focalLengthMm: 35,
            },
      ),
    ),
  );

  await prisma.placement.createMany({
    data: berlin2019.map((p, i) => ({
      chapterId: berlin.chapters[0].id,
      photoId: p.id,
      order: i,
      size: placementSizes[i % placementSizes.length],
    })),
  });
  await prisma.placement.createMany({
    data: berlinStreets.map((p, i) => ({
      chapterId: berlin.chapters[1].id,
      photoId: p.id,
      order: i,
      size: i === 0 ? "FULL" : "MEDIUM",
    })),
  });
  await prisma.album.update({
    where: { id: berlin.id },
    data: { coverPhotoId: berlin2019[0].id },
  });
  await prisma.photo.update({
    where: { id: berlinStreets[0].id },
    data: { tags: { connect: [{ id: tagByslug.street.id }] } },
  });

  // --- Album: Dresden (draft) -------------------------------------------
  const dresden = await prisma.album.create({
    data: {
      slug: "dresden",
      title: "Dresden",
      locationName: "Dresden, Germany",
      countryCode: "DE",
      status: "DRAFT",
      order: 2,
      chapters: { create: [{ label: "2020", order: 0 }] },
    },
    include: { chapters: true },
  });
  const dresdenPhotos = await Promise.all(
    [
      {
        altText: "A boat resting on a riverbank at low water",
        aspect: "landscape" as const,
        hue1: 90,
        hue2: 60,
        daysAgo: 1800,
      },
      {
        altText: "A narrow alley between old townhouses",
        aspect: "portrait" as const,
        hue1: 30,
        hue2: 10,
        daysAgo: 1799,
      },
    ].map((s, i) =>
      createSeedPhoto({
        ...s,
        camera: camera(i),
        aperture: 5.6,
        shutterSpeed: "1/125",
        iso: 200,
        focalLengthMm: 35,
      }),
    ),
  );
  await prisma.placement.createMany({
    data: dresdenPhotos.map((p, i) => ({
      chapterId: dresden.chapters[0].id,
      photoId: p.id,
      order: i,
      size: i === 0 ? "LARGE" : "MEDIUM",
    })),
  });
  await prisma.album.update({
    where: { id: dresden.id },
    data: { coverPhotoId: dresdenPhotos[0].id },
  });

  console.log(
    "Seed complete: 3 albums, 5 chapters, " +
      (milanDayPhotos.length +
        milanNightPhotos.length +
        berlin2019.length +
        berlinStreets.length +
        dresdenPhotos.length) +
      " photos.",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
