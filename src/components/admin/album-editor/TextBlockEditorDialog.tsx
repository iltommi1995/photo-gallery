"use client";

import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { BoldIcon, ItalicIcon, LinkIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type TextBlockEditorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialHtml: string;
  onSave: (html: string) => void;
};

/**
 * Rich-text editing surface for a TEXT placement. The toolbar only exposes
 * bold/italic/link — matching what src/lib/sanitize-html.ts allows through
 * on save, so nothing typed here can silently disappear once persisted.
 */
export function TextBlockEditorDialog({
  open,
  onOpenChange,
  initialHtml,
  onSave,
}: TextBlockEditorDialogProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
      }),
      Link.configure({ openOnClick: false, autolink: false }),
    ],
    content: initialHtml,
    immediatelyRender: false,
  });

  // Reset to the placement's current content each time the dialog opens —
  // the editor instance is long-lived (one per canvas item), the content
  // it should show isn't.
  useEffect(() => {
    if (open) editor?.commands.setContent(initialHtml);
  }, [open, initialHtml, editor]);

  function setLink() {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  function handleSave() {
    if (!editor) return;
    onSave(editor.getHTML());
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit text block</DialogTitle>
        </DialogHeader>
        <div className="flex gap-1 border-b pb-2">
          <Button
            type="button"
            size="icon"
            variant={editor?.isActive("bold") ? "default" : "outline"}
            onClick={() => editor?.chain().focus().toggleBold().run()}
            aria-label="Bold"
            aria-pressed={editor?.isActive("bold") ?? false}
          >
            <BoldIcon className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant={editor?.isActive("italic") ? "default" : "outline"}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            aria-label="Italic"
            aria-pressed={editor?.isActive("italic") ?? false}
          >
            <ItalicIcon className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant={editor?.isActive("link") ? "default" : "outline"}
            onClick={setLink}
            aria-label="Link"
            aria-pressed={editor?.isActive("link") ?? false}
          >
            <LinkIcon className="size-4" />
          </Button>
        </div>
        <EditorContent
          editor={editor}
          className={cn(
            "prose-portfolio-text min-h-32 rounded-md border p-3",
            "[&_.ProseMirror]:min-h-28 [&_.ProseMirror]:outline-none",
          )}
        />
        <DialogFooter>
          <Button type="button" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
