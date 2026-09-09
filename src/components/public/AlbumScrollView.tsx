"use client";

import { useMemo, useState } from "react";

import { AccentLabel } from "@/components/public/AccentLabel";
import { cn } from "@/lib/utils";
import { ChapterMosaic, type MosaicPlacement } from "@/components/gallery/ChapterMosaic";
import { Lightbox, type LightboxPhoto } from "@/components/public/Lightbox";
import { HorizontalScrollProgress } from "@/components/public/HorizontalScrollProgress";
import { AlbumHero } from "@/components/public/AlbumHero";
import { useHorizontalScroll } from "@/lib/scroll/useHorizontalScroll";
import { useDeviceContext } from "@/lib/scroll/breakpoints";

export type ScrollChapter = {
  id: string;
  label: string;
  placements: (
    | (Extract<MosaicPlacement, { type: "PHOTO" }> & { photo: LightboxPhoto })
    | Extract<MosaicPlacement, { type: "TEXT" }>
  )[];
  /** See ChapterMosaic's own minRowCount — reserves a full page's height
   * even when this chapter has fewer placements than a full page. */
  minRowCount?: number;
};

type AlbumScrollViewProps = {
  title: string;
  coverPhoto: { id: string; altText: string | null; blurDataUrl: string | null } | null;
  /** Web's chapters — always present, and the fallback whenever a mobile
   * context has none of its own. */
  webChapters: ScrollChapter[];
  /** Optional, fully independent chapter structure for a rotated phone —
   * own chapter count/split/photos, not just a resized copy of Web's. Empty
   * means no override: Web's chapters render instead, still as a real grid
   * (this context sits inside the `gallery-wide` CSS breakpoint regardless
   * of which chapters are fed in). */
  mobileLandscapeChapters: ScrollChapter[];
  /** Optional, fully independent chapter structure for portrait. Empty
   * means no override: Web's chapters render instead, through
   * ChapterMosaic's ordinary flatten (one full-width row per photo, not
   * Web's spans/positions — those don't translate to a narrow screen). See
   * `forceGrid` below and docs/ai/add-album-layout-variant.md. */
  mobilePortraitChapters: ScrollChapter[];
  /** Admin-configurable, per album (Album.showChapterLabels / .chapterLayout).
   * Defaults match the pre-existing behavior for callers that don't pass them
   * (e.g. the auto-built /places pages, which have no Album row to read from). */
  showChapterLabels?: boolean;
  chapterLayout?: "PAGED" | "CONTINUOUS";
};

export function AlbumScrollView({
  title,
  coverPhoto,
  webChapters,
  mobileLandscapeChapters,
  mobilePortraitChapters,
  showChapterLabels = true,
  chapterLayout = "PAGED",
}: AlbumScrollViewProps) {
  const { containerRef, progressBarRef, progressFillRef } = useHorizontalScroll();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const deviceContext = useDeviceContext();

  // Which chapter structure is actually on screen right now, and whether
  // it needs ChapterMosaic's forceGrid — both decided once per album, not
  // per chapter, since a viewport either has its own full chapter
  // structure or it doesn't. Desktop and mobile-landscape both fall inside
  // the `gallery-wide` CSS breakpoint, which renders a real positioned
  // grid automatically regardless of which chapters are fed in — only a
  // curated Mobile-portrait override needs forceGrid explicitly, since
  // portrait's fallback (Web's chapters) is the ordinary flatten.
  const { chapters: activeChapters, forceGrid } = (() => {
    if (deviceContext === "mobile-landscape" && mobileLandscapeChapters.length > 0)
      return { chapters: mobileLandscapeChapters, forceGrid: false };
    if (deviceContext === "mobile-portrait" && mobilePortraitChapters.length > 0)
      return { chapters: mobilePortraitChapters, forceGrid: true };
    return { chapters: webChapters, forceGrid: false };
  })();

  // Recomputes if a phone crosses a breakpoint mid-session (rotation) —
  // keeps the Lightbox's prev/next walking through exactly what's rendered.
  const flatPhotos = useMemo(
    () =>
      activeChapters.flatMap((chapter) =>
        chapter.placements.flatMap((p) => (p.type === "PHOTO" ? [p.photo] : [])),
      ),
    [activeChapters],
  );

  function openLightboxFor(placement: Extract<MosaicPlacement, { type: "PHOTO" }>) {
    const flatIndex = flatPhotos.findIndex((p) => p.id === placement.photo.id);
    if (flatIndex !== -1) setLightboxIndex(flatIndex);
  }

  return (
    <>
      <HorizontalScrollProgress
        progressBarRef={progressBarRef}
        progressFillRef={progressFillRef}
      />
      <div
        ref={containerRef}
        tabIndex={0}
        data-testid="album-scroll-track"
        data-gallery-view
        // overflow-anchor: none — without it, Chromium's scroll anchoring
        // "corrects" scrollLeft as chapter images load asynchronously and
        // shift layout, landing the page on the wrong section on load.
        style={{ overflowAnchor: "none" }}
        className="overflow-x-clip focus:outline-none gallery-wide:flex gallery-wide:h-dvh gallery-wide:overflow-x-auto gallery-wide:overflow-y-hidden"
      >
        <AlbumHero title={title} coverPhoto={coverPhoto} />
        {activeChapters.map((chapter, index) => (
          <section
            key={chapter.id}
            data-scroll-section
            className={cn(
              // Mobile is one flat, continuous list, full width — chapter
              // boundaries aren't a visible thing there, just more items
              // in the same feed. py-2 (8px top + 8px bottom at each seam
              // = 16px) matches ChapterMosaic's own inter-photo gap-4
              // exactly, so a chapter transition looks like just another
              // gap in the feed instead of a "page" some chapters get and
              // others don't. flex-col + the mosaic's own fitHeight
              // (gallery-wide:h-full, rows sized to fill it) instead of an
              // overflow-y-auto: a chapter's content must always fit
              // within its desktop "page", padding included, with no
              // vertical scrolling — not even a chapter with many rows.
              // gallery-short (a rotated phone, not a real desktop window)
              // has far less absolute height to give away: py-16 there
              // would eat a third of the viewport before any photo renders,
              // starving the mosaic of the height it needs to keep photos
              // from looking squashed — see ChapterMosaic's fitHeight rows.
              "w-full shrink-0 px-4 py-2 gallery-wide:flex gallery-wide:h-full gallery-wide:w-full gallery-wide:flex-col gallery-wide:py-16 gallery-short:py-2",
              // Left/right framing is the "gap between pages" the admin's
              // chapter-layout choice controls, gallery-wide only — mobile
              // always uses the flat px-4 above regardless of this setting.
              // CONTINUOUS shrinks it down to px-2 — combined with the next
              // chapter's own px-2, that's 1rem between the last photo of
              // one chapter and the first of the next, matching
              // ChapterMosaic's own inter-photo gap-4 (not px-0: photos
              // from consecutive chapters would touch directly with no
              // breathing room at all) — so chapters flow into each other
              // instead of each being a framed page. The very first
              // chapter gets more (pl-10, 5x) on its left side only —
              // that's the seam against the cover, which reads better with
              // more separation than one chapter flowing into the next.
              chapterLayout === "CONTINUOUS"
                ? cn(
                    index === 0 ? "gallery-wide:pl-10" : "gallery-wide:pl-2",
                    "gallery-wide:pr-2",
                  )
                : "gallery-wide:px-16",
            )}
          >
            {showChapterLabels && (
              <AccentLabel
                as="h2"
                className="mb-6 block shrink-0 text-2xl gallery-short:mb-1 gallery-short:text-sm"
              >
                {chapter.label}
              </AccentLabel>
            )}
            <ChapterMosaic
              placements={chapter.placements}
              forceGrid={forceGrid}
              onItemClick={openLightboxFor}
              itemClassName="bg-portfolio-grain"
              className="gallery-wide:min-h-0 gallery-wide:flex-1"
              fitHeight
              minRowCount={chapter.minRowCount}
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
