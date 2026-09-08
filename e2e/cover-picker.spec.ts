import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "./helpers";
import { generateTestPhoto } from "./fixtures/generate-test-photo";

test("cover picker shows images, loads more and uploads a cover inside the modal", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await loginAsAdmin(page);
  const created = await page.request.post("/api/admin/albums", {
    data: { title: `Cover picker test ${Date.now()}` },
  });
  expect(created.ok()).toBe(true);
  const { album } = await created.json();
  try {
    const firstPage = await (await page.request.get("/api/admin/photos?limit=24")).json();
    await page.goto(`/admin/albums/${album.id}`);
    await page.getByLabel("Cover photo", { exact: true }).click();
    const modal = page.getByRole("dialog", { name: "Choose a photo" });
    await expect(modal).toBeVisible();
    const choices = modal.getByRole("button", { name: /^Select / });
    await expect(choices.first()).toBeVisible();
    if (firstPage.nextCursor) {
      await modal.getByTestId("photo-picker-scroll").evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      await expect.poll(() => choices.count()).toBeGreaterThan(24);
    }
    await modal
      .getByLabel("Search photos", { exact: true })
      .fill("no-matching-photo-xyz");
    await expect(modal.getByText("No photos found.")).toBeVisible();
    const { filePath } = await generateTestPhoto();
    await modal.getByLabel("Upload photo file").setInputFiles(filePath);
    await modal
      .getByLabel("Photo description (alt text)")
      .fill("Cover uploaded from visual picker");
    await modal.getByRole("button", { name: "Upload and select", exact: true }).click();
    await expect(modal).not.toBeVisible({ timeout: 15000 });
    await expect(
      page.getByText("Cover uploaded from visual picker", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Album settings saved", { exact: true })).toBeVisible();
    await page.reload();
    await expect(
      page.getByText("Cover uploaded from visual picker", { exact: true }),
    ).toBeVisible();
    const saved = await (await page.request.get(`/api/admin/albums/${album.id}`)).json();
    expect(saved.album.coverPhotoId).toBeTruthy();
  } finally {
    await page.request.delete(`/api/admin/albums/${album.id}`);
  }
});
