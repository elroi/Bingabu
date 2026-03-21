import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import { join } from "path";
import dotenv from "dotenv";
import { getRepoRoot } from "./api/_lib/loadLocalEnv.js";

describe("getRepoRoot", () => {
  it("resolves to repo containing package.json and locales", () => {
    const root = getRepoRoot();
    expect(existsSync(join(root, "package.json"))).toBe(true);
    expect(existsSync(join(root, "locales", "en.json"))).toBe(true);
  });
});

describe("env file normalization (matches loadLocalEnv)", () => {
  it("strips BOM and export prefix before dotenv.parse", () => {
    let raw = "\uFEFFexport FOO=bar\n";
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
    const normalized = raw
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*export\s+/, ""))
      .join("\n");
    expect(dotenv.parse(normalized)).toEqual({ FOO: "bar" });
  });
});
