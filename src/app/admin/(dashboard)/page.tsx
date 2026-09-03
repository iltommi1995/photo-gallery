import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function AdminDashboardPage() {
  const [albumCount, publishedCount, photoCount, unplacedCount] = await Promise.all([
    prisma.album.count(),
    prisma.album.count({ where: { status: "PUBLISHED" } }),
    prisma.photo.count(),
    prisma.photo.count({ where: { placements: { none: {} } } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Link href="/admin/albums">
          <Card className="hover:bg-muted/50">
            <CardHeader>
              <CardTitle className="text-muted-foreground text-xs font-normal">
                Albums
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{albumCount}</CardContent>
          </Card>
        </Link>
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-xs font-normal">
              Published
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{publishedCount}</CardContent>
        </Card>
        <Link href="/admin/photos">
          <Card className="hover:bg-muted/50">
            <CardHeader>
              <CardTitle className="text-muted-foreground text-xs font-normal">
                Photos
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{photoCount}</CardContent>
          </Card>
        </Link>
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-xs font-normal">
              Unplaced photos
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{unplacedCount}</CardContent>
        </Card>
      </div>
    </div>
  );
}
