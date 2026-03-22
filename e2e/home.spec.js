import { test, expect } from "./fixtures.js";
import { resetHostStorage, gotoDomReady } from "./helpers.js";

test.describe("Home entry points", () => {
  test.beforeEach(async ({ context }) => {
    await resetHostStorage(context);
  });

  test("host and join CTAs reach bingo and join pages", async ({ page }) => {
    await gotoDomReady(page, "/index.html");
    await page.locator("#home-host-btn").click();
    await expect(page).toHaveURL(/\/bingo(\.html)?(\?.*)?$/);
    await gotoDomReady(page, "/index.html");
    await page.locator("#home-join-btn").click();
    await expect(page).toHaveURL(/\/join(\.html)?(\?.*)?$/);
  });

  test("legal links target privacy and terms", async ({ page }) => {
    await gotoDomReady(page, "/index.html");
    await expect(page.locator('footer a[href="privacy.html"]').first()).toHaveAttribute("href", "privacy.html");
    await expect(page.locator('footer a[href="terms.html"]').first()).toHaveAttribute("href", "terms.html");
  });
});
