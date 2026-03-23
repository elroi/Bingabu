/**
 * Keep player-side manual daubs aligned with the current card and server state.
 * Same room + slot can span a host "New game" with new cards — sessionStorage daubs
 * must not carry over to the wrong layout.
 *
 * When the host sends gameInstanceId (incremented on each new game / card regen),
 * a bump clears stale client daubs even if the card fingerprint collided.
 */

export function cardFingerprint(card) {
  if (!card || !Array.isArray(card)) return "";
  return card
    .map((row) => (Array.isArray(row) ? row.map((c) => String(c)).join(",") : ""))
    .join("|");
}

/** @param {unknown} raw */
export function normalizeGameInstanceId(raw) {
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) return raw;
  return null;
}

function filterDaubsToCard(daubsSet, card) {
  const out = new Set();
  if (!card || !Array.isArray(card) || card.length === 0) return out;
  const rows = card.length;
  const cols = Array.isArray(card[0]) ? card[0].length : 0;
  if (!Number.isInteger(cols) || cols < 1) return out;
  for (const key of daubsSet) {
    if (typeof key !== "string") continue;
    const parts = key.split(",");
    if (parts.length !== 2) continue;
    const r = Number(parts[0]);
    const c = Number(parts[1]);
    if (!Number.isInteger(r) || !Number.isInteger(c) || r < 0 || r >= rows || c < 0 || c >= cols) continue;
    if (!card[r] || !Array.isArray(card[r]) || card[r][c] === undefined) continue;
    out.add(`${r},${c}`);
  }
  return out;
}

/**
 * @param {object} opts
 * @param {unknown[][]} opts.card
 * @param {number} opts.slotIndex
 * @param {Record<string, unknown>|undefined|null} opts.participantDaubs
 * @param {Set<string>} opts.localDaubsBefore
 * @param {string} opts.storedCardFingerprint
 * @param {unknown} [opts.gameInstanceId]
 * @param {unknown} [opts.storedGameInstanceId]
 * @param {boolean} [opts.manualDaubMergeLocal] - manual-daub games: reconcile GET vs local when one side is stale (reconnect / read lag)
 * @returns {{ daubs: Set<string>, cardFingerprint: string }}
 */
export function syncPlayerDaubs(opts) {
  const {
    card,
    slotIndex,
    participantDaubs,
    localDaubsBefore,
    storedCardFingerprint,
    gameInstanceId: rawGameId,
    storedGameInstanceId: rawStoredId,
    manualDaubMergeLocal: rawManualMerge,
  } = opts;
  const manualDaubMergeLocal = !!rawManualMerge;
  const fp = cardFingerprint(card);
  const gameInstanceId = normalizeGameInstanceId(rawGameId);
  const storedGameInstanceId = normalizeGameInstanceId(rawStoredId);

  const serverArr =
    participantDaubs &&
    typeof participantDaubs === "object" &&
    Object.prototype.hasOwnProperty.call(participantDaubs, String(slotIndex)) &&
    Array.isArray(participantDaubs[String(slotIndex)])
      ? participantDaubs[String(slotIndex)]
      : null;

  const instanceBumped =
    gameInstanceId !== null &&
    storedGameInstanceId !== null &&
    storedGameInstanceId !== gameInstanceId;

  if (instanceBumped) {
    if (serverArr !== null) {
      return { daubs: filterDaubsToCard(new Set(serverArr), card), cardFingerprint: fp };
    }
    return { daubs: new Set(), cardFingerprint: fp };
  }

  if (serverArr !== null) {
    let daubs = filterDaubsToCard(new Set(serverArr), card);
    if (manualDaubMergeLocal) {
      const localOnCard = filterDaubsToCard(localDaubsBefore, card);
      const serverSubsetOfLocal = [...daubs].every((k) => localOnCard.has(k));
      const localSubsetOfServer = [...localOnCard].every((k) => daubs.has(k));
      if (serverSubsetOfLocal) {
        daubs = localOnCard;
      } else if (localSubsetOfServer && localOnCard.size < daubs.size) {
        daubs = localOnCard;
      }
    }
    return { daubs, cardFingerprint: fp };
  }

  if (gameInstanceId === null) {
    if (storedCardFingerprint !== fp) {
      return { daubs: new Set(), cardFingerprint: fp };
    }
    return { daubs: filterDaubsToCard(new Set(localDaubsBefore), card), cardFingerprint: fp };
  }

  if (storedCardFingerprint !== fp) {
    return { daubs: new Set(), cardFingerprint: fp };
  }

  return { daubs: filterDaubsToCard(new Set(localDaubsBefore), card), cardFingerprint: fp };
}
