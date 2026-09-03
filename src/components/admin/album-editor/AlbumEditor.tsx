"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import Image from "next/image";
import type { Album, PlacementSize } from "@prisma/client";

import { ChapterMosaic } from "@/components/gallery/ChapterMosaic";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChapterCanvas } from "./ChapterCanvas";
import { ChapterTabs } from "./ChapterTabs";
import { PhotoLibrarySidebar } from "./PhotoLibrarySidebar";
import type { EditorChapter, EditorPhoto, SaveStatus } from "./types";

const AUTOSAVE_DELAY_MS = 1200;

function tempId() {
  return `temp:${crypto.randomUUID()}`;
}

const SAVE_STATUS_LABEL: Record<SaveStatus, string> = {
  idle: "",
  unsaved: "Unsaved changes",
  saving: "Saving…",
  saved: "Saved",
  error: "Failed to save",
};

type AlbumEditorProps = {
  album: Album;
  initialChapters: EditorChapter[];
  allPhotos: EditorPhoto[];
};

export function AlbumEditor({ album, initialChapters, allPhotos }: AlbumEditorProps) {
  const [chapters, setChapters] = useState(initialChapters);
  const [activeChapterId, setActiveChapterId] = useState(initialChapters[0]?.id ?? "");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [preview, setPreview] = useState(false);
  const [draggedPhoto, setDraggedPhoto] = useState<EditorPhoto | null>(null);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  const activeChapter = chapters.find((c) => c.id === activeChapterId) ?? chapters[0];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  function updateActiveChapterPlacements(
    updater: (placements: EditorChapter["placements"]) => EditorChapter["placements"],
  ) {
    setChapters((prev) =>
      prev.map((c) =>
        c.id === activeChapterId ? { ...c, placements: updater(c.placements) } : c,
      ),
    );
    setSaveStatus("unsaved");
  }

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (saveStatus !== "unsaved" || !activeChapter) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        const res = await fetch(`/api/admin/chapters/${activeChapter.id}/placements`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            placements: activeChapter.placements.map((p) => ({
              photoId: p.photo.id,
              size: p.size,
            })),
          }),
        });
        if (!res.ok) throw new Error("save failed");
        const { placements } = await res.json();
        setChapters((prev) =>
          prev.map((c) => (c.id === activeChapter.id ? { ...c, placements } : c)),
        );
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapters, activeChapterId]);

  const chapterPhotoIds = useMemo(
    () => new Set(activeChapter?.placements.map((p) => p.photo.id) ?? []),
    [activeChapter],
  );

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current;
    if (data?.type === "library") setDraggedPhoto(data.photo as EditorPhoto);
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggedPhoto(null);
    const { active, over } = event;
    if (!over || !activeChapter) return;

    const activeId = String(active.id);

    if (activeId.startsWith("library:")) {
      const data = active.data.current;
      const photo = data?.type === "library" ? (data.photo as EditorPhoto) : null;
      if (!photo) return;
      const isDropOnCanvas =
        over.id === "canvas-dropzone" ||
        activeChapter.placements.some((p) => p.id === over.id);
      if (!isDropOnCanvas) return;
      updateActiveChapterPlacements((placements) => [
        ...placements,
        { id: tempId(), size: "MEDIUM" as PlacementSize, photo },
      ]);
      return;
    }

    if (activeId !== String(over.id)) {
      updateActiveChapterPlacements((placements) => {
        const oldIndex = placements.findIndex((p) => p.id === activeId);
        const newIndex = placements.findIndex((p) => p.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return placements;
        return arrayMove(placements, oldIndex, newIndex);
      });
    }
  }

  function handleResize(placementId: string, size: PlacementSize) {
    updateActiveChapterPlacements((placements) =>
      placements.map((p) => (p.id === placementId ? { ...p, size } : p)),
    );
  }

  function handleRemove(placementId: string) {
    updateActiveChapterPlacements((placements) =>
      placements.filter((p) => p.id !== placementId),
    );
  }

  async function handleCreateChapter() {
    const res = await fetch(`/api/admin/albums/${album.id}/chapters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: `Chapter ${chapters.length + 1}` }),
    });
    if (!res.ok) return;
    const { chapter } = await res.json();
    setChapters((prev) => [...prev, { ...chapter, placements: [] }]);
    setActiveChapterId(chapter.id);
  }

  async function handleRenameChapter(chapterId: string, label: string) {
    setChapters((prev) => prev.map((c) => (c.id === chapterId ? { ...c, label } : c)));
    await fetch(`/api/admin/chapters/${chapterId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
  }

  async function handleDeleteChapter(chapterId: string) {
    if (!confirm("Delete this chapter and all its placements?")) return;
    setChapters((prev) => prev.filter((c) => c.id !== chapterId));
    if (activeChapterId === chapterId) {
      const remaining = chapters.filter((c) => c.id !== chapterId);
      setActiveChapterId(remaining[0]?.id ?? "");
    }
    await fetch(`/api/admin/chapters/${chapterId}`, { method: "DELETE" });
  }

  async function handleReorderChapters(chapterIds: string[]) {
    setChapters((prev) =>
      chapterIds
        .map((id) => prev.find((c) => c.id === id))
        .filter((c): c is EditorChapter => Boolean(c)),
    );
    await fetch(`/api/admin/albums/${album.id}/chapters/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapterIds }),
    });
  }

  if (chapters.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
        <p className="text-muted-foreground text-sm">This album has no chapters yet.</p>
        <Button type="button" onClick={handleCreateChapter}>
          Create first chapter
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <ChapterTabs
          chapters={chapters}
          activeChapterId={activeChapterId}
          onSelect={setActiveChapterId}
          onRename={handleRenameChapter}
          onDelete={handleDeleteChapter}
          onCreate={handleCreateChapter}
          onReorder={handleReorderChapters}
        />
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-xs">
            {SAVE_STATUS_LABEL[saveStatus]}
          </span>
          <Tabs
            value={preview ? "preview" : "edit"}
            onValueChange={(v) => setPreview(v === "preview")}
          >
            <TabsList>
              <TabsTrigger value="edit">Edit</TabsTrigger>
              <TabsTrigger value="preview">Live preview</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {preview ? (
        activeChapter && <ChapterMosaic placements={activeChapter.placements} />
      ) : (
        <div className="grid grid-cols-[220px_1fr] gap-4">
          <PhotoLibrarySidebar photos={allPhotos} chapterPhotoIds={chapterPhotoIds} />
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {activeChapter && (
              <ChapterCanvas
                placements={activeChapter.placements}
                onResize={handleResize}
                onRemove={handleRemove}
              />
            )}
            <DragOverlay>
              {draggedPhoto && (
                <div className="relative size-20 overflow-hidden rounded-md shadow-lg">
                  <Image
                    src={`/api/media/${draggedPhoto.id}/thumbnail`}
                    alt=""
                    fill
                    className="object-cover"
                  />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>
      )}
    </div>
  );
}
