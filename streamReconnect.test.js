import { describe, it, expect } from "vitest";
import { nextReconnectDelayMs, SSE_RECONNECT_INITIAL_MS, SSE_RECONNECT_CAP_MS } from "./streamReconnect.js";

describe("nextReconnectDelayMs", () => {
  it("starts at initial", () => {
    expect(nextReconnectDelayMs(0)).toBe(SSE_RECONNECT_INITIAL_MS);
  });

  it("doubles until cap", () => {
    expect(nextReconnectDelayMs(1000)).toBe(2000);
    expect(nextReconnectDelayMs(16000)).toBe(30000);
    expect(nextReconnectDelayMs(SSE_RECONNECT_CAP_MS)).toBe(SSE_RECONNECT_CAP_MS);
  });
});
