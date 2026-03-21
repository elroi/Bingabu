/**
 * User stories:
 * - As a maintainer, I want override diffs computed against static JSON so only changed strings are stored in Redis.
 * - As the system, I reject incomplete or unknown keys when saving merged locale payloads from the admin UI.
 */
import { describe, it, expect } from "vitest";
import {
  computeOverrides,
  loadStaticLocale,
  validateMergedComplete,
} from "./api/_lib/localeStore.js";

describe("loadStaticLocale", () => {
  it("reads static en strings from repo locales/en.json", () => {
    const en = loadStaticLocale("en");
    expect(en["index.pageTitle"]).toMatch(/Bingabu/);
  });
});

describe("computeOverrides", () => {
  it("records only keys that differ from static", () => {
    const stat = { a: "A", b: "B" };
    const merged = { a: "A2", b: "B" };
    expect(computeOverrides(merged, stat)).toEqual({ a: "A2" });
  });

  it("returns empty when merged matches static", () => {
    const stat = { x: "1" };
    expect(computeOverrides({ x: "1" }, stat)).toEqual({});
  });
});

describe("validateMergedComplete", () => {
  it("accepts identical key sets and string values", () => {
    const stat = { a: "x", b: "y" };
    const merged = { a: "1", b: "2" };
    expect(validateMergedComplete(merged, stat)).toBe(null);
  });

  it("rejects missing keys", () => {
    const stat = { a: "x", b: "y" };
    expect(validateMergedComplete({ a: "1" }, stat)).toMatch(/match static/);
  });

  it("rejects unknown keys", () => {
    const stat = { a: "x" };
    expect(validateMergedComplete({ a: "1", z: "2" }, stat)).toMatch(/match static/);
  });

  it("rejects non-string values", () => {
    const stat = { a: "x" };
    expect(validateMergedComplete({ a: 1 }, stat)).toMatch(/string/);
  });
});
