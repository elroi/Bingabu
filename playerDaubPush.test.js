import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createDaubPushScheduler } from "./playerDaubPush.js";

describe("createDaubPushScheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not post until delay elapses", async () => {
    const post = vi.fn().mockResolvedValue(undefined);
    const s = createDaubPushScheduler({ delayMs: 250, requestPost: post });
    s.schedule();
    expect(post).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(249);
    expect(post).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("flush before delay runs post once and cancels the debounce", async () => {
    const post = vi.fn().mockResolvedValue(undefined);
    const s = createDaubPushScheduler({ delayMs: 250, requestPost: post });
    s.schedule();
    await s.flush();
    expect(post).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(500);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("flush with no scheduled post does not call requestPost", async () => {
    const post = vi.fn().mockResolvedValue(undefined);
    const s = createDaubPushScheduler({ delayMs: 250, requestPost: post });
    await s.flush();
    expect(post).not.toHaveBeenCalled();
  });

  it("flush waits for an in-flight post from the timer", async () => {
    const post = vi.fn();
    let resolvePost;
    post.mockImplementation(() => new Promise((r) => { resolvePost = r; }));
    const s = createDaubPushScheduler({ delayMs: 250, requestPost: post });
    s.schedule();
    await vi.advanceTimersByTimeAsync(250);
    expect(post).toHaveBeenCalledTimes(1);
    const flushDone = s.flush();
    resolvePost();
    await flushDone;
    expect(post).toHaveBeenCalledTimes(1);
  });
});
