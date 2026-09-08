import { notFound } from "next/navigation";

import { AlbumEditor } from "@/components/admin/album-editor/AlbumEditor";
import { AlbumSettingsForm } from "@/components/admin/AlbumSettingsForm";
import { groupChaptersByViewport } from "@/lib/gallery/placement-mapping";
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
          orderBy: [{ viewport: "asc" }, { order: "asc" }],
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

  const { webChapters, mobileLandscapeChapters, mobilePortraitChapters } =
    groupChaptersByViewport(album.chapters);

  return (
    <div className="flex flex-col gap-6">
      <AlbumSettingsForm album={album} photos={allPhotos} />
      <AlbumEditor
        album={album}
        initialWebChapters={webChapters}
        initialMobileLandscapeChapters={mobileLandscapeChapters}
        initialMobilePortraitChapters={mobilePortraitChapters}
        allPhotos={allPhotos}
      />
    </div>
  );
}
