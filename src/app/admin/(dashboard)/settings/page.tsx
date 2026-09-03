import type { Metadata } from "next";

import { SiteSettingsForm } from "@/components/admin/SiteSettingsForm";
import { prisma } from "@/lib/db";
import { getSiteSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function AdminSettingsPage() {
  const [settings, photos] = await Promise.all([
    getSiteSettings(),
    prisma.photo.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold">Site settings</h1>
      <SiteSettingsForm settings={settings} photos={photos} />
    </div>
  );
}
