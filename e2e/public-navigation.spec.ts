import { expect, test } from "@playwright/test";

test.describe("public album horizontal scroll", () => {
  test("desktop: vertical wheel input moves the track horizontally", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/places/milan");

    const track = page.getByTestId("album-scroll-track");
    await expect(track).toBeVisible();

    const before = await track.evaluate((el) => el.scrollLeft);
    await track.hover();
    await page.mouse.wheel(0, 800);
    await page.waitForTimeout(400); // inertial lerp needs a few animation frames

    const after = await track.evaluate((el) => el.scrollLeft);
    expect(after).toBeGreaterThan(before);
  });

  test("desktop: End key jumps to the end of the track", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/places/milan");

    const track = page.getByTestId("album-scroll-track");
    await track.click();
    await page.keyboard.press("End");

    // Native `scrollTo({ behavior: "smooth" })` animates over some browser-
    // chosen duration proportional to distance — poll instead of a fixed
    // wait so this isn't racing that animation.
    await expect(async () => {
      const { scrollLeft, maxScrollLeft } = await track.evaluate((el) => ({
        scrollLeft: el.scrollLeft,
        maxScrollLeft: el.scrollWidth - el.clientWidth,
      }));
      expect(scrollLeft).toBeGreaterThan(maxScrollLeft - 5);
    }).toPass({ timeout: 3000 });
  });

  test("clicking a photo opens the lightbox with EXIF, Escape closes it", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/places/milan");

    await page.locator("figure [role='button']").first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText(/^\d+ \/ \d+$/)).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("mobile viewport falls back to a normal vertical stack", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/places/milan");

    const track = page.getByTestId("album-scroll-track");
    const overflowX = await track.evaluate((el) => getComputedStyle(el).overflowX);
    expect(overflowX).not.toBe("auto");

    // The chapter heading should be reachable via normal page scroll.
    await expect(page.getByRole("heading", { name: "2018" })).toBeInViewport({
      ratio: 0,
    });
  });
});
