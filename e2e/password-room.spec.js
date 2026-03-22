import { test, expect } from "./fixtures.js";
import {
  resetHostStorage,
  blockGoogleFonts,
  gotoDomReady,
  setParticipantCount,
  waitForRemotePlayCreateVisible,
} from "./helpers.js";

const ROOM_PASSWORD = "e2e-test-room-pw";

async function createPasswordRoomAndStart(hostPage) {
  await setParticipantCount(hostPage, 2);
  await hostPage.locator("#remote-play-password-check").check({ force: true });
  await hostPage.locator("#remote-play-password").fill(ROOM_PASSWORD, { force: true });
  await hostPage.locator("#remote-play-password-confirm").fill(ROOM_PASSWORD, { force: true });
  await waitForRemotePlayCreateVisible(hostPage);
  await hostPage.locator("#remote-play-create-btn").click();
  await hostPage.locator("#remote-play-active").waitFor({ state: "visible", timeout: 20_000 });
  const roomId = (await hostPage.locator("#remote-play-code").textContent()).trim();
  await hostPage.locator("#host-start-game-btn").click();
  await hostPage.locator("#host-play-view").waitFor({ state: "visible" });
  return roomId;
}

test.describe("Password-protected room", () => {
  test("join requires password then slot pick", async ({ browser }) => {
    const hostContext = await browser.newContext();
    const playerContext = await browser.newContext();
    await blockGoogleFonts(hostContext);
    await blockGoogleFonts(playerContext);
    await resetHostStorage(hostContext);

    const hostPage = await hostContext.newPage();
    await gotoDomReady(hostPage, "/bingo.html");
    const roomId = await createPasswordRoomAndStart(hostPage);

    const playerPage = await playerContext.newPage();
    await gotoDomReady(playerPage, `/join.html?join=${roomId}`);
    await playerPage.locator("#btn-code").click();
    await expect(playerPage.locator("#step-password")).toBeVisible();
    await playerPage.locator("#room-password").fill(ROOM_PASSWORD);
    await playerPage.locator("#btn-password").click();
    await expect(playerPage.locator("#step-pick")).toBeVisible();
    await playerPage.locator("#slot-list").locator("li:not(.taken) button").first().click();
    await playerPage.waitForURL(/player\.html/);
    await expect(playerPage.locator("#player-card")).toBeVisible();

    await hostContext.close();
    await playerContext.close();
  });
});
