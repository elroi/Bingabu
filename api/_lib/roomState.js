/**
 * Shared validation for bingo room `state` (create + host PATCH).
 */

export const DEFAULT_CARD_SIZE = 5;
const ALLOWED_CARD_SIZES = new Set([3, 4, 5]);

/**
 * @param {unknown} state
 * @returns {{ rows: number, cols: number } | null}
 */
export function inferCardDimensions(state) {
  const cards = state && state.participantCards;
  if (!Array.isArray(cards) || cards.length === 0) {
    return { rows: DEFAULT_CARD_SIZE, cols: DEFAULT_CARD_SIZE };
  }
  const card0 = cards[0];
  if (!Array.isArray(card0) || card0.length === 0 || !Array.isArray(card0[0])) return null;
  const rows = card0.length;
  const cols = card0[0].length;
  for (const card of cards) {
    if (!Array.isArray(card) || card.length !== rows) return null;
    for (const row of card) {
      if (!Array.isArray(row) || row.length !== cols) return null;
    }
  }
  return { rows, cols };
}

function cellValueValid(val, colIndex) {
  if (val === "FREE") return true;
  if (typeof val !== "number" || !Number.isInteger(val) || val < 1 || val > 75) return false;
  const lo = colIndex * 15 + 1;
  const hi = colIndex * 15 + 15;
  return val >= lo && val <= hi;
}

/**
 * @param {unknown} state
 * @returns {boolean}
 */
export function isValidGameState(state) {
  if (!state || typeof state !== "object") return false;
  if (!Array.isArray(state.drawnSequence)) return false;
  const seq = state.drawnSequence;
  if (seq.some((n) => typeof n !== "number" || n < 1 || n > 75)) return false;
  if (new Set(seq).size !== seq.length) return false;
  const np = state.numParticipants;
  if (typeof np !== "number" || np < 0 || np > 12) return false;
  const cards = state.participantCards;
  if (!Array.isArray(cards) || cards.length !== np) return false;

  const inferred = inferCardDimensions(state);
  if (!inferred) return false;
  const { rows, cols } = inferred;
  if (rows !== cols || !ALLOWED_CARD_SIZES.has(rows)) return false;

  const cr = state.cardRows;
  const cc = state.cardCols;
  if (cr != null || cc != null) {
    if (typeof cr !== "number" || typeof cc !== "number" || !Number.isInteger(cr) || !Number.isInteger(cc)) {
      return false;
    }
    if (cr !== cc || cr !== rows || cc !== cols) return false;
  }

  for (const card of cards) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!cellValueValid(card[r][c], c)) return false;
      }
    }
  }

  return true;
}
