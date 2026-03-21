import { describe, it, expect } from "vitest";
import { retryAfterSeconds } from "./api/lib/rateLimit.js";

describe("retryAfterSeconds", () => {
  it("returns at least 1", () => {
    expect(retryAfterSeconds(Date.now() + 500)).toBeGreaterThanOrEqual(1);
  });

  it("caps at 3600", () => {
    expect(retryAfterSeconds(Date.now() + 999 * 60 * 1000)).toBe(3600);
  });
});
