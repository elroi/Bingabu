import { describe, it, expect } from "vitest";
import { parseRoomAndAction } from "./api/rooms/[roomId]/[action].js";

describe("parseRoomAndAction", () => {
  it("parses room id and action from API path", () => {
    expect(parseRoomAndAction("/api/rooms/ABC123/claim")).toEqual({ roomId: "ABC123", action: "claim" });
    expect(parseRoomAndAction("/api/rooms/XYZ/stream?joinToken=x")).toEqual({ roomId: "XYZ", action: "stream" });
  });

  it("returns nulls for invalid paths", () => {
    expect(parseRoomAndAction("/api/lobby")).toEqual({ roomId: null, action: null });
  });
});
