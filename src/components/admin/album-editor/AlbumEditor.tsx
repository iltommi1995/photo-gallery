"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragMoveEvent,
} from "@dnd-kit/core";
import {
  canPlace,
  resolveGrid,
  GRID_COLUMNS,
  GRID_GAP,
  GRID_ROW_HEIGHT,
} from "@/lib/gallery/grid";
import { rowSpanForAspectRatio } from "@/lib/gallery/aspect-ratio";
import { gridPlacementsSchema } from "@/lib/schemas/album";
import { toast } from "sonner";
import Image from "next/image";
import type { Album } from "@prisma/client";

import { ChapterMosaic } from "@/components/gallery/ChapterMosaic";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChapterCanvas } from "./ChapterCanvas";
import { ChapterTabs } from "./ChapterTabs";
import { PhotoLibrarySidebar } from "./PhotoLibrarySidebar";
import { TextBlockEditorDialog } from "./TextBlockEditorDialog";
import type {
  EditorChapter,
  EditorPhoto,
  EditorPlacement,
  SaveStatus,
  Viewport,
} from "./types";

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

type ChaptersByViewport = Record<Viewport, EditorChapter[]>;

type AlbumEditorProps = {
  album: Album;
  initialWebChapters: EditorChapter[];
  initialMobileLandscapeChapters: EditorChapter[];
  initialMobilePortraitChapters: EditorChapter[];
  allPhotos: EditorPhoto[];
};

export function AlbumEditor({
  album,
  initialWebChapters,
  initialMobileLandscapeChapters,
  initialMobilePortraitChapters,
  allPhotos,
}: AlbumEditorProps) {
  const [chaptersByViewport, setChaptersByViewport] = useState<ChaptersByViewport>({
    WEB: initialWebChapters,
    MOBILE_LANDSCAPE: initialMobileLandscapeChapters,
    MOBILE_PORTRAIT: initialMobilePortraitChapters,
  });
  // Which of the album's three independent chapter structures is being
  // edited/previewed — Web, or a fully independent Mobile landscape/
  // portrait one (own chapter count/split, not just own photos within
  // Web's chapter boundaries). See docs/ai/add-album-layout-variant.md.
  const [activeViewport, setActiveViewport] = useState<Viewport>("WEB");
  const [activeChapterId, setActiveChapterId] = useState(initialWebChapters[0]?.id ?? "");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [preview, setPreview] = useState(false);
  const [draggedPreview, setDraggedPreview] = useState<
    { kind: "photo"; photo: EditorPhoto } | { kind: "text" } | null
  >(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [cloning, setCloning] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyChapters = useRef(new Map<string, number>());
  const editRevision = useRef(0);
  const saveQueue = useRef(Promise.resolve());
  const pointer = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const trackPointer = (event: PointerEvent) => {
      pointer.current = { x: event.clientX, y: event.clientY };
    };
    document.addEventListener("pointermove", trackPointer, true);
    return () => document.removeEventListener("pointermove", trackPointer, true);
  }, []);
  const [dropTarget, setDropTarget] = useState<{
    gridColumn: number;
    gridRow: number;
    colSpan: number;
    rowSpan: number;
    valid: boolean;
  } | null>(null);

  const chapters = chaptersByViewport[activeViewport];
  const activeChapter = chapters.find((c) => c.id === activeChapterId);

  function selectChapter(chapterId: string) {
    setActiveChapterId(chapterId);
  }

  function selectViewport(viewport: Viewport) {
    setActiveViewport(viewport);
    setActiveChapterId(chaptersByViewport[viewport][0]?.id ?? "");
  }

  const editingTextPlacement = activeChapter?.placements.find(
    (p): p is Extract<EditorPlacement, { type: "TEXT" }> =>
      p.id === editingTextId && p.type === "TEXT",
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  function updateActiveChapterPlacements(
    updater: (placements: EditorChapter["placements"]) => EditorChapter["placements"],
  ) {
    setChaptersByViewport((prev) => ({
      ...prev,
      [activeViewport]: prev[activeViewport].map((c) =>
        c.id === activeChapterId ? { ...c, placements: updater(c.placements) } : c,
      ),
    }));
    dirtyChapters.current.set(activeChapterId, ++editRevision.current);
    setSaveStatus("unsaved");
  }

  useEffect(() => {
    const allChapters = [
      ...chaptersByViewport.WEB,
      ...chaptersByViewport.MOBILE_LANDSCAPE,
      ...chaptersByViewport.MOBILE_PORTRAIT,
    ];
    const pending = [...dirtyChapters.current.entries()].flatMap(
      ([chapterId, revision]) => {
        const chapter = allChapters.find((c) => c.id === chapterId);
        return chapter ? [{ chapter, revision }] : [];
      },
    );
    if (!pending.length) return;
    saveTimer.current = setTimeout(() => {
      saveQueue.current = saveQueue.current.then(async () => {
        setSaveStatus("saving");
        try {
          for (const { chapter, revision } of pending) {
            const payload = gridPlacementsSchema.parse({
              placements: resolveGrid(chapter.placements)
                .sort((a, b) => a.gridRow - b.gridRow || a.gridColumn - b.gridColumn)
                .map((p) =>
                  p.type === "PHOTO"
                    ? {
                        type: "PHOTO" as const,
                        photoId: p.photo.id,
                        preserveAspectRatio: p.preserveAspectRatio,
                        colSpan: p.colSpan,
                        rowSpan: p.rowSpan,
                        gridColumn: p.gridColumn,
                        gridRow: p.gridRow,
                      }
                    : {
                        type: "TEXT" as const,
                        textContent: p.textContent,
                        colSpan: p.colSpan,
                        rowSpan: p.rowSpan,
                        gridColumn: p.gridColumn,
                        gridRow: p.gridRow,
                      },
                ),
            });
            const res = await fetch(`/api/admin/chapters/${chapter.id}/placements`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error("save failed");
            // Full replacement needs no server IDs. Never overwrite newer local drags
            // with an older save response; temporary IDs remain stable until reload.
            if (dirtyChapters.current.get(chapter.id) === revision)
              dirtyChapters.current.delete(chapter.id);
          }
          setSaveStatus(dirtyChapters.current.size ? "unsaved" : "saved");
        } catch {
          setSaveStatus("error");
        }
      });
    }, AUTOSAVE_DELAY_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [chaptersByViewport]);

  const activeChapterPlacements = useMemo(
    () => activeChapter?.placements ?? [],
    [activeChapter],
  );
  const chapterPhotoIds = useMemo(
    () =>
      new Set(
        activeChapterPlacements.flatMap((p) => (p.type === "PHOTO" ? [p.photo.id] : [])),
      ),
    [activeChapterPlacements],
  );

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current;
    if (data?.type === "library") {
      setDraggedPreview({ kind: "photo", photo: data.photo as EditorPhoto });
      return;
    }
    const existing = activeChapterPlacements.find((p) => p.id === event.active.id);
    if (!existing) {
      setDraggedPreview(null);
      return;
    }
    setDraggedPreview(
      existing.type === "PHOTO"
        ? { kind: "photo", photo: existing.photo }
        : { kind: "text" },
    );
  }

  function getDropTarget(event: DragMoveEvent | DragEndEvent) {
    if (!activeChapter || event.over?.id !== "canvas-dropzone") return null;
    const existing = activeChapterPlacements.find((p) => p.id === event.active.id);
    const colSpan = existing?.colSpan ?? 4;
    const rowSpan = existing?.rowSpan ?? 3;
    const rect = document
      .querySelector('[data-testid="chapter-canvas-dropzone"]')
      ?.getBoundingClientRect();
    if (!rect) return null;
    const x = pointer.current.x - rect.left;
    const y = pointer.current.y - rect.top;
    const gridColumn = Math.min(
      GRID_COLUMNS + 1 - colSpan,
      Math.max(1, Math.floor(x / ((rect.width + GRID_GAP) / GRID_COLUMNS)) + 1),
    );
    const gridRow = Math.max(1, Math.floor(y / (GRID_ROW_HEIGHT + GRID_GAP)) + 1);
    const others = resolveGrid(activeChapterPlacements).filter(
      (p) => p.id !== event.active.id,
    );
    const target = { gridColumn, gridRow, colSpan, rowSpan };
    return { ...target, valid: canPlace(target, others) };
  }

  function handleDragEnd(event: DragEndEvent) {
    const target = getDropTarget(event);
    setDraggedPreview(null);
    setDropTarget(null);
    if (!target) return;
    if (!target.valid) {
      toast.error("Choose empty cells for this photo.");
      return;
    }
    const data = event.active.data.current;
    if (data?.type === "library") {
      const photo = data.photo as EditorPhoto;
      if (!photo.altText?.trim()) {
        toast.error("Add alt text to this photo before placing it.");
        return;
      }
      updateActiveChapterPlacements((placements) => [
        ...resolveGrid(placements),
        {
          id: tempId(),
          type: "PHOTO",
          preserveAspectRatio: false,
          photo,
          colSpan: target.colSpan,
          rowSpan: target.rowSpan,
          gridColumn: target.gridColumn,
          gridRow: target.gridRow,
        },
      ]);
    } else handleMove(String(event.active.id), target.gridColumn, target.gridRow);
  }

  function handleMove(placementId: string, gridColumn: number, gridRow: number) {
    if (!activeChapter) return;
    const positioned = resolveGrid(activeChapterPlacements);
    const current = positioned.find((p) => p.id === placementId);
    if (!current) return;
    const next = { ...current, gridColumn, gridRow };
    if (
      !canPlace(
        next,
        positioned.filter((p) => p.id !== placementId),
      )
    ) {
      toast.error("Choose empty cells inside the grid.");
      return;
    }
    updateActiveChapterPlacements(() =>
      positioned.map((p) => (p.id === placementId ? next : p)),
    );
  }

  function handleResize(placementId: string, colSpan: number, requestedRowSpan: number) {
    if (!activeChapter) return;
    const positioned = resolveGrid(activeChapterPlacements);
    const current = positioned.find((p) => p.id === placementId);
    if (!current) return;
    // Aspect-locked photos ignore the height stepper (disabled in the UI
    // anyway) and recompute their own height whenever width changes.
    const rowSpan =
      current.type === "PHOTO" && current.preserveAspectRatio
        ? rowSpanForAspectRatio(colSpan, current.photo.width, current.photo.height)
        : requestedRowSpan;
    const next = { ...current, colSpan, rowSpan };
    if (
      !canPlace(
        next,
        positioned.filter((p) => p.id !== placementId),
      )
    ) {
      toast.error("Move the photo to make room for this size.");
      return;
    }
    updateActiveChapterPlacements(() =>
      positioned.map((p) => (p.id === placementId ? next : p)),
    );
  }

  function handleToggleAspectRatio(placementId: string) {
    if (!activeChapter) return;
    const positioned = resolveGrid(activeChapterPlacements);
    const current = positioned.find((p) => p.id === placementId);
    if (!current || current.type !== "PHOTO") return;
    const preserveAspectRatio = !current.preserveAspectRatio;
    const rowSpan = preserveAspectRatio
      ? rowSpanForAspectRatio(current.colSpan, current.photo.width, current.photo.height)
      : current.rowSpan;
    const next = { ...current, preserveAspectRatio, rowSpan };
    if (
      !canPlace(
        next,
        positioned.filter((p) => p.id !== placementId),
      )
    ) {
      toast.error("Not enough room here to match the photo's proportions.");
      return;
    }
    updateActiveChapterPlacements(() =>
      positioned.map((p) => (p.id === placementId ? next : p)),
    );
  }

  function handleAddTextBlock() {
    if (!activeChapter) return;
    const id = tempId();
    updateActiveChapterPlacements((placements) => [
      ...resolveGrid(placements),
      { id, type: "TEXT", colSpan: 4, rowSpan: 3, textContent: "<p>New text block</p>" },
    ]);
    setEditingTextId(id);
  }

  function handleUpdateText(placementId: string, textContent: string) {
    if (!activeChapter) return;
    const positioned = resolveGrid(activeChapterPlacements);
    updateActiveChapterPlacements(() =>
      positioned.map((p) =>
        p.id === placementId && p.type === "TEXT" ? { ...p, textContent } : p,
      ),
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
      body: JSON.stringify({
        label: `Chapter ${chapters.length + 1}`,
        viewport: activeViewport,
      }),
    });
    if (!res.ok) return;
    const { chapter } = await res.json();
    const newChapter: EditorChapter = { ...chapter, placements: [] };
    setChaptersByViewport((prev) => ({
      ...prev,
      [activeViewport]: [...prev[activeViewport], newChapter],
    }));
    setActiveChapterId(chapter.id);
  }

  async function handleCloneFromWeb() {
    setCloning(true);
    try {
      const res = await fetch(`/api/admin/albums/${album.id}/chapters/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toViewport: activeViewport }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error(body?.error ?? "Couldn't clone the Web layout.");
        return;
      }
      const { chapters: cloned } = await res.json();
      const newChapters: EditorChapter[] = cloned.map(
        (c: EditorChapter & { placements: EditorPlacement[] }) => ({
          id: c.id,
          label: c.label,
          order: c.order,
          placements: c.placements,
        }),
      );
      setChaptersByViewport((prev) => ({ ...prev, [activeViewport]: newChapters }));
      setActiveChapterId(newChapters[0]?.id ?? "");
    } finally {
      setCloning(false);
    }
  }

  async function handleRenameChapter(chapterId: string, label: string) {
    setChaptersByViewport((prev) => ({
      ...prev,
      [activeViewport]: prev[activeViewport].map((c) =>
        c.id === chapterId ? { ...c, label } : c,
      ),
    }));
    await fetch(`/api/admin/chapters/${chapterId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
  }

  async function handleDeleteChapter(chapterId: string) {
    if (!confirm("Delete this chapter and all its placements?")) return;
    setChaptersByViewport((prev) => {
      const remaining = prev[activeViewport].filter((c) => c.id !== chapterId);
      if (activeChapterId === chapterId) setActiveChapterId(remaining[0]?.id ?? "");
      return { ...prev, [activeViewport]: remaining };
    });
    await fetch(`/api/admin/chapters/${chapterId}`, { method: "DELETE" });
  }

  async function handleReorderChapters(chapterIds: string[]) {
    setChaptersByViewport((prev) => ({
      ...prev,
      [activeViewport]: chapterIds
        .map((id) => prev[activeViewport].find((c) => c.id === id))
        .filter((c): c is EditorChapter => Boolean(c)),
    }));
    await fetch(`/api/admin/albums/${album.id}/chapters/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapterIds, viewport: activeViewport }),
    });
  }

  if (chaptersByViewport.WEB.length === 0) {
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
        <div className="flex items-center gap-4">
          <Tabs
            value={activeViewport}
            onValueChange={(v) => selectViewport(v as Viewport)}
          >
            <TabsList>
              <TabsTrigger value="WEB">Web</TabsTrigger>
              <TabsTrigger value="MOBILE_LANDSCAPE" className="gap-1.5">
                Mobile horizontal
                {chaptersByViewport.MOBILE_LANDSCAPE.length > 0 && (
                  <span
                    className="bg-primary size-1.5 rounded-full"
                    aria-label="Has its own landscape chapters"
                  />
                )}
              </TabsTrigger>
              <TabsTrigger value="MOBILE_PORTRAIT" className="gap-1.5">
                Mobile vertical
                {chaptersByViewport.MOBILE_PORTRAIT.length > 0 && (
                  <span
                    className="bg-primary size-1.5 rounded-full"
                    aria-label="Has its own portrait chapters"
                  />
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {chapters.length > 0 && (
            <ChapterTabs
              chapters={chapters}
              activeChapterId={activeChapterId}
              onSelect={selectChapter}
              onRename={handleRenameChapter}
              onDelete={handleDeleteChapter}
              onCreate={handleCreateChapter}
              onReorder={handleReorderChapters}
            />
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-xs">
            {SAVE_STATUS_LABEL[saveStatus]}
          </span>
          {saveStatus === "error" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setChaptersByViewport((prev) => ({ ...prev }))}
            >
              Retry save
            </Button>
          )}
          {chapters.length > 0 && !preview && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddTextBlock}
            >
              + Text block
            </Button>
          )}
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

      {chapters.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
          <p className="text-muted-foreground text-sm">
            {activeViewport === "MOBILE_LANDSCAPE"
              ? "This album has no landscape-specific chapters yet — a rotated phone currently just replicates the Web chapters above, as a grid."
              : "This album has no portrait-specific chapters yet — portrait mobile currently shows the Web chapters' photos as one full-width row each, in order."}
          </p>
          <div className="flex gap-2">
            <Button type="button" onClick={handleCreateChapter}>
              Create first chapter
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCloneFromWeb}
              disabled={cloning}
            >
              {cloning ? "Cloning…" : "Clone from Web"}
            </Button>
          </div>
        </div>
      ) : preview ? (
        activeChapter && (
          <ChapterMosaic
            placements={activeChapterPlacements}
            itemClassName="bg-portfolio-grain"
            forceGrid={activeViewport === "MOBILE_PORTRAIT"}
          />
        )
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragMove={(event) => setDropTarget(getDropTarget(event))}
          onDragCancel={() => {
            setDraggedPreview(null);
            setDropTarget(null);
          }}
        >
          <div className="grid grid-cols-[220px_minmax(0,1fr)] gap-4">
            <PhotoLibrarySidebar photos={allPhotos} chapterPhotoIds={chapterPhotoIds} />
            {activeChapter && (
              <ChapterCanvas
                key={activeChapter.id}
                placements={activeChapterPlacements}
                dropTarget={dropTarget}
                onMove={handleMove}
                onResize={handleResize}
                onRemove={handleRemove}
                onToggleAspectRatio={handleToggleAspectRatio}
                onEditText={setEditingTextId}
              />
            )}
          </div>
          <DragOverlay>
            {draggedPreview?.kind === "photo" && (
              <div className="relative size-20 overflow-hidden rounded-md shadow-lg">
                <Image
                  src={`/api/media/${draggedPreview.photo.id}/thumbnail`}
                  alt=""
                  sizes="80px"
                  fill
                  className="object-cover"
                />
              </div>
            )}
            {draggedPreview?.kind === "text" && (
              <div className="bg-portfolio-paper text-portfolio-ink flex size-20 items-center justify-center rounded-md text-xs shadow-lg">
                Text
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {editingTextPlacement && (
        <TextBlockEditorDialog
          open
          onOpenChange={(open) => !open && setEditingTextId(null)}
          initialHtml={editingTextPlacement.textContent}
          onSave={(html) => handleUpdateText(editingTextPlacement.id, html)}
        />
      )}
    </div>
  );
}
