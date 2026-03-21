import { describe, it, expect } from "vitest";
import { readdirSync, statSync } from "fs";
import { join } from "path";

/**
 * Vercel treats each api/*.js tree file as a Serverless Function unless it lives
 * under a path segment that starts with `_` (private). Shared modules must stay
 * under api/_lib/ so Hobby's 12-function limit is not exceeded.
 */
function listRouteJsFiles(apiRoot, rel = "") {
  const out = [];
  const dir = join(apiRoot, rel);
  for (const name of readdirSync(dir)) {
    const segmentRel = rel ? join(rel, name) : name;
    const full = join(apiRoot, segmentRel);
    if (statSync(full).isDirectory()) {
      if (name.startsWith("_")) continue;
      out.push(...listRouteJsFiles(apiRoot, segmentRel));
    } else if (name.endsWith(".js")) {
      out.push(segmentRel.replace(/\\/g, "/"));
    }
  }
  return out;
}

describe("Vercel api layout (Hobby function count)", () => {
  it("only expected route entry files exist under api/ outside _private folders", () => {
    const apiRoot = join(__dirname, "api");
    const files = listRouteJsFiles(apiRoot).sort();
    expect(files).toEqual(
      [
        "admin-locales.js",
        "lobby.js",
        "locales/[locale].js",
        "rooms/[roomId].js",
        "rooms/[roomId]/[action].js",
        "rooms/index.js",
      ].sort(),
    );
  });
});
