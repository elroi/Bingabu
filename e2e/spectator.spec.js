import { test, expect } from "./fixtures.js";
import { resetHostStorage, createRoomAndStartPlay, blockGoogleFonts, gotoDomReady } from "./helpers.js";

test.describe("Spectator flow", () => {
  test("watch only follows host draws", async ({ browser }) => {
    const hostContext = await browser.newContext();
    const spectatorContext = await browser.newContext();
    await blockGoogleFonts(hostContext);
    await blockGoogleFonts(spectatorContext);
    await resetHostStorage(hostContext);

    const hostPage = await hostContext.newPage();
    await gotoDomReady(hostPage, "/bingo.html");
    const { roomId } = await createRoomAndStartPlay(hostPage);

    const specPage = await spectatorContext.newPage();
    await gotoDomReady(specPage, `/join.html?join=${roomId}`);
    await specPage.locator("#btn-code").click();
    await expect(specPage.locator("#step-pick")).toBeVisible();
    await specPage.locator("#btn-watch-only").click();
    await specPage.waitForURL(/spectator\.html/);
    await expect(specPage.locator("#current-number")).toBeVisible();

    const before = (await specPage.locator("#current-number").textContent()).trim();
    await hostPage.locator("#draw-btn").click();
    await expect.poll(async () => (await specPage.locator("#current-number").textContent()).trim(), {
      timeout: 20_000,
    }).not.toBe(before);

    await hostContext.close();
    await spectatorContext.close();
  });
});
