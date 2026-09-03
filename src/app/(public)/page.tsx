import Image from "next/image";

import { prisma } from "@/lib/db";
import { getSiteSettings } from "@/lib/settings";

export const revalidate = 3600;

export default async function HomePage() {
  const settings = await getSiteSettings();
  const heroPhoto = settings.heroPhotoId
    ? await prisma.photo.findUnique({
        where: { id: settings.heroPhotoId },
        select: { id: true, altText: true, blurDataUrl: true },
      })
    : null;

  return (
    <main className="bg-portfolio-ink relative h-screen w-full">
      {heroPhoto && (
        <Image
          src={`/api/media/${heroPhoto.id}/full`}
          alt={heroPhoto.altText ?? ""}
          fill
          placeholder={heroPhoto.blurDataUrl ? "blur" : undefined}
          blurDataURL={heroPhoto.blurDataUrl ?? undefined}
          sizes="100vw"
          priority
          className="object-cover"
        />
      )}
      <div className="from-portfolio-overlay absolute inset-0 bg-gradient-to-t to-transparent" />
      <h1 className="font-portfolio-heading text-portfolio-paper absolute right-6 bottom-12 text-right text-4xl leading-none font-bold tracking-tight uppercase sm:right-16 sm:bottom-16 sm:text-7xl">
        {settings.siteTitle}
      </h1>
    </main>
  );
}
