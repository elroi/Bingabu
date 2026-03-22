/**
 * As a player who was removed by the host, I want Rejoin to let me pick a seat again
 * so that I am not bounced back to the "removed" screen in a loop.
 *
 * Regression: join.html treats same room + session slot as "already joined" and skips
 * the slot picker, but the server claim was cleared on boot — player.html then shows
 * booted again immediately.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = join(__dirname);

describe("player rejoin after host boot", () => {
  it("player.html clears stored slot when server claim no longer matches device", () => {
    const html = readFileSync(join(repoRoot, "player.html"), "utf-8");
    expect(html).toMatch(
      /myClaim !== deviceId[\s\S]*sessionStorage\.removeItem\(JOIN_STORAGE\.slotIndex\)/
    );
  });

  it("player.html showBooted points Rejoin at join.html with room prefill when roomId is known", () => {
    const html = readFileSync(join(repoRoot, "player.html"), "utf-8");
    expect(html).toMatch(
      /function showBooted\(\)[\s\S]*join\.html\?room=\$\{encodeURIComponent\(roomId\)\}/
    );
  });
});
