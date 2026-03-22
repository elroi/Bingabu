/**
 * Shared Playwright helpers for Bingabu E2E (local `vercel dev`).
 */

const GOOGLE_FONT_RE = /https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/;

/** Avoid hanging on `load` while waiting for Google Fonts (pages stay usable). */
export async function blockGoogleFonts(context) {
  await context.route(GOOGLE_FONT_RE, (route) => route.abort());
}

function pathNeedsLocaleReady(path) {
  const p = path.split("?")[0].toLowerCase();
  return (
    /\/bingo(\.html)?$/i.test(p) ||
    /\/join(\.html)?$/i.test(p) ||
    /^\/j\//i.test(p) ||
    /\/player(\.html)?$/i.test(p) ||
    /\/spectator(\.html)?$/i.test(p)
  );
}

const APP_BOOT_SETTLE_MS = 1200;

/**
 * `bingo` / `join` / etc. use `type="module"` + `await initI18n()`; `domcontentloaded` is too early
 * for `#num-participants` listeners. A short settle keeps E2E fast vs `load` + hung third-party assets.
 */
export async function gotoDomReady(page, path) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  if (pathNeedsLocaleReady(path)) {
    await new Promise((r) => setTimeout(r, APP_BOOT_SETTLE_MS));
  }
}

/** Remote panel only enables Create after `/api/health` succeeds. */
export async function waitForRemotePlayCreateVisible(page) {
  await page.waitForFunction(() => {
    const wrap = document.getElementById("remote-play-create");
    const btn = document.getElementById("remote-play-create-btn");
    return wrap && btn && !wrap.classList.contains("hidden");
  }, { timeout: 25_000 });
}

export async function setParticipantCount(page, n) {
  const loc = page.locator("#num-participants");
  await loc.waitFor({ state: "visible", timeout: 15_000 });
  await loc.evaluate((el, val) => {
    el.value = String(val);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, n);
}

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
  await setParticipantCount(hostPage, 2);
  await waitForRemotePlayCreateVisible(hostPage);
  await hostPage.locator("#remote-play-create-btn").click();
  await hostPage.locator("#remote-play-active").waitFor({ state: "visible", timeout: 20_000 });
  const roomId = (await hostPage.locator("#remote-play-code").textContent()).trim();
  if (!/^[A-Z0-9]{6}$/.test(roomId)) {
    throw new Error(`Expected 6-char room id, got "${roomId}"`);
  }
  await hostPage.locator("#host-start-game-btn").click();
  await hostPage.locator("#host-play-view").waitFor({ state: "visible" });
  const hostId = await hostPage.evaluate(() => sessionStorage.getItem("bingabu-remote-hostId"));
  return { roomId, hostId };
}
