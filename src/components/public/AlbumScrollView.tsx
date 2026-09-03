"use client";

import { useMemo, useState } from "react";

import { AccentLabel } from "@/components/public/AccentLabel";
import { ChapterMosaic, type MosaicPlacement } from "@/components/gallery/ChapterMosaic";
import { Lightbox, type LightboxPhoto } from "@/components/public/Lightbox";
import { HorizontalScrollProgress } from "@/components/public/HorizontalScrollProgress";
import { AlbumHero } from "@/components/public/AlbumHero";
import { useHorizontalScroll } from "@/lib/scroll/useHorizontalScroll";

export type ScrollChapter = {
  id: string;
  label: string;
  placements: (MosaicPlacement & { photo: LightboxPhoto })[];
};

type AlbumScrollViewProps = {
  title: string;
  coverPhoto: { id: string; altText: string | null; blurDataUrl: string | null } | null;
  chapters: ScrollChapter[];
};

export function AlbumScrollView({ title, coverPhoto, chapters }: AlbumScrollViewProps) {
  const { containerRef, progress } = useHorizontalScroll();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const flatPhotos = useMemo(
    () => chapters.flatMap((chapter) => chapter.placements.map((p) => p.photo)),
    [chapters],
  );

  function openLightboxFor(placement: MosaicPlacement) {
    const flatIndex = flatPhotos.findIndex((p) => p.id === placement.photo.id);
    if (flatIndex !== -1) setLightboxIndex(flatIndex);
  }

  return (
    <>
      <HorizontalScrollProgress progress={progress} />
      <div
        ref={containerRef}
        tabIndex={0}
        className="focus:outline-none md:flex md:h-screen md:snap-x md:snap-mandatory md:overflow-x-auto md:overflow-y-hidden"
      >
        <AlbumHero title={title} coverPhoto={coverPhoto} />
        {chapters.map((chapter) => (
          <section
            key={chapter.id}
            data-scroll-section
            className="w-full shrink-0 px-6 py-12 md:h-full md:w-screen md:snap-start md:overflow-y-auto md:px-16 md:py-16"
          >
            <AccentLabel as="h2" className="mb-6 block text-2xl">
              {chapter.label}
            </AccentLabel>
            <ChapterMosaic
              placements={chapter.placements}
              onItemClick={openLightboxFor}
            />
          </section>
        ))}
      </div>

      <Lightbox
        photos={flatPhotos}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={setLightboxIndex}
      />
    </>
  );
}
