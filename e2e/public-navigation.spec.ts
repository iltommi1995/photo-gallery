import { expect, test } from "@playwright/test";

test.describe("public album horizontal scroll", () => {
  test("desktop: vertical wheel input moves the track horizontally", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/albums/milan");

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
    await page.goto("/albums/milan");

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
    await page.goto("/albums/milan");

    await page.locator("figure [role='button']").first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText(/^\d+ \/ \d+$/)).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("mobile viewport falls back to a normal vertical stack", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/albums/milan");

    const track = page.getByTestId("album-scroll-track");
    const overflowX = await track.evaluate((el) => getComputedStyle(el).overflowX);
    expect(overflowX).not.toBe("auto");

    // Scroll past the fullscreen cover using the native mobile vertical layout.
    await page.getByRole("heading", { name: "2018" }).scrollIntoViewIfNeeded();
    await expect(page.getByRole("heading", { name: "2018" })).toBeInViewport({
      ratio: 0,
    });
  });
});

test("album opens on its cover and wheel scrolling stops between sections", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/albums");
  await page.locator('a[href="/albums/milan"]').click();
  const track = page.getByTestId("album-scroll-track");
  await expect(track).toBeVisible();
  // Regression: the old timer enabled snapping after 1000ms and skipped the hero.
  await page.waitForTimeout(1500);
  expect(await track.evaluate((el) => el.scrollLeft)).toBe(0);
  await expect(
    page.getByRole("heading", { name: "Milan", exact: true }),
  ).toBeInViewport();
  expect(await track.evaluate((el) => getComputedStyle(el).scrollSnapType)).toBe("none");

  await track.hover();
  await page.mouse.wheel(0, 180);
  await expect.poll(() => track.evaluate((el) => el.scrollLeft)).toBeCloseTo(180, 0);
  await page.waitForTimeout(1200);
  expect(await track.evaluate((el) => el.scrollLeft)).toBeCloseTo(180, 0);
  await page.mouse.wheel(0, 120);
  await expect.poll(() => track.evaluate((el) => el.scrollLeft)).toBeCloseTo(300, 0);
  await page.mouse.wheel(0, -100);
  await expect.poll(() => track.evaluate((el) => el.scrollLeft)).toBeCloseTo(200, 0);

  await page.mouse.wheel(150, 0);
  await expect.poll(() => track.evaluate((el) => el.scrollLeft)).toBeCloseTo(350, 0);
  await page.mouse.wheel(0, 100);
  await expect.poll(() => track.evaluate((el) => el.scrollLeft)).toBeCloseTo(450, 0);
});

test("progress follows every frame while wheel input is still arriving", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/albums/milan");
  const samples = await page.getByTestId("album-scroll-track").evaluate(async (track) => {
    const bar = document.querySelector<HTMLElement>('[role="progressbar"]')!;
    const fill = bar.firstElementChild as HTMLElement;
    const samples: { actual: number; shown: number; aria: number }[] = [];
    for (let frame = 0; frame < 40; frame++) {
      track.dispatchEvent(
        new WheelEvent("wheel", { deltaY: 20, bubbles: true, cancelable: true }),
      );
      await new Promise(requestAnimationFrame);
      const max = track.scrollWidth - track.clientWidth;
      samples.push({
        actual: track.scrollLeft / max,
        shown: fill.getBoundingClientRect().width / bar.getBoundingClientRect().width,
        aria: Number(bar.getAttribute("aria-valuenow")),
      });
    }
    return samples;
  });
  expect(samples.filter((sample) => sample.shown > 0).length).toBeGreaterThan(30);
  expect(samples.at(-1)!.shown).toBeGreaterThan(samples[5].shown);
  for (const sample of samples) {
    expect(Math.abs(sample.shown - sample.actual)).toBeLessThan(0.002);
    expect(sample.aria).toBe(Math.round(sample.actual * 100));
  }
});
