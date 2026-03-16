import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const readPage = (name) =>
  readFileSync(join(__dirname, `${name}.html`), "utf-8");

const PAGES = ["index", "join", "player", "bingo", "cards"];

describe("Mobile-friendly: viewport", () => {
  it.each(PAGES)("%s.html has viewport meta", (name) => {
    const html = readPage(name);
    expect(html).toMatch(/<meta\s+name="viewport"\s+content="[^"]*width=device-width[^"]*"/);
  });
});

describe("Mobile-friendly: safe-area insets", () => {
  it.each(PAGES)("%s.html uses safe-area in CSS", (name) => {
    const html = readPage(name);
    expect(html).toMatch(/safe-area-inset/);
  });
});

describe("Mobile-friendly: small-screen breakpoint", () => {
  it.each(PAGES)("%s.html has @media (max-width: 600px) or 480px", (name) => {
    const html = readPage(name);
    expect(
      html.includes("@media (max-width: 600px)") ||
        html.includes("@media (max-width: 480px)")
    ).toBe(true);
  });
});

describe("Mobile-friendly: touch targets (min 44px)", () => {
  it("index.html .btn has min-height 44px", () => {
    const html = readPage("index");
    expect(html).toMatch(/\.btn[\s\S]*?min-height:\s*44px/);
  });

  it("join.html slot or lobby buttons have min-height 44px", () => {
    const html = readPage("join");
    expect(html).toMatch(/min-height:\s*44px/);
  });

  it("player.html card cells have min-height 44px", () => {
    const html = readPage("player");
    expect(html).toMatch(/\.card-cell[\s\S]*?min-height:\s*44px/);
  });

  it("bingo.html draw/prev buttons have min-height 44px", () => {
    const html = readPage("bingo");
    expect(html).toMatch(/#draw-btn[\s\S]*?min-height:\s*44px/);
  });

  it("cards.html buttons have min-height 44px", () => {
    const html = readPage("cards");
    expect(html).toMatch(/min-height:\s*44px/);
  });
});

describe("Mobile-friendly: bingo host responsive current number", () => {
  it("bingo.html #current-number uses clamp or responsive min-height", () => {
    const html = readPage("bingo");
    const hasClamp = /#current-number\s*\{[\s\S]*?font-size:\s*clamp\(/.test(html);
    const hasMinHeight = /#current-number\s*\{[\s\S]*?min-height:\s*(70|80)px/.test(html);
    expect(hasClamp || hasMinHeight).toBe(true);
  });
});
