"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadIcon } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type FileStatus = {
  id: string;
  name: string;
  progress: number;
  state: "uploading" | "done" | "error";
  error?: string;
};

function uploadOne(file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/photos");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable)
        onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      try {
        const body = JSON.parse(xhr.responseText);
        const firstError = body.results?.find((r: { ok: boolean }) => !r.ok)?.error;
        reject(new Error(firstError ?? `Upload failed (${xhr.status})`));
      } catch {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error"));

    const formData = new FormData();
    formData.append("files", file);
    xhr.send(formData);
  });
}

export function PhotoUploadZone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileStatus[]>([]);
  const [dragOver, setDragOver] = useState(false);

  async function handleFiles(fileList: FileList) {
    const incoming = Array.from(fileList).map((file) => ({
      id: `${file.name}-${crypto.randomUUID()}`,
      name: file.name,
      progress: 0,
      state: "uploading" as const,
      file,
    }));
    setFiles((prev) => [...prev, ...incoming]);

    await Promise.all(
      incoming.map(async ({ id, file }) => {
        try {
          await uploadOne(file, (progress) =>
            setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, progress } : f))),
          );
          setFiles((prev) =>
            prev.map((f) => (f.id === id ? { ...f, progress: 100, state: "done" } : f)),
          );
        } catch (error) {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === id
                ? {
                    ...f,
                    state: "error",
                    error: error instanceof Error ? error.message : "Upload failed",
                  }
                : f,
            ),
          );
        }
      }),
    );

    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) void handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-10 text-center transition-colors",
          dragOver ? "border-primary bg-muted" : "border-border",
        )}
      >
        <UploadIcon className="text-muted-foreground size-6" />
        <p className="text-sm">Drag photos here, or click to browse</p>
        <p className="text-muted-foreground text-xs">
          JPEG, PNG, or TIFF · up to 40MB each
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/tiff"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {files.length > 0 && (
        <ul className="flex flex-col gap-2">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-3 text-sm">
              <span className="w-48 truncate">{f.name}</span>
              <Progress value={f.progress} className="h-1.5 flex-1" />
              <span
                className={cn(
                  "w-16 shrink-0 text-xs",
                  f.state === "error" && "text-destructive",
                  f.state === "done" && "text-muted-foreground",
                )}
              >
                {f.state === "error"
                  ? "Failed"
                  : f.state === "done"
                    ? "Done"
                    : `${f.progress}%`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
