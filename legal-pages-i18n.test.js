/**
 * As a maintainer, I want privacy/terms data-i18n keys to exist in locale files
 * so legal pages never ship with missing copy after edits.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const repoRoot = process.cwd();

function readJson(name) {
  return JSON.parse(readFileSync(join(repoRoot, "locales", name), "utf-8"));
}

function dataI18nKeys(html) {
  const re = /data-i18n="([^"]+)"/g;
  const keys = [];
  let m;
  while ((m = re.exec(html)) !== null) keys.push(m[1]);
  return keys;
}

describe("legal pages i18n keys", () => {
  it("privacy.html: every data-i18n key is defined and non-empty in en and he", () => {
    const en = readJson("en.json");
    const he = readJson("he.json");
    const html = readFileSync(join(repoRoot, "privacy.html"), "utf-8");
    for (const key of dataI18nKeys(html)) {
      expect(en[key], `en missing ${key}`).toBeDefined();
      expect(String(en[key]).trim().length, `en empty ${key}`).toBeGreaterThan(0);
      expect(he[key], `he missing ${key}`).toBeDefined();
      expect(String(he[key]).trim().length, `he empty ${key}`).toBeGreaterThan(0);
    }
  });

  it("terms.html: every data-i18n key is defined and non-empty in en and he", () => {
    const en = readJson("en.json");
    const he = readJson("he.json");
    const html = readFileSync(join(repoRoot, "terms.html"), "utf-8");
    for (const key of dataI18nKeys(html)) {
      expect(en[key], `en missing ${key}`).toBeDefined();
      expect(String(en[key]).trim().length, `en empty ${key}`).toBeGreaterThan(0);
      expect(he[key], `he missing ${key}`).toBeDefined();
      expect(String(he[key]).trim().length, `he empty ${key}`).toBeGreaterThan(0);
    }
  });
});
