"use client";

import { useEffect } from "react";
import Image from "next/image";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { Photo } from "@prisma/client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { formatExifLines } from "@/lib/exif/format";
import { cn } from "@/lib/utils";

export type LightboxPhoto = Pick<
  Photo,
  | "id"
  | "altText"
  | "caption"
  | "cameraMake"
  | "cameraModel"
  | "lens"
  | "focalLengthMm"
  | "aperture"
  | "shutterSpeed"
  | "iso"
  | "takenAt"
  | "locationName"
  | "isAnalog"
  | "filmStock"
>;

type LightboxProps = {
  photos: LightboxPhoto[];
  index: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
};

export function Lightbox({ photos, index, onClose, onNavigate }: LightboxProps) {
  const open = index !== null;
  const photo = index !== null ? photos[index] : null;

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (index === null) return;
      if (event.key === "ArrowRight" && index < photos.length - 1) onNavigate(index + 1);
      if (event.key === "ArrowLeft" && index > 0) onNavigate(index - 1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, index, photos.length, onNavigate]);

  if (!photo || index === null) return null;

  const exifLines = formatExifLines(photo);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton
        className="bg-portfolio-ink flex h-screen max-h-screen w-screen max-w-none flex-col gap-0 rounded-none p-0 sm:max-w-none md:flex-row"
      >
        <DialogTitle className="sr-only">{photo.altText ?? "Photo"}</DialogTitle>

        <div className="relative flex-1">
          <Image
            src={`/api/media/${photo.id}/full`}
            alt={photo.altText ?? ""}
            fill
            sizes="100vw"
            className="object-contain"
            priority
          />

          {index > 0 && (
            <button
              type="button"
              onClick={() => onNavigate(index - 1)}
              aria-label="Previous photo"
              className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/60"
            >
              <ChevronLeftIcon className="size-6" />
            </button>
          )}
          {index < photos.length - 1 && (
            <button
              type="button"
              onClick={() => onNavigate(index + 1)}
              aria-label="Next photo"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/60"
            >
              <ChevronRightIcon className="size-6" />
            </button>
          )}
        </div>

        <aside
          className={cn(
            "text-portfolio-paper flex w-full shrink-0 flex-col gap-3 p-6 md:w-72",
            "border-t border-white/10 md:border-t-0 md:border-l",
          )}
        >
          {photo.caption && <p className="text-sm">{photo.caption}</p>}
          <dl className="flex flex-col gap-2 text-sm">
            {exifLines.map((line) => (
              <div key={line.label}>
                <dt className="text-portfolio-paper/50 text-xs tracking-wide uppercase">
                  {line.label}
                </dt>
                <dd>{line.value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-portfolio-paper/40 mt-auto text-xs">
            {index + 1} / {photos.length}
          </p>
        </aside>
      </DialogContent>
    </Dialog>
  );
}
