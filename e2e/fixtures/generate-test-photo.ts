import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import sharp from "sharp";

/** Generates a small real JPEG (with a plausible EXIF Make/Model) for E2E
 * upload tests, so we don't commit a binary fixture to the repo. The
 * filename embeds a unique id — the E2E database isn't reset between runs,
 * so a fixed filename would collide with a previous run's leftover upload. */
export async function generateTestPhoto(): Promise<{
  filePath: string;
  filename: string;
}> {
  const dir = await mkdtemp(path.join(tmpdir(), "photo-gallery-e2e-"));
  const filename = `e2e-test-photo-${Date.now()}.jpg`;
  const filePath = path.join(dir, filename);

  const svg = Buffer.from(
    `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#446688" />
    </svg>`,
  );

  const buffer = await sharp(svg)
    .jpeg()
    .withExifMerge({ IFD0: { Make: "PlaywrightCam", Model: "E2E-1" } })
    .toBuffer();

  await writeFile(filePath, buffer);
  return { filePath, filename };
}
