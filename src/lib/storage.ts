import { randomUUID } from "node:crypto";
import path from "node:path";

export const STORAGE_DIR = process.env.STORAGE_DIR ?? "./storage";
export const PHOTOS_DIR = path.join(STORAGE_DIR, "photos");

export function newPhotoId() {
  return randomUUID();
}

export function photoDir(photoId: string) {
  return path.join(PHOTOS_DIR, photoId);
}

/** Extension for the preserved original file — kept distinct from the
 * always-JPEG derived variants so we don't mislabel a PNG/TIFF upload. */
export function photoPaths(photoId: string, originalExt: string = "jpg") {
  const dir = photoDir(photoId);
  return {
    dir,
    original: path.join(dir, `original.${originalExt}`),
    full: path.join(dir, "full.jpg"),
    medium: path.join(dir, "medium.jpg"),
    thumbnail: path.join(dir, "thumbnail.jpg"),
  };
}
