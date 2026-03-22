import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const readPage = (name) =>
  readFileSync(join(__dirname, `${name}.html`), "utf-8");

const PAGES = ["index", "join", "player", "bingo", "cards", "spectator", "privacy", "terms", "admin-translations"];

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

  it("join.html slot rows use flex gap and label min-width so CTA does not overlap text", () => {
    const html = readPage("join");
    expect(html).toMatch(
      /\.slot-list li\s*\{[\s\S]*?display:\s*flex[\s\S]*?gap:\s*\d+px/s
    );
    expect(html).toMatch(
      /\.slot-list li\s*>\s*span\s*\{[\s\S]*?min-width:\s*0/s
    );
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

  it("cards.html .actions aligns items on the row axis so pills do not stretch tall", () => {
    const html = readPage("cards");
    expect(html).toMatch(/\.actions\s*\{[\s\S]*?align-items:\s*center/);
  });
});

describe("Print cards legibility", () => {
  it("cards.html @media print enlarges number cells (not FREE) for readable print", () => {
    const html = readPage("cards");
    expect(html).toMatch(
      /@media print\s*\{[\s\S]*\.participant-card\s+\.card-cell:not\(\.free\)\s*\{[^}]*font-size:\s*1\.5rem/s
    );
  });

  it("cards.html enlarges number cells on screen (before print styles) with responsive clamp", () => {
    const html = readPage("cards");
    const beforePrint = html.split("@media print")[0];
    expect(beforePrint).toMatch(
      /\.participant-card\s+\.card-cell:not\(\.free\)\s*\{[^}]*font-size:\s*clamp\(/s
    );
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

describe("Bingo host UX", () => {
  it("bingo.html refreshes draw button label with t(bingo.controls.draw), not hardcoded DRAW", () => {
    const html = readPage("bingo");
    expect(html).not.toMatch(/drawBtn\.innerText\s*=\s*["']DRAW["']/);
    expect(html).toMatch(
      /drawBtn\.textContent\s*=\s*t\(\s*["']bingo\.controls\.draw["']\s*\)/
    );
  });

  it("bingo.html has Board style key set control in setup", () => {
    const html = readPage("bingo");
    expect(html).toMatch(/id="display-key-set"/);
  });

  it("bingo.html has Participants section before Play with friends section in DOM", () => {
    const html = readPage("bingo");
    const setupPlayersIndex = html.indexOf('id="setup-players-section"');
    const remotePlayIndex = html.indexOf('id="remote-play-section"');
    expect(setupPlayersIndex).toBeGreaterThan(-1);
    expect(remotePlayIndex).toBeGreaterThan(-1);
    expect(setupPlayersIndex).toBeLessThan(remotePlayIndex);
  });

  it("bingo.html remote-play subtitle is wired for i18n", () => {
    const html = readPage("bingo");
    expect(html).toMatch(/class="[^"]*remote-play-subtitle/);
    expect(html).toMatch(/data-i18n="bingo\.remote\.subtitle"/);
  });

  it("bingo.html participants section appears before Play with friends (remote-play) in DOM", () => {
    const html = readPage("bingo");
    const setupPlayersIndex = html.indexOf('id="setup-players-section"');
    const remotePlayIndex = html.indexOf('id="remote-play-section"');
    expect(setupPlayersIndex).toBeGreaterThan(-1);
    expect(remotePlayIndex).toBeGreaterThan(-1);
    expect(setupPlayersIndex).toBeLessThan(remotePlayIndex);
  });

  it("bingo.html has host steps strip with all four step labels", () => {
    const html = readPage("bingo");
    expect(html).toMatch(/host-steps/);
    expect(html).toMatch(/1\. Players/);
    expect(html).toMatch(/2\. Create room/);
    expect(html).toMatch(/3\. Share/);
    expect(html).toMatch(/4\. Draw/);
  });

  it("bingo.html has first-visit banner with Got it dismiss control", () => {
    const html = readPage("bingo");
    expect(html).toMatch(/id="first-visit-banner"/);
    expect(html).toMatch(/id="first-visit-banner-dismiss"/);
    expect(html).toMatch(/Got it/);
  });

  it("bingo.html script references onboarding localStorage key", () => {
    const html = readPage("bingo");
    expect(html).toMatch(/bingabu-host-onboarding-done/);
  });

  it("bingo.html Advanced Controls renamed to Settings & options", () => {
    const html = readPage("bingo");
    expect(html).toMatch(/Settings & options/);
  });

  it("bingo.html has host wizard overlay with modal, steps, Next, Back, Skip", () => {
    const html = readPage("bingo");
    expect(html).toMatch(/id="host-wizard-overlay"/);
    expect(html).toMatch(/host-wizard-modal/);
    expect(html).toMatch(/host-wizard-progress/);
    expect(html).toMatch(/id="host-wizard-next"/);
    expect(html).toMatch(/id="host-wizard-back"/);
    expect(html).toMatch(/id="host-wizard-skip"/);
    expect(html).toMatch(/Step 1 of 4/);
    expect(html).toMatch(/Skip/);
  });

  it("bingo.html wizard Skip closes wizard and sets onboarding done key", () => {
    const html = readPage("bingo");
    expect(html).toMatch(/closeHostWizard/);
    expect(html).toMatch(/localStorage\.setItem\(ONBOARDING_DONE_KEY/);
    expect(html).toMatch(/host-wizard-skip/);
  });

  it("bingo.html has Show guide control", () => {
    const html = readPage("bingo");
    expect(html).toMatch(/id="host-wizard-show-again"/);
    expect(html).toMatch(/Show guide/);
  });

  it("bingo.html has two-phase host views: setup and play", () => {
    const html = readPage("bingo");
    expect(html).toMatch(/id="host-setup-view"/);
    expect(html).toMatch(/id="host-play-view"/);
    expect(html).toMatch(/Who's playing\?/);
    expect(html).toMatch(/id="host-start-game-btn"/);
    expect(html).toMatch(/Start the game/);
    expect(html).toMatch(/id="new-game-btn"/);
  });

  it("bingo.html script uses host phase sessionStorage key", () => {
    const html = readPage("bingo");
    expect(html).toMatch(/bingabu-host-phase/);
  });

  it("bingo.html has play wizard with steps, Back, Next, Skip, Show guide", () => {
    const html = readPage("bingo");
    expect(html).toMatch(/id="play-wizard-overlay"/);
    expect(html).toMatch(/play-wizard-modal/);
    expect(html).toMatch(/play-wizard-progress/);
    expect(html).toMatch(/Step 1 of 5/);
    expect(html).toMatch(/id="play-wizard-back"/);
    expect(html).toMatch(/id="play-wizard-next"/);
    expect(html).toMatch(/id="play-wizard-skip"/);
    expect(html).toMatch(/Current number/);
    expect(html).toMatch(/bingo\.playWizard\.s3\.title/);
    expect(html).toMatch(/id="play-wizard-draw-target"/);
    expect(html).toMatch(/id="play-wizard-history-target"/);
    expect(html).toMatch(/bingabu-play-wizard-done/);
  });

  it("index.html has home wizard overlay with modal, hidden Skip, Got it, Host or join", () => {
    const html = readPage("index");
    expect(html).toMatch(/id="home-wizard-overlay"/);
    expect(html).toMatch(/home-wizard-modal/);
    expect(html).toMatch(/id="home-wizard-done"/);
    expect(html).toMatch(/id="home-wizard-skip"[^>]*class="[^"]*\bhidden\b/);
    expect(html).toMatch(/data-i18n="index\.wizard\.title"/);
    expect(html).toMatch(/data-i18n="index\.wizard\.done"/);
  });

  it("bingo.html host and play wizards hide Skip when the step list has only one step", () => {
    const html = readPage("bingo");
    expect(html).toContain(
      'hostWizardSkip.classList.toggle("hidden", HOST_WIZARD_STEPS.length <= 1)'
    );
    expect(html).toContain(
      'playWizardSkip.classList.toggle("hidden", PLAY_WIZARD_STEPS.length <= 1)'
    );
  });

  it("index.html home wizard has Show guide and onboarding key", () => {
    const html = readPage("index");
    expect(html).toMatch(/id="home-wizard-show-again"/);
    expect(html).toMatch(/data-i18n="index\.wizard\.showGuide"/);
    expect(html).toMatch(/bingabu-home-wizard-done/);
  });
});

describe("Favicon", () => {
  const FAVICON_PAGES = ["index", "join", "player", "bingo", "cards", "spectator", "privacy", "terms", "admin-translations"];
  it.each(FAVICON_PAGES)("%s.html references favicon.svg", (name) => {
    expect(readPage(name)).toMatch(/href="\/favicon\.svg"/);
  });
});
