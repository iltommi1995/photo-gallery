"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import type { Photo, Placement, Tag } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { PhotoMetadataDialog } from "@/components/admin/PhotoMetadataDialog";
import { cn } from "@/lib/utils";

type PhotoWithExtras = Photo & { tags: Tag[]; placements: Placement[] };

type PhotoLibraryGridProps = {
  photos: PhotoWithExtras[];
  tags: Tag[];
};

export function PhotoLibraryGrid({ photos, tags }: PhotoLibraryGridProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function deleteOne(id: string) {
    if (!confirm("Delete this photo? This can't be undone.")) return;
    const res = await fetch(`/api/admin/photos/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Could not delete photo");
      return;
    }
    toast.success("Photo deleted");
    router.refresh();
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    const count = selected.size;
    if (!confirm(`Delete ${count} photo${count === 1 ? "" : "s"}? This can't be undone.`))
      return;

    setDeleting(true);
    const res = await fetch("/api/admin/photos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected) }),
    });
    setDeleting(false);
    if (!res.ok) {
      toast.error("Could not delete photos");
      return;
    }
    const { deleted, failed } = await res.json();
    if (deleted.length)
      toast.success(`Deleted ${deleted.length} photo${deleted.length === 1 ? "" : "s"}`);
    if (failed.length)
      toast.error(
        `${failed.length} photo${failed.length === 1 ? "" : "s"} still in use, not deleted`,
      );
    setSelected(new Set());
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {selected.size > 0 && (
        <div className="bg-muted flex items-center justify-between rounded-md border px-3 py-2">
          <span className="text-sm">{selected.size} selected</span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelected(new Set())}
            >
              Clear
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={deleteSelected}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete selected"}
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {photos.map((photo) => (
          <div key={photo.id} className="flex flex-col gap-2">
            <div className="bg-muted relative aspect-[3/2] overflow-hidden rounded-md">
              <label
                className={cn(
                  "absolute top-1.5 left-1.5 z-10 flex size-5 cursor-pointer items-center justify-center rounded border bg-white/90",
                  selected.has(photo.id) && "border-primary",
                )}
              >
                <input
                  type="checkbox"
                  className="accent-primary size-4"
                  checked={selected.has(photo.id)}
                  onChange={() => toggle(photo.id)}
                  aria-label={`Select ${photo.filename}`}
                />
              </label>
              {photo.thumbnailPath && (
                <Image
                  src={`/api/media/${photo.id}/thumbnail`}
                  alt={photo.altText ?? ""}
                  fill
                  sizes="200px"
                  className="object-cover"
                />
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{photo.filename}</p>
                <p className="text-muted-foreground text-xs">
                  {photo.altText ? "" : "Needs alt text · "}
                  {photo.placements.length} placement
                  {photo.placements.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <PhotoMetadataDialog
                  photo={photo}
                  allTags={tags}
                  trigger={
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => deleteOne(photo.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        ))}
        {photos.length === 0 && (
          <p className="text-muted-foreground col-span-full text-sm">
            No photos yet — upload some above.
          </p>
        )}
      </div>
    </div>
  );
}
