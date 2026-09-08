"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Album } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PhotoPickerSelect } from "@/components/admin/PhotoPickerSelect";

type PickablePhoto = { id: string; filename: string; altText: string | null };

type AlbumSettingsFormProps = {
  album: Album;
  photos: PickablePhoto[];
};

export function AlbumSettingsForm({ album, photos }: AlbumSettingsFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(album.title);
  const [subtitle, setSubtitle] = useState(album.subtitle ?? "");
  const [locationName, setLocationName] = useState(album.locationName ?? "");
  const [status, setStatus] = useState(album.status);
  const [coverPhotoId, setCoverPhotoId] = useState(album.coverPhotoId);
  const [showChapterLabels, setShowChapterLabels] = useState(album.showChapterLabels);
  const [chapterLayout, setChapterLayout] = useState(album.chapterLayout);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function deleteAlbum() {
    if (
      !confirm(
        `Delete "${album.title}"? This removes all its chapters and photo placements — the photos themselves stay in the library. This can't be undone.`,
      )
    )
      return;
    setDeleting(true);
    const res = await fetch(`/api/admin/albums/${album.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      toast.error("Could not delete album");
      return;
    }
    toast.success("Album deleted");
    router.push("/admin/albums");
  }

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/admin/albums/${album.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        subtitle: subtitle || null,
        locationName: locationName || null,
        status,
        coverPhotoId,
        showChapterLabels,
        chapterLayout,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Could not save album settings");
      return;
    }
    toast.success("Album settings saved");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border p-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="album-title">Title</Label>
        <Input
          id="album-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="album-subtitle">Subtitle</Label>
        <Input
          id="album-subtitle"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="album-location">Location</Label>
        <Input
          id="album-location"
          value={locationName}
          onChange={(e) => setLocationName(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="album-status">Status</Label>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger id="album-status" className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="album-cover">Cover photo</Label>
        <PhotoPickerSelect
          id="album-cover"
          photos={photos}
          value={coverPhotoId}
          onChange={setCoverPhotoId}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="album-chapter-layout">Chapter layout</Label>
        <Select
          value={chapterLayout}
          onValueChange={(v) => setChapterLayout(v as typeof chapterLayout)}
        >
          <SelectTrigger id="album-chapter-layout" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PAGED">Separate pages</SelectItem>
            <SelectItem value="CONTINUOUS">Continuous (no gap)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="album-show-chapter-labels">Chapter titles</Label>
        <div className="flex h-9 items-center gap-2">
          <Switch
            id="album-show-chapter-labels"
            checked={showChapterLabels}
            onCheckedChange={setShowChapterLabels}
          />
          <span className="text-muted-foreground text-sm">
            {showChapterLabels ? "Shown" : "Hidden"}
          </span>
        </div>
      </div>
      <Button type="button" onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </Button>
      <Button
        type="button"
        variant="destructive"
        onClick={deleteAlbum}
        disabled={deleting}
      >
        {deleting ? "Deleting…" : "Delete album"}
      </Button>
    </div>
  );
}
