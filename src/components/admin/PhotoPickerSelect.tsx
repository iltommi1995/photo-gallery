"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { photoMetadataSchema, validateUploadFile } from "@/lib/schemas/photo";

type PickablePhoto = { id: string; filename: string; altText: string | null };
type PhotoPickerSelectProps = {
  photos: PickablePhoto[];
  value: string | null;
  onChange: (photoId: string | null) => void;
  placeholder?: string;
  id?: string;
};

export function PhotoPickerSelect({
  photos,
  value,
  onChange,
  placeholder = "None",
  id,
}: PhotoPickerSelectProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PickablePhoto[]>([]);
  const [selected, setSelected] = useState<PickablePhoto | null>(null);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [editPhoto, setEditPhoto] = useState<PickablePhoto | null>(null);
  const [altText, setAltText] = useState("");
  const [uploading, setUploading] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const current = selected?.id === value ? selected : photos.find((p) => p.id === value);

  const loadPage = useCallback(
    async (next: string | null, reset = false) => {
      if (busy.current && !reset) return;
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      busy.current = true;
      setLoading(true);
      setError("");
      if (reset) {
        setItems([]);
        setCursor(null);
      }
      try {
        const params = new URLSearchParams({ limit: "24", q: query });
        if (next) params.set("cursor", next);
        const res = await fetch(`/api/admin/photos?${params}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Could not load photos. Please retry.");
        const data: { photos: PickablePhoto[]; nextCursor: string | null } =
          await res.json();
        if (controller.signal.aborted) return;
        setItems((previous) =>
          reset
            ? data.photos
            : [
                ...previous,
                ...data.photos.filter((p) => !previous.some((old) => old.id === p.id)),
              ],
        );
        setCursor(data.nextCursor);
      } catch (err) {
        if (!controller.signal.aborted)
          setError(err instanceof Error ? err.message : "Could not load photos.");
      } finally {
        if (!controller.signal.aborted) {
          busy.current = false;
          setLoading(false);
        }
      }
    },
    [query],
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadPage(null, true);
    });
    return () => {
      cancelled = true;
      request.current?.abort();
      busy.current = false;
    };
  }, [open, loadPage]);

  useEffect(() => {
    if (!open || !cursor || loading || error || !sentinel.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadPage(cursor);
      },
      { root: viewport.current, rootMargin: "160px" },
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [open, cursor, loading, error, loadPage]);

  function choose(photo: PickablePhoto) {
    if (!photo.altText?.trim()) {
      setEditPhoto(photo);
      setFile(null);
      setAltText("");
      setError("");
      return;
    }
    setSelected(photo);
    onChange(photo.id);
    setOpen(false);
  }

  async function savePhoto() {
    const parsed = photoMetadataSchema.safeParse({ altText });
    if (!parsed.success) {
      setError("Enter an alt description (1–300 characters).");
      return;
    }
    setUploading(true);
    setError("");
    try {
      let photo: PickablePhoto;
      if (file) {
        const validation = validateUploadFile(file);
        if (!validation.ok) throw new Error(validation.error);
        const data = new FormData();
        data.append("files", file);
        data.append("altText", parsed.data.altText);
        const res = await fetch("/api/admin/photos", { method: "POST", body: data });
        const body = await res.json();
        const result = body.results?.[0];
        if (!res.ok || !result?.ok)
          throw new Error(result?.error || body.error || "Upload failed.");
        photo = {
          id: result.photo.id,
          filename: file.name,
          altText: parsed.data.altText,
        };
      } else if (editPhoto) {
        const res = await fetch(`/api/admin/photos/${editPhoto.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ altText: parsed.data.altText }),
        });
        if (!res.ok) throw new Error("Could not save the description.");
        photo = { ...editPhoto, altText: parsed.data.altText };
      } else return;
      setFile(null);
      setEditPhoto(null);
      setAltText("");
      choose(photo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <Button
        id={id}
        type="button"
        variant="outline"
        className="h-10 w-64 justify-start overflow-hidden"
        aria-haspopup="dialog"
        onClick={() => {
          setError("");
          setFile(null);
          setEditPhoto(null);
          setOpen(true);
        }}
      >
        {value && (
          <Image
            src={`/api/media/${value}/thumbnail`}
            alt=""
            width={32}
            height={32}
            className="size-8 shrink-0 rounded object-cover"
          />
        )}
        <span className="truncate">
          {value
            ? current?.altText || current?.filename || "Selected photo"
            : placeholder}
        </span>
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!uploading) setOpen(next);
        }}
      >
        <DialogContent
          className="flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-5xl flex-col gap-4 p-5 sm:max-w-5xl"
          showCloseButton={!uploading}
        >
          <DialogTitle>Choose a photo</DialogTitle>
          <DialogDescription>
            Choose a cover from your library or upload a new photo.
          </DialogDescription>
          <div className="flex flex-wrap gap-2">
            <Input
              aria-label="Search photos"
              placeholder="Search photos or places…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-w-40 flex-1"
              disabled={uploading}
            />
            <Button
              type="button"
              variant="outline"
              disabled={uploading}
              onClick={() => fileInput.current?.click()}
            >
              Upload photo
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/tiff"
              aria-label="Upload photo file"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setEditPhoto(null);
                setAltText("");
                setError("");
                e.target.value = "";
              }}
            />
          </div>
          {(file || editPhoto) && (
            <div className="space-y-2 rounded-md border p-3">
              <p className="text-sm">{file?.name ?? editPhoto?.filename}</p>
              <Input
                aria-label="Photo description (alt text)"
                placeholder="Describe the photo (required)"
                value={altText}
                maxLength={300}
                onChange={(e) => setAltText(e.target.value)}
                disabled={uploading}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  disabled={uploading}
                  onClick={() => void savePhoto()}
                >
                  {uploading
                    ? "Uploading / saving…"
                    : file
                      ? "Upload and select"
                      : "Save description and select"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={uploading}
                  onClick={() => {
                    setFile(null);
                    setEditPhoto(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
          {error && (
            <div role="alert" className="text-destructive text-sm">
              {error}{" "}
              {!file && !editPhoto && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => void loadPage(cursor, !items.length)}
                >
                  Retry
                </Button>
              )}
            </div>
          )}
          <div
            ref={viewport}
            className="min-h-0 flex-1 overflow-y-auto"
            style={{ maxHeight: "58dvh" }}
            data-testid="photo-picker-scroll"
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  disabled={uploading}
                  onClick={() => choose(photo)}
                  aria-pressed={value === photo.id}
                  aria-label={`Select ${photo.altText || photo.filename}`}
                  className={`group relative aspect-[4/3] overflow-hidden rounded-md border-2 focus-visible:outline-2 focus-visible:outline-offset-2 ${value === photo.id ? "border-primary" : "border-transparent"}`}
                >
                  <Image
                    src={`/api/media/${photo.id}/thumbnail`}
                    alt={photo.altText || photo.filename}
                    fill
                    sizes="(min-width: 1024px) 240px, 40vw"
                    className="object-cover transition-opacity group-hover:opacity-80"
                  />
                  <span className="absolute inset-x-0 bottom-0 truncate bg-black/65 px-2 py-1 text-left text-xs text-white">
                    {photo.altText || photo.filename}
                  </span>
                  {value === photo.id && (
                    <span className="absolute top-2 right-2 rounded bg-primary px-2 py-1 text-xs text-primary-foreground">
                      Selected
                    </span>
                  )}
                </button>
              ))}
            </div>
            {!loading && !error && items.length === 0 && (
              <p className="p-8 text-center text-sm text-muted-foreground">
                No photos found.
              </p>
            )}
            <div
              ref={sentinel}
              className="p-3 text-center text-sm text-muted-foreground"
              role="status"
            >
              {loading ? (
                "Loading photos…"
              ) : cursor ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => void loadPage(cursor)}
                >
                  Load more
                </Button>
              ) : items.length ? (
                "All photos loaded"
              ) : (
                ""
              )}
            </div>
          </div>
          <div className="flex justify-between border-t pt-3">
            <Button
              type="button"
              variant="ghost"
              disabled={uploading}
              onClick={() => {
                onChange(null);
                setSelected(null);
                setOpen(false);
              }}
            >
              Remove selection
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={uploading}
              onClick={() => setOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
