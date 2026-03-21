import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

describe("Vercel Web Analytics (build injection)", () => {
  it("vite config injects Vercel insights script into every HTML build output", () => {
    const src = readFileSync(join(__dirname, "vite.config.js"), "utf8");
    expect(src).toContain("inject-vercel-web-analytics");
    expect(src).toContain("/_vercel/insights/script.js");
    expect(src).toContain("window.vaq");
  });
});
