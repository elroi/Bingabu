import { describe, it, expect } from "vitest";
import { getKeyPrefix } from "./api/lib/keyPrefix.js";

describe("getKeyPrefix", () => {
  it("returns default namespace when not preview", () => {
    expect(getKeyPrefix({ VERCEL_ENV: "production" })).toBe("bingabu:");
    expect(getKeyPrefix({})).toBe("bingabu:");
  });

  it("returns preview namespace when VERCEL_ENV is preview", () => {
    expect(getKeyPrefix({ VERCEL_ENV: "preview" })).toBe("bingabu:preview:");
  });
});
