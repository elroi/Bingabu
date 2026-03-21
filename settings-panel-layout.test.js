import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const bingoHtml = readFileSync(join(__dirname, "bingo.html"), "utf-8");

describe("Settings & options panel layout (bingo.html)", () => {
  it("advanced-controls-content uses column flex and gap for uniform row spacing", () => {
    expect(bingoHtml).toMatch(
      /\.advanced-controls-content\s*\{[^}]*display:\s*flex[^}]*flex-direction:\s*column[^}]*gap:\s*\d+px/s
    );
  });

  it("shared .advanced-controls-option styles checkbox column and accent color", () => {
    expect(bingoHtml).toMatch(/\.advanced-controls-option\s*\{/);
    expect(bingoHtml).toMatch(
      /\.advanced-controls-option\s+input\[type="checkbox"\][\s\S]*?accent-color:\s*var\(--secondary\)/s
    );
  });

  it("nested manual-daub hint row uses padding-inline-start", () => {
    expect(bingoHtml).toMatch(
      /\.advanced-controls-option--nested\s*\{[^}]*padding-inline-start:/s
    );
  });

  it("mc-advanced uses text-align start for RTL", () => {
    expect(bingoHtml).toMatch(/\.mc-advanced\s*\{[^}]*text-align:\s*start/s);
    expect(bingoHtml).not.toMatch(/\.mc-advanced\s*\{[^}]*text-align:\s*left/s);
  });

  it("every settings checkbox row includes advanced-controls-option", () => {
    const start = bingoHtml.indexOf('id="advanced-controls-content"');
    expect(start).toBeGreaterThan(-1);
    const slice = bingoHtml.slice(start, start + 2500);
    expect(slice).toMatch(
      /class="advanced-controls-option"[\s\S]*id="hide-cards"/
    );
    expect(slice).toMatch(
      /class="advanced-controls-option"[\s\S]*id="manual-daub-only"/
    );
    expect(slice).toMatch(
      /class="advanced-controls-option advanced-controls-option--nested hidden"[\s\S]*id="manual-daub-auto-hint"/
    );
    expect(slice).toMatch(
      /class="advanced-controls-option"[\s\S]*id="mc-announces"/
    );
    expect(slice).toMatch(
      /class="advanced-controls-option"[\s\S]*id="mc-simple"/
    );
  });
});
