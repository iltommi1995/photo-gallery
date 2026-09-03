import { expect, test, type Page } from "@playwright/test";

import { generateTestPhoto } from "./fixtures/generate-test-photo";
import { loginAsAdmin } from "./helpers";

/** dnd-kit's PointerSensor listens for native pointer events, not the HTML5
 * drag-and-drop API — Playwright's own `dragTo` doesn't trigger it, so this
 * simulates the pointer sequence by hand (movement past the 4px activation
 * distance configured on the sensor, then a pause for the sensor to react). */
async function dragBoundingBoxTo(
  page: Page,
  from: { x: number; y: number; width: number; height: number },
  to: { x: number; y: number; width: number; height: number },
) {
  const start = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
  const end = { x: to.x + to.width / 2, y: to.y + to.height / 2 };
  const steps = 12;

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.waitForTimeout(100); // let the PointerSensor register pointerdown

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    await page.mouse.move(
      start.x + (end.x - start.x) * t,
      start.y + (end.y - start.y) * t,
    );
    await page.waitForTimeout(30); // yield a frame so dnd-kit's move handler runs
  }

  await page.waitForTimeout(100);
  await page.mouse.up();
}

test("create an album, add a chapter, upload a photo, and place it on the canvas", async ({
  page,
}) => {
  test.slow(); // real upload + image processing + drag interaction

  await loginAsAdmin(page);

  // --- Upload a photo -----------------------------------------------------
  const { filePath, filename } = await generateTestPhoto();
  await page.goto("/admin/photos");
  await page.locator('input[type="file"]').setInputFiles(filePath);
  await expect(page.getByText("Done")).toBeVisible({ timeout: 15_000 });

  // --- Create an album ------------------------------------------------
  const albumTitle = `E2E Album ${Date.now()}`;
  await page.goto("/admin/albums");
  await page.getByPlaceholder("New album title").fill(albumTitle);
  await page.getByRole("button", { name: "Create album" }).click();
  await expect(page).toHaveURL(/\/admin\/albums\/[^/]+$/);

  // --- Create the first chapter ---------------------------------------
  await page.getByRole("button", { name: "Create first chapter" }).click();
  await expect(page.getByText("Chapter 1")).toBeVisible();

  // --- Drag the uploaded photo from the library onto the canvas -------
  await page.getByPlaceholder("Search…").fill(filename);
  const libraryItem = page.locator(`button[title="${filename}"]`);
  await expect(libraryItem).toBeVisible();

  const dropzone = page.getByTestId("chapter-canvas-dropzone");
  const [sourceBox, targetBox] = await Promise.all([
    libraryItem.boundingBox(),
    dropzone.boundingBox(),
  ]);
  if (!sourceBox || !targetBox) throw new Error("Could not measure drag source/target");
  await dragBoundingBoxTo(page, sourceBox, targetBox);

  await expect(page.getByLabel("Set size MEDIUM")).toBeVisible({ timeout: 10_000 });
  // Exact match: getByText("Saved") would also match "Unsaved changes"
  // (case-insensitive substring), producing a false-positive pass before
  // the debounced save has actually fired.
  await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 10_000 });

  // --- Reload and confirm the placement persisted ----------------------
  await page.reload();
  await expect(page.getByLabel("Remove from chapter")).toBeVisible();

  // --- Live preview renders the same placement via ChapterMosaic -------
  await page.getByRole("tab", { name: "Live preview" }).click();
  await expect(page.locator("figure img")).toHaveCount(1);
});
