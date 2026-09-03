import Image from "next/image";
import type { PlacementSize } from "@prisma/client";

import { cn } from "@/lib/utils";

export type MosaicPlacement = {
  id: string;
  size: PlacementSize;
  photo: {
    id: string;
    altText: string | null;
    blurDataUrl: string | null;
  };
};

/** Grid span per placement size — the one place this mapping is defined.
 * Both the admin editor canvas and this component read from here so the
 * edit view and the published view can never drift apart. */
export const MOSAIC_SIZE_CLASSES: Record<PlacementSize, string> = {
  SMALL: "col-span-1 row-span-1",
  MEDIUM: "col-span-2 row-span-1",
  LARGE: "col-span-2 row-span-2",
  FULL: "col-span-2 row-span-2 sm:col-span-4",
};

type ChapterMosaicProps = {
  placements: MosaicPlacement[];
  className?: string;
  itemClassName?: string;
  /** Overlay content per item — e.g. admin resize/remove controls. Keeps
   * this component purely presentational so the public site can use it
   * unmodified (spec §7.3: one renderer, shared by preview and publish). */
  renderOverlay?: (placement: MosaicPlacement) => React.ReactNode;
  onItemClick?: (placement: MosaicPlacement) => void;
  /** Eager-load the first image (above-the-fold chapter open). */
  priority?: boolean;
};

export function ChapterMosaic({
  placements,
  className,
  itemClassName,
  renderOverlay,
  onItemClick,
  priority,
}: ChapterMosaicProps) {
  return (
    <div
      className={cn(
        "grid auto-rows-[10rem] grid-cols-2 gap-2 sm:grid-cols-4 sm:auto-rows-[12rem]",
        className,
      )}
    >
      {placements.map((placement, index) => (
        <figure
          key={placement.id}
          className={cn(
            "bg-muted relative overflow-hidden",
            MOSAIC_SIZE_CLASSES[placement.size],
            itemClassName,
          )}
        >
          <div
            className={cn("absolute inset-0", onItemClick && "cursor-pointer")}
            role={onItemClick ? "button" : undefined}
            tabIndex={onItemClick ? 0 : undefined}
            onClick={() => onItemClick?.(placement)}
            onKeyDown={(event) => {
              if (onItemClick && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                onItemClick(placement);
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
              className="object-cover"
              priority={priority && index === 0}
            />
          </div>
          {renderOverlay?.(placement)}
        </figure>
      ))}
    </div>
  );
}
