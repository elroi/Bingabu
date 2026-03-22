import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Vercel applies minimatch to branch names. A single `*` does not match `/`,
 * so `**` is used so feature/* and fix/* branches do not get preview deploys.
 * @see https://vercel.com/docs/project-configuration/git-configuration
 */
describe("vercel.json git deployment", () => {
  it("only enables automatic Git deployments for main", () => {
    const raw = readFileSync(join(__dirname, "vercel.json"), "utf8");
    const config = JSON.parse(raw);
    expect(config.git?.deploymentEnabled).toEqual({
      "**": false,
      main: true,
    });
  });
});
