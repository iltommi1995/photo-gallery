import Image from "next/image";
import { Anton } from "next/font/google";

import { prisma } from "@/lib/db";
import { getSiteSettings } from "@/lib/settings";

const heroFont = Anton({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const revalidate = 3600;

export default async function HomePage() {
  const settings = await getSiteSettings();
  // Keep the admin-managed title; give its Photography suffix its own line.
  const titleParts = settings.siteTitle.trim().match(/^(.*?)\s+(photography)$/i);
  const heroPhoto = settings.heroPhotoId
    ? await prisma.photo.findUnique({
        where: { id: settings.heroPhotoId },
        select: { id: true, altText: true, blurDataUrl: true },
      })
    : null;

  return (
    <main
      data-home-hero
      className="bg-portfolio-ink relative h-dvh w-full overflow-hidden"
    >
      {heroPhoto && (
        <Image
          src={`/api/media/${heroPhoto.id}/full`}
          alt={heroPhoto.altText ?? ""}
          fill
          placeholder={heroPhoto.blurDataUrl ? "blur" : undefined}
          blurDataURL={heroPhoto.blurDataUrl ?? undefined}
          sizes="100vw"
          priority
          className="object-cover grayscale"
        />
      )}
      <div className="from-portfolio-overlay absolute inset-0 bg-gradient-to-t to-transparent" />
      <h1
        className={`${heroFont.className} text-portfolio-accent absolute right-6 bottom-12 left-6 text-right font-normal uppercase sm:right-16 sm:bottom-16 sm:left-16 gallery-short:bottom-4`}
      >
        {titleParts ? (
          <>
            <span className="block text-[clamp(0.875rem,4.25vw,6.375rem)] leading-[1.05] tracking-[-0.025em] gallery-short:text-[clamp(0.875rem,4.5vh,1.75rem)]">
              {titleParts[1]}
            </span>{" "}
            <span className="mt-1 block text-[clamp(2.125rem,9.35vw,13.6rem)] leading-[0.9] tracking-[-0.025em] sm:mt-3 gallery-short:mt-0 gallery-short:text-[clamp(1.75rem,10vh,4.5rem)]">
              {titleParts[2]}
            </span>
          </>
        ) : (
          <span className="block text-[clamp(2.5rem,7vw,10rem)] leading-none tracking-[-0.035em] [overflow-wrap:anywhere] gallery-short:text-[clamp(1.75rem,10vh,4.5rem)]">
            {settings.siteTitle}
          </span>
        )}
      </h1>
    </main>
  );
}
