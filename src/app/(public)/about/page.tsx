import type { Metadata } from "next";
import Image from "next/image";

import { prisma } from "@/lib/db";
import { getSiteSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "About Me",
};

export const revalidate = 3600;

export default async function AboutPage() {
  const settings = await getSiteSettings();
  const photo = settings.aboutPhotoId
    ? await prisma.photo.findUnique({
        where: { id: settings.aboutPhotoId },
        select: { id: true, altText: true, blurDataUrl: true },
      })
    : null;

  return (
    <main className="p-portfolio-gutter mx-auto flex max-w-4xl flex-col gap-8 pt-24 sm:pt-28 md:flex-row md:items-start">
      {photo && (
        <div className="bg-muted relative aspect-[3/4] w-full shrink-0 overflow-hidden md:w-72">
          <Image
            src={`/api/media/${photo.id}/medium`}
            alt={photo.altText ?? ""}
            fill
            placeholder={photo.blurDataUrl ? "blur" : undefined}
            blurDataURL={photo.blurDataUrl ?? undefined}
            sizes="(min-width: 768px) 288px, 100vw"
            className="object-cover"
          />
        </div>
      )}
      <div>
        <h1 className="font-portfolio-heading text-portfolio-accent mb-4 text-3xl font-bold tracking-tight uppercase">
          {settings.aboutTitle || "About"}
        </h1>
        {settings.aboutBody && (
          <p className="whitespace-pre-line leading-relaxed">{settings.aboutBody}</p>
        )}
      </div>
    </main>
  );
}
