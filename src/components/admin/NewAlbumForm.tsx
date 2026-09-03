"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function NewAlbumForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/admin/albums", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim() }),
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error("Could not create album");
      return;
    }
    const { album } = await res.json();
    router.push(`/admin/albums/${album.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <Input
        placeholder="New album title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-56"
      />
      <Button type="submit" disabled={submitting || !title.trim()}>
        Create album
      </Button>
    </form>
  );
}
