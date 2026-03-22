import { test, expect } from "./fixtures.js";
import { resetHostStorage, gotoDomReady, setParticipantCount } from "./helpers.js";

test.describe("Print cards link", () => {
  test.beforeEach(async ({ context }) => {
    await resetHostStorage(context);
  });

  test("play view exposes print link and cards page loads", async ({ page }) => {
    await gotoDomReady(page, "/bingo.html");
    await setParticipantCount(page, 1);
    await page.locator("#host-start-game-btn").click();
    await expect(page.locator("#host-play-view")).toBeVisible();
    const printLink = page.locator("a.print-cards-link[href='cards.html']");
    await expect(printLink).toBeVisible();
    await printLink.click();
    const cardsPage = await page.waitForEvent("popup");
    await cardsPage.waitForLoadState("domcontentloaded");
    await expect(cardsPage.locator("#main-content")).toBeVisible();
  });
});
