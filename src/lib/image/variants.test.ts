import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { generateImageVariants } from "./variants";

describe("generateImageVariants", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "photo-gallery-variants-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("writes all three size variants and reports source dimensions", async () => {
    const source = await sharp({
      create: { width: 3000, height: 2000, channels: 3, background: "#336699" },
    })
      .jpeg()
      .toBuffer();

    const paths = {
      thumbnail: path.join(dir, "thumbnail.jpg"),
      medium: path.join(dir, "medium.jpg"),
      full: path.join(dir, "full.jpg"),
    };

    const result = await generateImageVariants(source, paths);

    expect(result.width).toBe(3000);
    expect(result.height).toBe(2000);
    expect(result.blurDataUrl).toMatch(/^data:image\/jpeg;base64,/);

    for (const p of Object.values(paths)) {
      await expect(access(p)).resolves.toBeUndefined();
    }

    const thumbMeta = await sharp(paths.thumbnail).metadata();
    const mediumMeta = await sharp(paths.medium).metadata();
    const fullMeta = await sharp(paths.full).metadata();
    expect(thumbMeta.width).toBe(480);
    expect(mediumMeta.width).toBe(1600);
    expect(fullMeta.width).toBe(2400);
  });

  it("never enlarges an image smaller than a target size", async () => {
    const source = await sharp({
      create: { width: 300, height: 200, channels: 3, background: "#996633" },
    })
      .jpeg()
      .toBuffer();

    const paths = {
      thumbnail: path.join(dir, "thumbnail.jpg"),
      medium: path.join(dir, "medium.jpg"),
      full: path.join(dir, "full.jpg"),
    };

    await generateImageVariants(source, paths);

    const mediumMeta = await sharp(paths.medium).metadata();
    const fullMeta = await sharp(paths.full).metadata();
    expect(mediumMeta.width).toBe(300);
    expect(fullMeta.width).toBe(300);
  });
});
