import type { CSSProperties } from "react";
import { resolveGrid } from "@/lib/gallery/grid";
import Image from "next/image";

import { cn } from "@/lib/utils";

type MosaicGridSpan = {
  colSpan: number;
  rowSpan: number;
  gridColumn?: number | null;
  gridRow?: number | null;
};

export type MosaicPlacement = MosaicGridSpan &
  (
    | {
        id: string;
        type: "PHOTO";
        preserveAspectRatio?: boolean;
        photo: {
          id: string;
          altText: string | null;
          blurDataUrl: string | null;
        };
      }
    | {
        id: string;
        type: "TEXT";
        /** Pre-sanitized HTML (bold/italic/link only) — see
         * src/lib/sanitize-html.ts, the single place it's produced. */
        textContent: string;
      }
  );

type ChapterMosaicProps = {
  placements: MosaicPlacement[];
  className?: string;
  itemClassName?: string;
  /** Overlay content per item — e.g. admin resize/remove controls. Keeps
   * this component purely presentational so the public site can use it
   * unmodified (spec §7.3: one renderer, shared by preview and publish). */
  renderOverlay?: (placement: MosaicPlacement) => React.ReactNode;
  /** Photo items only — text blocks aren't lightbox-able. */
  onItemClick?: (placement: Extract<MosaicPlacement, { type: "PHOTO" }>) => void;
  /** Eager-load the first image (above-the-fold chapter open). */
  priority?: boolean;
  /** Size rows to always exactly fill the container's own height — no
   * scroll, nothing clipped — instead of a fixed height per row. Used by
   * the public album/place scroll view, where each chapter is a
   * fixed-height page and its content (padding included) must always fit
   * without scrolling; the container must itself have a definite height
   * (e.g. a `gallery-wide:h-full` ancestor chain) for this to have
   * anything to fill. Off by default for contexts with no such height
   * (admin live preview, Storybook), which keep the fixed row height instead. */
  fitHeight?: boolean;
  /** Render the real 12-column grid (actual spans/positions) unconditionally
   * instead of behind the `gallery-wide:` breakpoint — for a caller that has
   * already decided in JS that a curated grid should render regardless of
   * the ambient viewport (an authored mobile-override chapter, rendered on
   * an actual phone). Off by default: every chapter without a mobile
   * override, and every existing caller, keeps today's exact behavior
   * (flatten on portrait, grid at gallery-wide). */
  forceGrid?: boolean;
};

export function ChapterMosaic({
  placements,
  className,
  itemClassName,
  renderOverlay,
  onItemClick,
  priority,
  fitHeight,
  forceGrid,
}: ChapterMosaicProps) {
  const positioned = resolveGrid(placements);
  const rowCount = Math.max(1, ...positioned.map((p) => p.gridRow + p.rowSpan - 1));
  return (
    <div
      className={cn(
        "grid auto-rows-auto gap-4",
        // Portrait mobile: one flat column, every item the same width and
        // aspect ratio, same gap — admin-set colSpan/rowSpan/position are a
        // gallery-wide-only concept (the 12x12 desktop grid) that doesn't
        // translate to a phone; a 2-column version of it here just produced
        // oddly-sized items and uneven gaps depending on what the desktop
        // layout happened to be. forceGrid bypasses this: the caller has
        // its own curated mobile layout, so render it as a real grid.
        forceGrid
          ? "grid-cols-12 auto-rows-[6rem]"
          : "grid-cols-1 gallery-wide:grid-cols-12 gallery-wide:auto-rows-[6rem]",
        // fitHeight's exact-fill (h-full + rows sized to the container)
        // stays gallery-wide-only regardless of forceGrid: it needs a
        // definite-height ancestor to fill, which only exists in the
        // horizontal-scroll layout (AlbumScrollView's gallery-wide:h-dvh
        // chain). forceGrid on portrait has no such ancestor — the fixed
        // auto-rows-[6rem] above gives it a natural, page-scrollable
        // height instead, same as the admin preview/Storybook default.
        fitHeight &&
          "gallery-wide:h-full gallery-wide:[grid-template-rows:repeat(var(--row-count),minmax(0,1fr))]",
        className,
      )}
      style={fitHeight ? ({ "--row-count": rowCount } as CSSProperties) : undefined}
    >
      {positioned.map((placement, index) => {
        const clickable = onItemClick && placement.type === "PHOTO";
        return (
          <figure
            key={placement.id}
            data-grid-column={placement.gridColumn}
            data-grid-row={placement.gridRow}
            style={
              {
                "--grid-column": placement.gridColumn,
                "--grid-row": placement.gridRow,
                "--col-span": placement.colSpan,
                "--row-span": placement.rowSpan,
              } as CSSProperties
            }
            className={cn(
              "bg-muted relative overflow-hidden",
              // Same aspect ratio for every photo, full width — see above.
              // forceGrid skips this too: every item gets its real spot.
              placement.type === "PHOTO" && !forceGrid && "aspect-[4/3]",
              // Full grid-column/grid-row shorthand (position + span
              // together), not separate col-start/row-start utilities: those
              // only override grid-*-start, leaving grid-*-end (still "auto"
              // from the base span-only rule above) unset, which silently
              // collapses every gallery-wide item back to a 1-row/1-col span.
              forceGrid
                ? [
                    "aspect-auto",
                    "[grid-column:var(--grid-column)_/_span_var(--col-span)]",
                    "[grid-row:var(--grid-row)_/_span_var(--row-span)]",
                  ]
                : [
                    "gallery-wide:aspect-auto",
                    "gallery-wide:[grid-column:var(--grid-column)_/_span_var(--col-span)]",
                    "gallery-wide:[grid-row:var(--grid-row)_/_span_var(--row-span)]",
                  ],
              itemClassName,
            )}
          >
            {placement.type === "PHOTO" ? (
              <div
                className={cn("absolute inset-0", clickable && "cursor-pointer")}
                role={clickable ? "button" : undefined}
                tabIndex={clickable ? 0 : undefined}
                onClick={() => onItemClick?.(placement)}
                onKeyDown={(event) => {
                  if (clickable && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    onItemClick?.(placement);
                  }
                }}
              >
                <Image
                  src={`/api/media/${placement.photo.id}/medium`}
                  alt={placement.photo.altText ?? ""}
                  fill
                  placeholder={placement.photo.blurDataUrl ? "blur" : undefined}
                  blurDataURL={placement.photo.blurDataUrl ?? undefined}
                  sizes="(min-width: 640px) 25vw, 50vw"
                  className={
                    placement.preserveAspectRatio ? "object-contain" : "object-cover"
                  }
                  priority={priority && index === 0}
                />
              </div>
            ) : (
              // No absolute positioning on mobile: a text block has no
              // aspect-ratio forcing it, so its own content (in normal
              // flow) is what gives the figure a height. gallery-wide (or
              // forceGrid) switches back to filling the grid-sized box
              // like a photo.
              <div
                className={cn(
                  "prose-portfolio-text overflow-hidden p-4",
                  forceGrid
                    ? "absolute inset-0"
                    : "gallery-wide:absolute gallery-wide:inset-0",
                )}
                // Sanitized at write time (src/lib/sanitize-html.ts) — the
                // API route that persists placements is the only writer.
                dangerouslySetInnerHTML={{ __html: placement.textContent }}
              />
            )}
            {renderOverlay?.(placement)}
          </figure>
        );
      })}
    </div>
  );
}
