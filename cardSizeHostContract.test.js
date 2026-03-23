/**
 * User stories:
 * - As a maintainer, I want host HTML to stay wired to card-size calling helpers so regressions are caught in CI.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

describe("Host card-size calling (HTML contract)", () => {
  it("bingo.html imports cardSizeCalling and uses size-aware pool / finish logic", () => {
    const html = readFileSync(join(__dirname, "bingo.html"), "utf8");
    expect(html).toMatch(/from\s+["']\.\/cardSizeCalling\.js["']/);
    expect(html).toMatch(/maxBallIdForSquareCardSize/);
    expect(html).toMatch(/formatCurrentCallForDisplay/);
    expect(html).toMatch(/availableNumbersAfterDraws/);
  });

  it("player.html and spectator.html format current call via cardSizeCalling", () => {
    for (const f of ["player.html", "spectator.html"]) {
      const html = readFileSync(join(__dirname, f), "utf8");
      expect(html).toMatch(/from\s+["']\.\/cardSizeCalling\.js["']/);
      expect(html).toMatch(/formatCurrentCallForDisplay/);
    }
  });
});
