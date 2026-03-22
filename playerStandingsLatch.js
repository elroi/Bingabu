import { normalizeGameInstanceId } from "./playerDaubState.js";

/**
 * Keep the player standings strip visible after the first time anyone scores,
 * even if a later render transiently computes zero points. Resets on a new
 * game instance or a new card fingerprint.
 *
 * @param {{ lastRanked: unknown[] | null, snapGid: number | null, snapFp: string }} prev
 * @param {{
 *   ranked: Array<{ points: number }>;
 *   gameInstanceId: unknown;
 *   cardFingerprint: string;
 * }} input
 */
export function resolveStandingsUiState(prev, { ranked, gameInstanceId, cardFingerprint }) {
  const gid = normalizeGameInstanceId(gameInstanceId);
  let { lastRanked, snapGid, snapFp } = prev;

  if (snapGid !== gid) {
    lastRanked = null;
    snapFp = "";
    snapGid = gid;
  }
  if (lastRanked && snapFp !== cardFingerprint) {
    lastRanked = null;
  }

  const anyNow = ranked.some((p) => p.points > 0);
  const rankedForUi = anyNow ? ranked : lastRanked || ranked;
  const show = rankedForUi.some((p) => p.points > 0);

  if (anyNow) {
    return {
      rankedForUi,
      show,
      prev: { lastRanked: ranked, snapGid, snapFp: cardFingerprint },
    };
  }
  return {
    rankedForUi,
    show,
    prev: { lastRanked, snapGid, snapFp },
  };
}
