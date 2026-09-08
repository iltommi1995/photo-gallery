"use client";

import Image from "next/image";
import Link from "next/link";

import { AccentLabel } from "@/components/public/AccentLabel";
import { HorizontalScrollProgress } from "@/components/public/HorizontalScrollProgress";
import { useHorizontalScroll } from "@/lib/scroll/useHorizontalScroll";
import { cn } from "@/lib/utils";

export type IndexScrollItem = {
  key: string;
  href: string;
  label: string;
  sublabel?: string;
  cover: { id: string; altText: string | null; blurDataUrl: string | null } | null;
};

type IndexScrollGridProps = {
  items: IndexScrollItem[];
  emptyMessage: string;
};

/** The Albums/Places index lists — a plain wrapping grid everywhere except
 * gallery-short (a rotated phone, not a real desktop window): there, a
 * handful of cards in a tall vertical grid leaves most of the short
 * landscape viewport empty, so it becomes a 2-row horizontal scroller
 * instead (matching the album viewer's own horizontal-scroll identity).
 * This is gallery-short specifically, not gallery-wide — a fixed card
 * width filling a REAL desktop window's full height turned into absurdly
 * tall, narrow slivers; a short phone viewport doesn't have that much
 * height to fill in the first place. gallery-short also gives the grid a
 * real height (h-full up the ancestor chain to the page's own h-dvh) so
 * the 2 rows actually fit one screen — without that, 2 naturally-sized
 * rows are taller than a phone's screen and the page just scrolls
 * vertically past the second row, defeating the point of scrolling
 * horizontally instead. */
export function IndexScrollGrid({ items, emptyMessage }: IndexScrollGridProps) {
  const { containerRef, progressBarRef, progressFillRef } = useHorizontalScroll();

  if (items.length === 0) {
    return <p className="text-portfolio-ink/60 text-sm">{emptyMessage}</p>;
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
        style={{ overflowAnchor: "none" }}
        className={cn(
          "grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4",
          "focus:outline-none gallery-short:h-full gallery-short:min-h-0 gallery-short:flex-1 gallery-short:grid-cols-none gallery-short:grid-flow-col gallery-short:grid-rows-2 gallery-short:auto-cols-[13rem] gallery-short:gap-6 gallery-short:overflow-x-auto gallery-short:overflow-y-hidden gallery-short:pb-2",
        )}
      >
        {items.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className="group flex flex-col gap-3 gallery-short:relative gallery-short:block gallery-short:h-full"
          >
            <div className="bg-muted relative aspect-[4/3] overflow-hidden gallery-short:aspect-auto gallery-short:h-full">
              {item.cover && (
                <Image
                  src={`/api/media/${item.cover.id}/medium`}
                  alt={item.cover.altText ?? ""}
                  fill
                  placeholder={item.cover.blurDataUrl ? "blur" : undefined}
                  blurDataURL={item.cover.blurDataUrl ?? undefined}
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                  // grayscale/hover lives on the image itself, not the
                  // wrapping div: filter on an ancestor desaturates its
                  // whole rendered output, including the caption overlay
                  // below (text-portfolio-accent would render washed-out
                  // gray instead of red).
                  className="object-cover grayscale transition-[filter] group-hover:grayscale-0"
                />
              )}
              {/* gallery-short: caption overlaid on the photo (like
                  AlbumHero) instead of taking its own row — there's no
                  spare height to give a label its own strip once 2 rows
                  must fit one short screen. */}
              <div className="from-portfolio-overlay pointer-events-none absolute inset-0 hidden bg-gradient-to-t to-transparent gallery-short:block" />
              <div className="absolute inset-x-0 bottom-0 hidden flex-col gap-0.5 p-3 gallery-short:flex">
                <AccentLabel className="text-sm">{item.label}</AccentLabel>
                {item.sublabel && (
                  <span className="text-portfolio-paper/80 text-xs">{item.sublabel}</span>
                )}
              </div>
            </div>
            <AccentLabel className="gallery-short:hidden">{item.label}</AccentLabel>
            {item.sublabel && (
              <span className="text-portfolio-ink/60 text-xs gallery-short:hidden">
                {item.sublabel}
              </span>
            )}
          </Link>
        ))}
      </div>
    </>
  );
}
