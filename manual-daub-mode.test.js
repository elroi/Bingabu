import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const readPage = (name) =>
  readFileSync(join(__dirname, `${name}.html`), "utf-8");

describe("Manual daub mode: host state and UI", () => {
  it("bingo.html getStateForApi includes manualDaubOnly", () => {
    const html = readPage("bingo");
    expect(html).toMatch(/manualDaubOnly/);
    expect(html).toMatch(/getStateForApi[\s\S]*?manualDaubOnly/);
  });

  it("bingo.html getStateForApi includes participantDaubs", () => {
    const html = readPage("bingo");
    expect(html).toMatch(/participantDaubs/);
    expect(html).toMatch(/getStateForApi[\s\S]*?participantDaubs/);
  });

  it("bingo.html loadState restores manualDaubOnly", () => {
    const html = readPage("bingo");
    expect(html).toMatch(/loadState|data\.manualDaubOnly/);
    expect(html).toMatch(/manualDaubOnly\s*=/);
  });

  it("bingo.html loadState restores participantDaubs", () => {
    const html = readPage("bingo");
    expect(html).toMatch(/participantDaubs\s*=.*data\.participantDaubs|data\.participantDaubs.*participantDaubs/);
  });

  it("bingo.html has checkbox for players mark their own numbers", () => {
    const html = readPage("bingo");
    expect(html).toMatch(/manual.*daub|mark their own|no auto-color/i);
    expect(html).toMatch(/manualDaubOnlyCheckbox|manual-daub-only|id="[^"]*manual[^"]*"/i);
  });
});

describe("Manual daub mode: host participant cards and missed-daub", () => {
  it("bingo.html renderParticipantCards uses participantDaubs for marking", () => {
    const html = readPage("bingo");
    expect(html).toMatch(/participantDaubs\[.*index|participantDaubs\[String\(index\)\]/);
    expect(html).toMatch(/daubs\.includes|daubs\.indexOf/);
  });

  it("bingo.html has missed-daub CSS class styling", () => {
    const html = readPage("bingo");
    expect(html).toMatch(/\.missed-daub|missed-daub\s*\{/);
  });

  it("bingo.html adds missed-daub class for called but not daubed cells", () => {
    const html = readPage("bingo");
    expect(html).toMatch(/missed-daub|add\([\"']missed-daub[\"']\)|classList.*missed-daub/);
  });

  it("bingo.html has Sync to players control", () => {
    const html = readPage("bingo");
    expect(html).toMatch(/Sync to players|sync.*players/i);
  });
});

describe("Manual daub mode: player", () => {
  it("player.html uses state.manualDaubOnly for display", () => {
    const html = readPage("player");
    expect(html).toMatch(/manualDaubOnly|state\.manualDaubOnly/);
  });

  it("player.html resolves labels with getEffectiveKeySetIdForSlot", () => {
    const html = readPage("player");
    expect(html).toMatch(/getEffectiveKeySetIdForSlot/);
  });

  it("player.html syncs localDaubs from room state via syncPlayerDaubs", () => {
    const html = readPage("player");
    expect(html).toMatch(/syncPlayerDaubs/);
    expect(html).toMatch(/participantDaubs:\s*state\.participantDaubs/);
    expect(html).toMatch(/gameInstanceId:\s*state\.gameInstanceId/);
    expect(html).toMatch(/manualDaubMergeLocal:\s*!!state\.manualDaubOnly/);
    expect(html).toMatch(/localDaubs\s*=\s*synced\.daubs/);
  });

  it("player.html POSTs to daubs API on daub toggle", () => {
    const html = readPage("player");
    expect(html).toMatch(/api\/rooms\/.*\/daubs|daubs.*fetch|fetch.*daubs/);
  });

  it("player.html flushes debounced daubs before room GET to avoid stale sync on reconnect", () => {
    const html = readPage("player");
    expect(html).toMatch(/createDaubPushScheduler/);
    expect(html).toMatch(/daubScheduler\.flush/);
  });
});

describe("Manual daub mode: API daubs endpoint", () => {
  it("api/rooms/[roomId]/[action].js consolidates daubs with other room actions", () => {
    const path = join(__dirname, "api", "rooms", "[roomId]", "[action].js");
    expect(existsSync(path)).toBe(true);
  });

  it("roomActionHandlers exports handleDaubs", () => {
    const path = join(__dirname, "api", "_lib", "roomActionHandlers.js");
    const content = readFileSync(path, "utf-8");
    expect(content).toMatch(/export\s+async\s+function\s+handleDaubs/);
  });
});

describe("Sync and Push to players UX", () => {
  it("bingo.html setup view has daub-mode toggle (Auto daub / Manual daub)", () => {
    const html = readPage("bingo");
    expect(html).toMatch(/daub-mode-setup|daub-mode-toggle/);
    expect(html).toMatch(/daub-mode-auto|daub-mode-manual/);
    expect(html).toMatch(/Auto daub|Manual daub/);
  });

  it("bingo.html play view has Push to players button and indicatorPulseAt in state", () => {
    const html = readPage("bingo");
    expect(html).toMatch(/push-to-players-btn|Push to players/);
    expect(html).toMatch(/indicatorPulseAt/);
    expect(html).toMatch(/getStateForApi[\s\S]*?indicatorPulseAt/);
  });

  it("player.html applies indicatorPulseAt and shows indicator-missed", () => {
    const html = readPage("player");
    expect(html).toMatch(/indicatorPulseAt|state\.indicatorPulseAt/);
    expect(html).toMatch(/lastSeenIndicatorPulseAt/);
    expect(html).toMatch(/indicator-missed/);
  });
});
