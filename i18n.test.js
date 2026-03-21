/**
 * User stories:
 * - As a Hebrew-speaking player, I want locale resolved from URL, storage, or browser so the UI matches my preference.
 * - As a maintainer, I want missing Hebrew strings to fall back to English and keys to stay in sync across locale files.
 */
// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  resolveLocale,
  mergeMessages,
  interpolate,
  createTranslator,
  applyI18n,
  initI18n,
  LOCALE_STORAGE_KEY,
  normalizeLocale,
} from "./i18n.js";

const repoRoot = process.cwd();

function readJson(name) {
  return JSON.parse(readFileSync(join(repoRoot, "locales", name), "utf-8"));
}

describe("normalizeLocale", () => {
  it("accepts supported tags case-insensitively", () => {
    expect(normalizeLocale("HE")).toBe("he");
    expect(normalizeLocale("En")).toBe("en");
  });

  it("maps BCP47 tags to supported base", () => {
    expect(normalizeLocale("he-IL")).toBe("he");
    expect(normalizeLocale("en-US")).toBe("en");
  });

  it("returns null for unsupported", () => {
    expect(normalizeLocale("fr")).toBe(null);
    expect(normalizeLocale("")).toBe(null);
  });
});

describe("resolveLocale", () => {
  it("prefers ?lang= over storage and navigator", () => {
    expect(
      resolveLocale({
        search: "?lang=he",
        storageGet: () => "en",
        navigatorLanguage: "en-US",
      })
    ).toBe("he");
  });

  it("uses storage when query absent", () => {
    expect(
      resolveLocale({
        search: "",
        storageGet: () => "he",
        navigatorLanguage: "en-US",
      })
    ).toBe("he");
  });

  it("uses navigator when query and storage absent", () => {
    expect(
      resolveLocale({
        search: "",
        storageGet: () => null,
        navigatorLanguage: "he-IL",
      })
    ).toBe("he");
  });

  it("defaults to en", () => {
    expect(
      resolveLocale({
        search: "?lang=fr",
        storageGet: () => null,
        navigatorLanguage: "de-DE",
      })
    ).toBe("en");
  });
});

describe("mergeMessages", () => {
  it("fills missing keys from fallback", () => {
    const merged = mergeMessages(
      { a: "א", b: "" },
      { a: "A", b: "B", c: "C" }
    );
    expect(merged.a).toBe("א");
    expect(merged.b).toBe("B");
    expect(merged.c).toBe("C");
  });
});

describe("interpolate", () => {
  it("replaces placeholders", () => {
    expect(interpolate("Hello {name}", { name: "Ada" })).toBe("Hello Ada");
  });

  it("leaves unknown placeholders", () => {
    expect(interpolate("x {y}", {})).toBe("x {y}");
  });
});

describe("createTranslator", () => {
  it("returns key when missing", () => {
    const t = createTranslator({});
    expect(t("missing.key")).toBe("missing.key");
  });
});

describe("applyI18n", () => {
  it("sets text and attributes from t()", () => {
    const root = document.createElement("div");
    root.innerHTML =
      '<p data-i18n="k1"></p><input data-i18n="k2" data-i18n-attr="placeholder" />';
    const t = createTranslator({ k1: "Hi", k2: "Ph" });
    applyI18n(root, t);
    expect(root.querySelector("p").textContent).toBe("Hi");
    expect(root.querySelector("input").getAttribute("placeholder")).toBe("Ph");
  });
});

describe("initI18n", () => {
  beforeEach(() => {
    document.documentElement.lang = "en";
    document.documentElement.dir = "ltr";
    document.body.innerHTML = "";
    localStorage.removeItem(LOCALE_STORAGE_KEY);
  });

  it("loads locales, sets rtl for Hebrew, and hydrates data-i18n", async () => {
    const en = readJson("en.json");
    const he = readJson("he.json");
    const fetchFn = vi.fn((url) => {
      if (String(url).includes("en.json")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(en) });
      }
      if (String(url).includes("/he.json")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(he) });
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
    });
    document.body.innerHTML = '<p data-i18n="join.title"></p>';
    const { locale, t } = await initI18n({
      fetchFn,
      search: "?lang=he",
      documentRef: document,
      navigatorLanguage: "en-US",
    });
    expect(locale).toBe("he");
    expect(document.documentElement.lang).toBe("he");
    expect(document.documentElement.dir).toBe("rtl");
    expect(document.querySelector("p").textContent).toBe(he["join.title"]);
    expect(t("join.title")).toBe(he["join.title"]);
  });

  it("persists locale from query to localStorage", async () => {
    const en = readJson("en.json");
    const fetchFn = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(en) })
    );
    await initI18n({
      fetchFn,
      search: "?lang=en",
      documentRef: document,
    });
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("en");
  });
});

describe("locale files", () => {
  it("en and he define the same keys", () => {
    const en = readJson("en.json");
    const he = readJson("he.json");
    expect(Object.keys(he).sort()).toEqual(Object.keys(en).sort());
  });

  it("Hebrew values keep product name as Latin Bingabu (not translated)", () => {
    const he = readJson("he.json");
    const brandKeys = [
      "index.pageTitle",
      "index.hero.aria",
      "join.pageTitle",
      "join.navLogo.aria",
      "join.title",
    ];
    for (const k of brandKeys) {
      expect(he[k], k).toMatch(/Bingabu/);
    }
  });
});

describe("i18n HTML wiring", () => {
  it("index.html and join.html expose expected data-i18n keys", () => {
    const index = readFileSync(join(repoRoot, "index.html"), "utf-8");
    const joinPage = readFileSync(join(repoRoot, "join.html"), "utf-8");
    expect(index).toMatch(/data-i18n="index\.tagline"/);
    expect(index).toMatch(/data-i18n="index\.lang\.en"/);
    expect(joinPage).toMatch(/data-i18n="join\.title"/);
    expect(joinPage).toMatch(/from ['"]\.\/i18n\.js['"]/);
  });

  it("Latin wordmark stays LTR in RTL pages (flex order + dir on body)", () => {
    const index = readFileSync(join(repoRoot, "index.html"), "utf-8");
    const joinPage = readFileSync(join(repoRoot, "join.html"), "utf-8");
    const bingo = readFileSync(join(repoRoot, "bingo.html"), "utf-8");
    expect(index).toMatch(
      /<h1[\s\S]*?class="hero-title"[\s\S]*?dir="ltr"[\s\S]*?>/
    );
    expect(joinPage).toMatch(
      /<a[\s\S]*?id="nav-logo"[\s\S]*?dir="ltr"[\s\S]*?>/
    );
    expect(bingo).toMatch(
      /<h1[\s\S]*?id="bingo-app-title"[\s\S]*?dir="ltr"[\s\S]*?>/
    );
  });
});
