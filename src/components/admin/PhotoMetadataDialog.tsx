"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Photo, Tag } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  photoMetadataSchema,
  type PhotoMetadataFormInput,
  type PhotoMetadataOutput,
} from "@/lib/schemas/photo";
import { cn } from "@/lib/utils";

type PhotoWithTags = Photo & { tags: Tag[] };

type PhotoMetadataDialogProps = {
  photo: PhotoWithTags;
  allTags: Tag[];
  trigger: React.ReactElement;
};

function toFormValues(photo: PhotoWithTags): Partial<PhotoMetadataFormInput> {
  return {
    altText: photo.altText ?? "",
    caption: photo.caption ?? undefined,
    cameraMake: photo.cameraMake ?? undefined,
    cameraModel: photo.cameraModel ?? undefined,
    lens: photo.lens ?? undefined,
    focalLengthMm: photo.focalLengthMm ?? undefined,
    aperture: photo.aperture ?? undefined,
    shutterSpeed: photo.shutterSpeed ?? undefined,
    iso: photo.iso ?? undefined,
    // Native <input type="date"> needs "YYYY-MM-DD"; zod's z.coerce.date()
    // on submit turns that string back into a real Date.
    takenAt: photo.takenAt ? photo.takenAt.toISOString().slice(0, 10) : undefined,
    locationName: photo.locationName ?? undefined,
    gpsLat: photo.gpsLat ?? undefined,
    gpsLng: photo.gpsLng ?? undefined,
    isAnalog: photo.isAnalog,
    filmStock: photo.filmStock ?? undefined,
    tagIds: photo.tags.map((t) => t.id),
  };
}

export function PhotoMetadataDialog({
  photo,
  allTags,
  trigger,
}: PhotoMetadataDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState(allTags);
  const [newTagName, setNewTagName] = useState("");
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PhotoMetadataFormInput, unknown, PhotoMetadataOutput>({
    resolver: zodResolver(photoMetadataSchema),
    defaultValues: toFormValues(photo),
  });

  const selectedTagIds = watch("tagIds") ?? [];
  const isAnalog = watch("isAnalog");

  function toggleTag(tagId: string) {
    const next = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter((id) => id !== tagId)
      : [...selectedTagIds, tagId];
    setValue("tagIds", next);
  }

  async function createTag() {
    const name = newTagName.trim();
    if (!name) return;
    const res = await fetch("/api/admin/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      toast.error("Could not create tag");
      return;
    }
    const { tag } = await res.json();
    setTags((prev) => (prev.some((t) => t.id === tag.id) ? prev : [...prev, tag]));
    setValue("tagIds", [...selectedTagIds, tag.id]);
    setNewTagName("");
  }

  async function onSubmit(values: PhotoMetadataOutput) {
    const res = await fetch(`/api/admin/photos/${photo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      toast.error("Could not save changes");
      return;
    }
    toast.success("Photo updated");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit photo metadata</DialogTitle>
        </DialogHeader>
        <form
          id={`photo-metadata-${photo.id}`}
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`altText-${photo.id}`}>Alt text *</Label>
            <Input id={`altText-${photo.id}`} {...register("altText")} />
            {errors.altText && (
              <p className="text-destructive text-sm">{errors.altText.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`caption-${photo.id}`}>Caption</Label>
            <Textarea id={`caption-${photo.id}`} rows={2} {...register("caption")} />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor={`isAnalog-${photo.id}`}>Analog / film</Label>
              <p className="text-muted-foreground text-xs">
                No EXIF — fill camera/film in by hand.
              </p>
            </div>
            <Switch
              id={`isAnalog-${photo.id}`}
              checked={Boolean(isAnalog)}
              onCheckedChange={(checked) => setValue("isAnalog", checked)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`cameraMake-${photo.id}`}>Camera make</Label>
              <Input id={`cameraMake-${photo.id}`} {...register("cameraMake")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`cameraModel-${photo.id}`}>Camera model</Label>
              <Input id={`cameraModel-${photo.id}`} {...register("cameraModel")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`lens-${photo.id}`}>Lens</Label>
              <Input id={`lens-${photo.id}`} {...register("lens")} />
            </div>
            {isAnalog ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`filmStock-${photo.id}`}>Film stock</Label>
                <Input id={`filmStock-${photo.id}`} {...register("filmStock")} />
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`focalLengthMm-${photo.id}`}>Focal length (mm)</Label>
                <Input
                  id={`focalLengthMm-${photo.id}`}
                  type="number"
                  step="any"
                  {...register("focalLengthMm")}
                />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`aperture-${photo.id}`}>Aperture (f/)</Label>
              <Input
                id={`aperture-${photo.id}`}
                type="number"
                step="any"
                {...register("aperture")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`shutterSpeed-${photo.id}`}>Shutter speed</Label>
              <Input
                id={`shutterSpeed-${photo.id}`}
                placeholder="1/250"
                {...register("shutterSpeed")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`iso-${photo.id}`}>ISO</Label>
              <Input id={`iso-${photo.id}`} type="number" {...register("iso")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`locationName-${photo.id}`}>Location</Label>
              <Input id={`locationName-${photo.id}`} {...register("locationName")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`takenAt-${photo.id}`}>Date taken</Label>
              <Input id={`takenAt-${photo.id}`} type="date" {...register("takenAt")} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant={selectedTagIds.includes(tag.id) ? "default" : "outline"}
                  className={cn("cursor-pointer select-none")}
                  onClick={() => toggleTag(tag.id)}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="New tag"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void createTag();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={() => void createTag()}>
                Add
              </Button>
            </div>
          </div>
        </form>
        <DialogFooter>
          <Button
            type="submit"
            form={`photo-metadata-${photo.id}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
