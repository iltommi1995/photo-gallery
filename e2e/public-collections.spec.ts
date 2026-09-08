import { expect, test } from "@playwright/test";

test("places group photos by location while albums retain their curated chapters", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.getByRole("link", { name: "Places", exact: true })).toHaveAttribute(
    "href",
    "/places",
  );
  await page.getByRole("link", { name: "Albums", exact: true }).click();
  await expect(page).toHaveURL(/\/albums$/);
  await page.locator('a[href="/albums/milan"]').click();
  await expect(page).toHaveURL(/\/albums\/milan$/);
  await expect(page.getByRole("heading", { name: "2018", exact: true })).toBeAttached();

  await page.goto("/places");
  await page.getByRole("link").filter({ hasText: "Milan, Italy" }).click();
  await expect(
    page.getByRole("heading", { name: "Milan, Italy", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("album-scroll-track")).toBeVisible();
  await page.goto("/places/milan");
  await expect(page).toHaveURL(/\/albums\/milan$/);
  const draft = await page.goto("/albums/dresden");
  expect(draft?.status()).toBe(404);
});
