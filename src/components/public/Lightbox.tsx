"use client";

import { useEffect } from "react";
import Image from "next/image";
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react";
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
        data-lightbox-open
        showCloseButton={false}
        className="bg-portfolio-grain flex h-dvh max-h-dvh w-screen max-w-none flex-col gap-0 rounded-none p-0 sm:max-w-none gallery-wide:flex-row"
      >
        <DialogTitle className="sr-only">{photo.altText ?? "Photo"}</DialogTitle>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-portfolio-accent hover:opacity-70 absolute top-4 right-4 z-10 gallery-short:top-2 gallery-short:right-2"
        >
          <XIcon className="size-8 gallery-short:size-6" />
        </button>

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
              className="text-portfolio-accent hover:opacity-70 absolute top-1/2 left-4 -translate-y-1/2 gallery-short:left-2"
            >
              <ChevronLeftIcon className="size-8 gallery-short:size-6" />
            </button>
          )}
          {index < photos.length - 1 && (
            <button
              type="button"
              onClick={() => onNavigate(index + 1)}
              aria-label="Next photo"
              className="text-portfolio-accent hover:opacity-70 absolute top-1/2 right-4 -translate-y-1/2 gallery-short:right-2"
            >
              <ChevronRightIcon className="size-8 gallery-short:size-6" />
            </button>
          )}
        </div>

        <aside
          className={cn(
            "prose-portfolio-text text-portfolio-ink flex w-full shrink-0 flex-col gap-3 p-6 gallery-wide:w-72 gallery-short:w-48 gallery-short:gap-1 gallery-short:overflow-y-auto gallery-short:p-3 gallery-short:text-xs",
            "border-t border-black/10 gallery-wide:border-t-0 gallery-wide:border-l",
          )}
        >
          {photo.caption && <p className="text-sm">{photo.caption}</p>}
          <dl className="flex flex-col gap-2 text-sm">
            {exifLines.map((line) => (
              <div key={line.label}>
                <dt className="text-portfolio-ink/50 text-xs tracking-wide uppercase">
                  {line.label}
                </dt>
                <dd>{line.value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-portfolio-ink/40 mt-auto text-xs">
            {index + 1} / {photos.length}
          </p>
        </aside>
      </DialogContent>
    </Dialog>
  );
}
