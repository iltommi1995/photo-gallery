import { notFound } from "next/navigation";

import { AlbumEditor } from "@/components/admin/album-editor/AlbumEditor";
import { AlbumSettingsForm } from "@/components/admin/AlbumSettingsForm";
import { prisma } from "@/lib/db";

type AlbumEditorPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AlbumEditorPage({ params }: AlbumEditorPageProps) {
  const { id } = await params;

  const [album, allPhotos] = await Promise.all([
    prisma.album.findUnique({
      where: { id },
      include: {
        chapters: {
          orderBy: { order: "asc" },
          include: {
            placements: {
              orderBy: { order: "asc" },
              include: { photo: { include: { tags: true } } },
            },
          },
        },
      },
    }),
    prisma.photo.findMany({ orderBy: { createdAt: "desc" }, include: { tags: true } }),
  ]);

  if (!album) notFound();

  return (
    <div className="flex flex-col gap-6">
      <AlbumSettingsForm album={album} />
      <AlbumEditor album={album} initialChapters={album.chapters} allPhotos={allPhotos} />
    </div>
  );
}
