import { test, expect } from "./fixtures.js";
import { resetHostStorage, createRoomAndStartPlay, blockGoogleFonts, gotoDomReady } from "./helpers.js";

test.describe("Remote room: player sync", () => {
  test("join → claim slot → host draw updates player current number", async ({ browser }) => {
    const hostContext = await browser.newContext();
    const playerContext = await browser.newContext();
    await blockGoogleFonts(hostContext);
    await blockGoogleFonts(playerContext);
    await resetHostStorage(hostContext);

    const hostPage = await hostContext.newPage();
    await gotoDomReady(hostPage, "/bingo.html");

    const { roomId } = await createRoomAndStartPlay(hostPage);

    const playerPage = await playerContext.newPage();
    await gotoDomReady(playerPage, `/join.html?join=${roomId}`);
    await playerPage.locator("#btn-code").click();
    await playerPage.locator("#slot-list").locator("li:not(.taken) button").first().click();
    await playerPage.waitForURL(/player\.html/);
    await expect(playerPage.locator("#player-card")).toBeVisible();

    const before = (await playerPage.locator("#current-number").textContent()).trim();
    await hostPage.locator("#draw-btn").click();
    await expect.poll(async () => (await playerPage.locator("#current-number").textContent()).trim(), {
      timeout: 20_000,
    }).not.toBe(before);

    await hostContext.close();
    await playerContext.close();
  });

  test("/j/:code rewrite opens join flow", async ({ browser }) => {
    const hostContext = await browser.newContext();
    await blockGoogleFonts(hostContext);
    await resetHostStorage(hostContext);
    const hostPage = await hostContext.newPage();
    await gotoDomReady(hostPage, "/bingo.html");
    const { roomId } = await createRoomAndStartPlay(hostPage);

    const joinPage = await hostContext.newPage();
    await gotoDomReady(joinPage, `/j/${roomId}`);
    await expect(joinPage).toHaveURL(new RegExp(`join.*[?&]join=${roomId}`, "i"));
    await hostContext.close();
  });
});
