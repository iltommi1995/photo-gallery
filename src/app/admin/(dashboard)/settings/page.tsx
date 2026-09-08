import type { Metadata } from "next";

import { SiteSettingsForm } from "@/components/admin/SiteSettingsForm";
import { TwoFactorSettings } from "@/components/admin/TwoFactorSettings";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSiteSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function AdminSettingsPage() {
  const session = await auth();
  const [settings, photos, admin] = await Promise.all([
    getSiteSettings(),
    prisma.photo.findMany({ orderBy: { createdAt: "desc" } }),
    session?.user?.id
      ? prisma.admin.findUnique({
          where: { id: session.user.id },
          select: { totpEnabled: true },
        })
      : null,
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold">Site settings</h1>
      <SiteSettingsForm settings={settings} photos={photos} />
      <TwoFactorSettings initialEnabled={admin?.totpEnabled ?? false} />
    </div>
  );
}
