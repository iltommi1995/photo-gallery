"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { SiteSettings } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PhotoPickerSelect } from "@/components/admin/PhotoPickerSelect";

type PickablePhoto = { id: string; filename: string; altText: string | null };

type SiteSettingsFormProps = {
  settings: SiteSettings;
  photos: PickablePhoto[];
};

export function SiteSettingsForm({ settings, photos }: SiteSettingsFormProps) {
  const router = useRouter();
  const [siteTitle, setSiteTitle] = useState(settings.siteTitle);
  const [heroPhotoId, setHeroPhotoId] = useState(settings.heroPhotoId);
  const [aboutTitle, setAboutTitle] = useState(settings.aboutTitle ?? "");
  const [aboutBody, setAboutBody] = useState(settings.aboutBody ?? "");
  const [aboutPhotoId, setAboutPhotoId] = useState(settings.aboutPhotoId);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siteTitle,
        heroPhotoId,
        aboutTitle: aboutTitle || null,
        aboutBody: aboutBody || null,
        aboutPhotoId,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Could not save site settings");
      return;
    }
    toast.success("Site settings saved");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-lg border p-4">
        <h2 className="text-sm font-semibold">Home</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="site-title">Site title</Label>
            <Input
              id="site-title"
              value={siteTitle}
              onChange={(e) => setSiteTitle(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hero-photo">Hero photo</Label>
            <PhotoPickerSelect
              id="hero-photo"
              photos={photos}
              value={heroPhotoId}
              onChange={setHeroPhotoId}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border p-4">
        <h2 className="text-sm font-semibold">About Me</h2>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="about-title">Title</Label>
          <Input
            id="about-title"
            value={aboutTitle}
            onChange={(e) => setAboutTitle(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="about-body">Body</Label>
          <Textarea
            id="about-body"
            rows={6}
            value={aboutBody}
            onChange={(e) => setAboutBody(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="about-photo">Photo</Label>
          <PhotoPickerSelect
            id="about-photo"
            photos={photos}
            value={aboutPhotoId}
            onChange={setAboutPhotoId}
          />
        </div>
      </div>

      <Button type="button" onClick={save} disabled={saving} className="self-start">
        {saving ? "Saving…" : "Save settings"}
      </Button>
    </div>
  );
}
