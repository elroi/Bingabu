import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const readPage = (name) =>
  readFileSync(join(__dirname, `${name}.html`), "utf-8");

describe("Translation enabled: host state and UI", () => {
  it("bingo.html getStateForApi includes translationEnabled", () => {
    const html = readPage("bingo");
    expect(html).toMatch(/translationEnabled/);
    expect(html).toMatch(/getStateForApi[\s\S]*?translationEnabled/);
  });

  it("bingo.html loadState restores translationEnabled", () => {
    const html = readPage("bingo");
    expect(html).toMatch(/loadState|data\.translationEnabled/);
    expect(html).toMatch(/translationEnabled\s*=/);
    expect(html).toMatch(/translationEnabledCheckbox.*checked|translationEnabledPlayCheckbox.*checked/);
  });

  it("bingo.html has translation checkbox in setup (remote-play-create-options)", () => {
    const html = readPage("bingo");
    expect(html).toMatch(/translation-enabled|Allow players to translate/);
    expect(html).toMatch(/remote-play-create-options|remote-play-translation-wrap/);
  });

  it("bingo.html has translation checkbox in Settings & options", () => {
    const html = readPage("bingo");
    expect(html).toMatch(/translation-enabled-play/);
    expect(html).toMatch(/translation-enabled-setting|translationEnabledPlayCheckbox/);
  });

  it("bingo.html applyDaubModeUI syncs translation checkboxes", () => {
    const html = readPage("bingo");
    expect(html).toMatch(/translationEnabledCheckbox\.checked\s*=\s*translationEnabled/);
    expect(html).toMatch(/translationEnabledPlayCheckbox\.checked\s*=\s*translationEnabled/);
  });
});

describe("Translation enabled: join page", () => {
  it("join.html has translate container and applyTranslationUI", () => {
    const html = readPage("join");
    expect(html).toMatch(/bingabu-translate-wrap|bingabu-translate-select/);
    expect(html).toMatch(/applyTranslationUI/);
    expect(html).toMatch(/state\.translationEnabled/);
  });

  it("join.html calls applyTranslationUI when state is set (goWithCode and password join)", () => {
    const html = readPage("join");
    expect(html).toMatch(/applyTranslationUI\(state\)|applyTranslationUI\(data\.state\)/);
  });

  it("join.html uses custom translate dropdown and opens in new tab (no iframe)", () => {
    const html = readPage("join");
    expect(html).toMatch(/bingabu-translate-select/);
    expect(html).toMatch(/translate\.google\.com\/translate\?sl=auto&tl=/);
    expect(html).toMatch(/window\.open\s*\([^)]*_blank/);
    expect(html).not.toMatch(/google_translate_element|translate_a\/element\.js/);
  });
});

describe("Translation enabled: player page", () => {
  it("player.html has translate container and applyTranslationUI", () => {
    const html = readPage("player");
    expect(html).toMatch(/bingabu-translate-wrap|bingabu-translate-select/);
    expect(html).toMatch(/applyTranslationUI/);
    expect(html).toMatch(/state\.translationEnabled/);
  });

  it("player.html calls applyTranslationUI from render(state)", () => {
    const html = readPage("player");
    expect(html).toMatch(/applyTranslationUI\(state\)/);
  });

  it("player.html uses custom translate dropdown and opens in new tab (no iframe)", () => {
    const html = readPage("player");
    expect(html).toMatch(/bingabu-translate-select/);
    expect(html).toMatch(/translate\.google\.com\/translate\?sl=auto&tl=/);
    expect(html).toMatch(/window\.open\s*\([^)]*_blank/);
    expect(html).not.toMatch(/google_translate_element|translate_a\/element\.js/);
  });

  it("player.html shows message when host disables translation", () => {
    const html = readPage("player");
    expect(html).toMatch(/bingabu-translation-disabled-msg|Translation was disabled by the host/);
  });
});
