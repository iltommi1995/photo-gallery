"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Album } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AlbumSettingsFormProps = {
  album: Album;
};

export function AlbumSettingsForm({ album }: AlbumSettingsFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(album.title);
  const [subtitle, setSubtitle] = useState(album.subtitle ?? "");
  const [locationName, setLocationName] = useState(album.locationName ?? "");
  const [status, setStatus] = useState(album.status);
  const [saving, setSaving] = useState(false);

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
      <Button type="button" onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
