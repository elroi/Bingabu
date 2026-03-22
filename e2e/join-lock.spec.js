import { test, expect } from "./fixtures.js";
import {
  resetHostStorage,
  blockGoogleFonts,
  gotoDomReady,
  setParticipantCount,
  waitForRemotePlayCreateVisible,
} from "./helpers.js";

test.describe("Join lock", () => {
  test("blocks claiming another devices occupied slot when lock is on", async ({ browser }) => {
    const hostContext = await browser.newContext();
    const playerContext = await browser.newContext();
    await blockGoogleFonts(hostContext);
    await blockGoogleFonts(playerContext);
    await resetHostStorage(hostContext);

    const hostPage = await hostContext.newPage();
    await gotoDomReady(hostPage, "/bingo.html");
    await setParticipantCount(hostPage, 1);
    await waitForRemotePlayCreateVisible(hostPage);
    await hostPage.locator("#remote-play-create-btn").click();
    await hostPage.locator("#remote-play-active").waitFor({ state: "visible", timeout: 20_000 });
    const roomId = (await hostPage.locator("#remote-play-code").textContent()).trim();
    await hostPage.locator("#remote-play-lock-joins").check({ force: true });
    await hostPage.locator("#host-start-game-btn").click();
    await hostPage.locator("#host-play-view").waitFor({ state: "visible" });

    const playerPage = await playerContext.newPage();
    await gotoDomReady(playerPage, `/join.html?join=${roomId}`);
    await playerPage.locator("#btn-code").click();
    await playerPage.locator("#slot-list").locator("li:not(.taken) button").first().click();
    await playerPage.waitForURL(/player\.html/);

    const res = await playerPage.request.post(`/api/rooms/${roomId}/claim`, {
      data: { slotIndex: 0, deviceId: "e2e-intruder-device" },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(403);

    await hostContext.close();
    await playerContext.close();
  });
});
