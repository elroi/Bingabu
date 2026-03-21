/**
 * As a host using a screen reader, I want the current ball to be announced when it changes
 * so I can call numbers without staring at one spot.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const bingoHtml = readFileSync(join(__dirname, "bingo.html"), "utf-8");

describe("host caller board (bingo.html) accessibility", () => {
  it("exposes #current-number as a polite live region", () => {
    const m = bingoHtml.match(/id="current-number"[^>]*>/);
    expect(m, "current-number element").toBeTruthy();
    const tag = m[0];
    expect(tag).toMatch(/aria-live="polite"/);
    expect(tag).toMatch(/aria-atomic="true"/);
  });

  it("uses a named dialog for the play guide overlay (non-modal coachmarks)", () => {
    const m = bingoHtml.match(/id="play-wizard-overlay"[^>]*>/);
    expect(m).toBeTruthy();
    const tag = m[0];
    expect(tag).toMatch(/role="dialog"/);
    expect(tag).toMatch(/aria-modal="false"/);
    expect(tag).toMatch(/aria-labelledby="play-wizard-title"/);
  });

  it("uses distinct ids for setup vs play Show guide wrappers", () => {
    expect(bingoHtml).toContain('id="host-setup-wizard-show-again-wrap"');
    expect(bingoHtml).toContain('id="host-play-wizard-show-again-wrap"');
  });
});
