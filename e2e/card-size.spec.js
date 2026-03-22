import { test, expect } from "@playwright/test";
import { resetHostStorage, setHostCardSize, createRoomAndStartPlay } from "./helpers.js";

test.describe("Variable card size", () => {
  test("host setup: 4×4 yields 16 cells per participant card", async ({ browser }) => {
    const hostContext = await browser.newContext();
    await resetHostStorage(hostContext);
    const hostPage = await hostContext.newPage();
    await hostPage.goto("/bingo.html");
    await setHostCardSize(hostPage, 4);
    await hostPage.locator("#num-participants").fill("1");
    await hostPage.locator("#num-participants").dispatchEvent("input");
    const grid = hostPage.locator('[data-testid="host-participant-card-grid"]').first();
    await expect(grid.locator(".card-cell")).toHaveCount(16);
    await hostContext.close();
  });

  test("remote player sees same grid size as host (4×4)", async ({ browser }) => {
    const hostContext = await browser.newContext();
    const playerContext = await browser.newContext();
    await resetHostStorage(hostContext);

    const hostPage = await hostContext.newPage();
    await hostPage.goto("/bingo.html");
    await setHostCardSize(hostPage, 4);
    await hostPage.locator("#num-participants").fill("2");
    await hostPage.locator("#num-participants").dispatchEvent("input");

    const { roomId } = await createRoomAndStartPlay(hostPage);

    const playerPage = await playerContext.newPage();
    await playerPage.goto(`/join.html?join=${roomId}`);
    await playerPage.locator("#btn-code").click();
    await playerPage.locator("#slot-list").locator("li:not(.taken) button").first().click();
    await playerPage.waitForURL(/player\.html/);
    await expect(playerPage.getByTestId("player-card-grid")).toBeVisible();
    await expect(playerPage.getByTestId("player-card-grid").locator('[role="gridcell"]')).toHaveCount(16);

    await hostContext.close();
    await playerContext.close();
  });
});
