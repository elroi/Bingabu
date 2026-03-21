import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

describe("Join page: spectator entry", () => {
  const html = readFileSync(join(__dirname, "join.html"), "utf-8");

  it("has watch-only button and spectator destination", () => {
    expect(html).toMatch(/id="btn-watch-only"/);
    expect(html).toMatch(/spectator\.html\?room=/);
  });

  it("wraps slot list in fieldset with legend", () => {
    expect(html).toMatch(/<fieldset[^>]*join-slot-fieldset/);
    expect(html).toMatch(/data-i18n="join\.slotFieldsetLegend"/);
  });
});

describe("Spectator page", () => {
  const html = readFileSync(join(__dirname, "spectator.html"), "utf-8");

  it("loads i18n and stream reconnect", () => {
    expect(html).toMatch(/initI18n/);
    expect(html).toMatch(/streamReconnect\.js/);
  });
});
