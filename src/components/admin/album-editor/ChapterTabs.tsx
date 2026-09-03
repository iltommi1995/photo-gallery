"use client";

import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PlusIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { EditorChapter } from "./types";

type ChapterTabProps = {
  chapter: EditorChapter;
  active: boolean;
  onSelect: () => void;
  onRename: (label: string) => void;
  onDelete: () => void;
};

function ChapterTab({ chapter, active, onSelect, onRename, onDelete }: ChapterTabProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: chapter.id,
    });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(chapter.label);

  function commitRename() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== chapter.label) onRename(trimmed);
    else setDraft(chapter.label);
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={cn(
        "flex cursor-grab items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm active:cursor-grabbing",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border",
        isDragging && "z-10 opacity-50",
      )}
    >
      {editing ? (
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") {
              setDraft(chapter.label);
              setEditing(false);
            }
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="h-6 w-24 px-1 py-0 text-xs"
        />
      ) : (
        <button
          type="button"
          onClick={onSelect}
          onDoubleClick={() => setEditing(true)}
          className="max-w-32 truncate"
        >
          {chapter.label}
        </button>
      )}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onDelete}
        aria-label={`Delete chapter ${chapter.label}`}
        className="opacity-60 hover:opacity-100"
      >
        <XIcon className="size-3.5" />
      </button>
    </div>
  );
}

type ChapterTabsProps = {
  chapters: EditorChapter[];
  activeChapterId: string;
  onSelect: (chapterId: string) => void;
  onRename: (chapterId: string, label: string) => void;
  onDelete: (chapterId: string) => void;
  onCreate: () => void;
  onReorder: (chapterIds: string[]) => void;
};

export function ChapterTabs({
  chapters,
  activeChapterId,
  onSelect,
  onRename,
  onDelete,
  onCreate,
  onReorder,
}: ChapterTabsProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = chapters.findIndex((c) => c.id === active.id);
    const newIndex = chapters.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(chapters, oldIndex, newIndex).map((c) => c.id));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-wrap items-center gap-2">
        <SortableContext
          items={chapters.map((c) => c.id)}
          strategy={horizontalListSortingStrategy}
        >
          {chapters.map((chapter) => (
            <ChapterTab
              key={chapter.id}
              chapter={chapter}
              active={chapter.id === activeChapterId}
              onSelect={() => onSelect(chapter.id)}
              onRename={(label) => onRename(chapter.id, label)}
              onDelete={() => onDelete(chapter.id)}
            />
          ))}
        </SortableContext>
        <Button type="button" variant="outline" size="sm" onClick={onCreate}>
          <PlusIcon className="size-4" />
          Chapter
        </Button>
      </div>
    </DndContext>
  );
}
