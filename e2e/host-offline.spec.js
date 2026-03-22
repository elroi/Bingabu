import { test, expect } from "./fixtures.js";
import { resetHostStorage, gotoDomReady, setParticipantCount } from "./helpers.js";

test.describe("Host offline flow", () => {
  test.beforeEach(async ({ context }) => {
    await resetHostStorage(context);
  });

  test("setup → start game → draw updates current number", async ({ page }) => {
    await gotoDomReady(page, "/bingo.html");
    await setParticipantCount(page, 2);
    await expect(page.locator("#host-start-game-btn")).toBeEnabled();
    await page.locator("#host-start-game-btn").click();
    await expect(page.locator("#host-play-view")).toBeVisible();
    await expect(page.locator("#host-setup-view")).toBeHidden();
    await expect(page.locator("#draw-btn")).toBeEnabled();
    await expect(page.locator("#current-number")).toHaveText(/--/);
    await page.locator("#draw-btn").click();
    await expect(page.locator("#current-number")).not.toHaveText(/--/);
  });

  test("new game after draw asks confirm and returns to setup", async ({ page }) => {
    await gotoDomReady(page, "/bingo.html");
    await setParticipantCount(page, 1);
    await page.locator("#host-start-game-btn").click();
    await page.locator("#draw-btn").click();
    await expect(page.locator("#current-number")).not.toHaveText(/--/);
    page.once("dialog", (d) => d.accept());
    await page.locator("#new-game-btn").click();
    await expect(page.locator("#host-setup-view")).toBeVisible();
    await expect(page.locator("#host-play-view")).toBeHidden();
  });
});
