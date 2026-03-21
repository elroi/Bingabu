/**
 * Single serverless function for /api/rooms/:roomId/:action
 * (Vercel Hobby: max 12 functions — consolidates join, claim, daubs, boot, leave, report, stream).
 */
import "../../lib/initObservability.js";
import {
  handleStream,
  handleJoin,
  handleClaim,
  handleDaubs,
  handleBoot,
  handleLeave,
  handleReport,
} from "../../lib/roomActionHandlers.js";

const POST_HANDLERS = {
  join: handleJoin,
  claim: handleClaim,
  daubs: handleDaubs,
  boot: handleBoot,
  leave: handleLeave,
  report: handleReport,
};

export function parseRoomAndAction(url) {
  const path = (url || "").split("?")[0] || "";
  const parts = path.split("/").filter(Boolean);
  const roomsIdx = parts.indexOf("rooms");
  if (roomsIdx < 0 || roomsIdx + 2 >= parts.length) {
    return { roomId: null, action: null };
  }
  return { roomId: parts[roomsIdx + 1], action: parts[roomsIdx + 2] };
}

export default async function handler(req, res) {
  const { roomId, action } = parseRoomAndAction(req.url);
  if (!roomId || !action) {
    return res.status(404).json({ error: "Not found" });
  }

  if (action === "stream") {
    if (req.method === "GET") {
      return handleStream(req, res, roomId);
    }
    return res.status(405).json({ error: "Method not allowed" });
  }

  const postHandler = POST_HANDLERS[action];
  if (!postHandler) {
    return res.status(404).json({ error: "Not found" });
  }

  return postHandler(req, res, roomId);
}
