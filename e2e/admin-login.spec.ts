import { expect, test } from "@playwright/test";

import { adminCredentials, loginAsAdmin } from "./helpers";

test.describe("admin login", () => {
  test("redirects unauthenticated visitors from /admin to /admin/login", async ({
    page,
  }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("rejects an incorrect password", async ({ page }) => {
    const { email } = adminCredentials();
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("definitely-not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Invalid email or password.")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("signs in with the seeded admin and can sign out", async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/admin\/login/);

    // Session is really gone, not just a client-side redirect.
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
