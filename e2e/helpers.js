/**
 * Shared Playwright helpers for Bingabu E2E (local `vercel dev`).
 */

/** Fresh host session: no saved game or remote room; wizards bypassed. */
export async function resetHostStorage(context) {
  await context.addInitScript(() => {
    try {
      localStorage.removeItem("bingo-manager-state");
      sessionStorage.removeItem("bingabu-host-phase");
      sessionStorage.removeItem("bingabu-remote-roomId");
      sessionStorage.removeItem("bingabu-remote-hostId");
      localStorage.setItem("bingabu-host-onboarding-done", "1");
      localStorage.setItem("bingabu-play-wizard-done", "1");
    } catch (_) {}
  });
}

export async function openFreshHostPage(page, context) {
  await resetHostStorage(context);
  await page.goto("/bingo.html");
}

/** Square grid edge length 3, 4, or 5. Regenerates cards when changed (setup only). */
export async function setHostCardSize(hostPage, n) {
  await hostPage.getByTestId("card-size-select").selectOption(String(n));
}

/**
 * Setup: 2 participants with generated cards (still in setup phase), create online room, start play phase.
 * @returns {Promise<{ roomId: string, hostId: string }>}
 */
export async function createRoomAndStartPlay(hostPage) {
  await hostPage.locator("#num-participants").fill("2");
  await hostPage.locator("#num-participants").dispatchEvent("input");
  await hostPage.locator("#remote-play-create-btn").click();
  await hostPage.locator("#remote-play-active").waitFor({ state: "visible", timeout: 30_000 });
  const roomId = (await hostPage.locator("#remote-play-code").textContent()).trim();
  if (!/^[A-Z0-9]{6}$/.test(roomId)) {
    throw new Error(`Expected 6-char room id, got "${roomId}"`);
  }
  await hostPage.locator("#host-start-game-btn").click();
  await hostPage.locator("#host-play-view").waitFor({ state: "visible" });
  const hostId = await hostPage.evaluate(() => sessionStorage.getItem("bingabu-remote-hostId"));
  return { roomId, hostId };
}
