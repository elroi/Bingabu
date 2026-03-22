/**
 * As a maintainer, I want second-pass UX fixes reflected in markup and locales
 * so regressions are caught in CI.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = join(__dirname);

function readJson(name) {
  return JSON.parse(readFileSync(join(repoRoot, "locales", name), "utf-8"));
}

describe("second-pass UX: locales", () => {
  const keys = [
    "a11y.skipToMain",
    "player.bingo.row",
    "player.bingo.col",
    "player.bingo.diagMain",
    "player.bingo.diagAnti",
    "player.card.aria",
    "player.card.free",
    "player.card.colB",
    "player.card.colI",
    "player.card.colN",
    "player.card.colG",
    "player.card.colO",
    "player.error.hostSessionJoinLink",
    "player.error.hostSessionHostLink",
    "spectator.history.aria",
    "spectator.status.reconnecting",
    "join.qr.dialogTitle",
    "player.standings.regionAria",
    "player.standings.leader",
    "player.standings.youRank",
  ];

  it.each(keys)("%s exists in en and he", (k) => {
    const en = readJson("en.json");
    const he = readJson("he.json");
    expect(String(en[k]).trim().length, `en ${k}`).toBeGreaterThan(0);
    expect(String(he[k]).trim().length, `he ${k}`).toBeGreaterThan(0);
  });
});

describe("second-pass UX: HTML contracts", () => {
  it("player.html uses main landmark and keyboard-friendly card attributes", () => {
    const html = readFileSync(join(repoRoot, "player.html"), "utf-8");
    expect(html).toMatch(/<main[^>]*id="main-content"/);
    expect(html).toMatch(/getBingoLines/);
    expect(html).toMatch(/player\.bingo\.row/);
    expect(html).toMatch(/aria-pressed=/);
    expect(html).toMatch(/toggleDaubFromCell/);
  });

  it("player.html exposes score standings (leader + rank) wired to bingoScoring", () => {
    const html = readFileSync(join(repoRoot, "player.html"), "utf-8");
    expect(html).toMatch(/id="player-standings"/);
    expect(html).toMatch(/data-i18n="player\.standings\.regionAria"/);
    expect(html).toMatch(/rankParticipantsForStandings/);
    expect(html).toMatch(
      /id="player-standings"[^>]*aria-live="polite"[^>]*aria-atomic="true"/
    );
  });

  it("spectator.html has main, stream status, and i18n history aria", () => {
    const html = readFileSync(join(repoRoot, "spectator.html"), "utf-8");
    expect(html).toMatch(/<main[^>]*id="main-content"/);
    expect(html).toMatch(/id="spec-stream-status"/);
    expect(html).toMatch(/spectator\.history\.aria/);
    expect(html).toMatch(/setStreamReconnecting/);
    expect(html).toMatch(
      /id="current-number"[^>]*aria-live="polite"[^>]*aria-atomic="true"/
    );
  });

  it("join.html QR overlay is a labelled dialog inside main", () => {
    const html = readFileSync(join(repoRoot, "join.html"), "utf-8");
    expect(html).toMatch(/<main[^>]*id="main-content"/);
    expect(html).toMatch(/id="qr-scanner-wrap"[^>]*role="dialog"/);
    expect(html).toMatch(/aria-labelledby="qr-scanner-title"/);
    expect(html).toMatch(/id="qr-scanner-title"/);
  });

  it("bingo.html and cards.html include main#main-content", () => {
    const bingo = readFileSync(join(repoRoot, "bingo.html"), "utf-8");
    const cards = readFileSync(join(repoRoot, "cards.html"), "utf-8");
    expect(bingo).toMatch(/<main[^>]*id="main-content"/);
    expect(cards).toMatch(/<main[^>]*id="main-content"/);
  });

  it("index.html home wizard uses dialog role", () => {
    const html = readFileSync(join(repoRoot, "index.html"), "utf-8");
    expect(html).toMatch(/id="home-wizard-overlay"[^>]*role="dialog"/);
    expect(html).toMatch(/homeWizardReturnFocus/);
  });

  it("busy pages expose skip-to-main targeting #main-content", () => {
    const pages = [
      "bingo.html",
      "join.html",
      "player.html",
      "spectator.html",
      "cards.html",
      "index.html",
    ];
    for (const name of pages) {
      const html = readFileSync(join(repoRoot, name), "utf-8");
      expect(html, name).toMatch(/href="#main-content"/);
      expect(html, name).toMatch(/class="skip-to-main"/);
      expect(html, name).toMatch(/data-i18n="a11y\.skipToMain"/);
      expect(html, name).toMatch(/<main[^>]*id="main-content"/);
    }
  });

  it("join.html closes QR scanner on Escape when overlay is open", () => {
    const html = readFileSync(join(repoRoot, "join.html"), "utf-8");
    expect(html).toMatch(/e\.key !== "Escape"/);
    expect(html).toMatch(/closeQrScanner\(\)/);
  });

  it("player.html SSE resyncs on open, announces reconnect on error, and current-number is atomic", () => {
    const html = readFileSync(join(repoRoot, "player.html"), "utf-8");
    expect(html).toMatch(/eventSource\.onopen = \(\) => \{[\s\S]*fetchRoom\(\)/);
    expect(html).toMatch(/eventSource\.onerror = \(\) => \{[\s\S]*player\.status\.reconnecting/);
    expect(html).toMatch(
      /id="current-number"[^>]*aria-live="polite"[^>]*aria-atomic="true"/
    );
    expect(html).toMatch(/function showBooted\(\)[\s\S]*\.focus\(\)/);
  });

  it("cards.html localizes print column headers and FREE via player.card keys (T2)", () => {
    const html = readFileSync(join(repoRoot, "cards.html"), "utf-8");
    expect(html).toMatch(/PRINT_COLUMN_KEYS/);
    expect(html).toMatch(/player\.card\.colB/);
    expect(html).toMatch(/player\.card\.colO/);
    expect(html).toMatch(/val === "FREE"[\s\S]*t\("player\.card\.free"\)/);
    expect(html).not.toMatch(/h\.textContent = \["B", "I", "N", "G", "O"\]/);
    expect(html).not.toMatch(/cell\.textContent = "FREE"/);
  });
});
