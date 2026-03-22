/**
 * Keep only daub keys that are valid for this card and game mode.
 * - Auto-daub mode: FREE or a cell whose number is already in drawnSequence (75-ball).
 * - Manual-daub-only: any cell on the player's card (marks are explicit; bingo lines still require drawn numbers client-side).
 * @param {object} state - room.state
 * @param {number} slotIndex
 * @param {string[]} daubs - "row,col" keys from client
 * @returns {string[]}
 */
export function filterAllowedDaubs(state, slotIndex, daubs) {
  const seq = (state && state.drawnSequence) || [];
  const drawnSet = new Set(seq);
  const cards = (state && state.participantCards) || [];
  const card = cards[slotIndex];
  if (!card || !Array.isArray(card) || card.length !== 5) {
    return [];
  }
  const manualOnly = !!(state && state.manualDaubOnly);
  const allowed = new Set();
  for (let r = 0; r < 5; r++) {
    const row = card[r];
    if (!Array.isArray(row) || row.length !== 5) continue;
    for (let c = 0; c < 5; c++) {
      const val = row[c];
      if (manualOnly) {
        if (val === "FREE" || typeof val === "number") {
          allowed.add(`${r},${c}`);
        }
      } else if (val === "FREE" || (typeof val === "number" && drawnSet.has(val))) {
        allowed.add(`${r},${c}`);
      }
    }
  }
  if (!Array.isArray(daubs)) return [];
  return daubs.map(String).filter((key) => allowed.has(key));
}

/**
 * Host PATCH carries in-memory participantDaubs that can lag behind player POST /daubs.
 * - Slot claimed by a **non-host** player: keep server daubs only (re-filtered), so host cannot wipe or resurrect marks; player POST is authoritative.
 * - Unclaimed slot: use host payload only (re-filtered).
 * - Host-as-player or other: union server + host keys, then {@link filterAllowedDaubs} (covers stale host memory without undoing player removals on remote slots).
 * @param {Record<string, string[]>|undefined|null} prevParticipantDaubs
 * @param {object} incomingState - validated PATCH state (numParticipants, participantCards, drawnSequence, manualDaubOnly, …)
 * @param {{ claims?: Record<string, string>, hostId?: string }} room - current room (claims + hostId)
 * @returns {Record<string, string[]>}
 */
export function mergeParticipantDaubsForPatch(prevParticipantDaubs, incomingState, room) {
  const np = incomingState.numParticipants;
  const prevPD =
    prevParticipantDaubs && typeof prevParticipantDaubs === "object" ? prevParticipantDaubs : {};
  const incPD =
    incomingState.participantDaubs && typeof incomingState.participantDaubs === "object"
      ? incomingState.participantDaubs
      : {};
  const claims = (room && room.claims) || {};
  const hostId = room && room.hostId;
  const merged = {};
  for (let i = 0; i < np; i++) {
    const k = String(i);
    const prevArr = Array.isArray(prevPD[k]) ? prevPD[k] : [];
    const incArr = Array.isArray(incPD[k]) ? incPD[k] : [];
    const claim = claims[k];
    const remotePlayer = claim && hostId && claim !== hostId;

    if (remotePlayer) {
      merged[k] = filterAllowedDaubs(incomingState, i, prevArr);
    } else if (!claim) {
      merged[k] = filterAllowedDaubs(incomingState, i, incArr);
    } else {
      const union = [...new Set([...prevArr.map(String), ...incArr.map(String)])];
      merged[k] = filterAllowedDaubs(incomingState, i, union);
    }
  }
  return merged;
}
