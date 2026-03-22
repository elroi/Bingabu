/**
 * Keep only daub keys that match FREE or a number already in drawnSequence (75-ball rules).
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
  if (!card || !Array.isArray(card) || card.length === 0) {
    return [];
  }
  const rows = card.length;
  const cols = card[0].length;
  if (!Number.isInteger(cols) || cols < 1) {
    return [];
  }
  for (let r = 0; r < rows; r++) {
    const row = card[r];
    if (!Array.isArray(row) || row.length !== cols) {
      return [];
    }
  }
  const allowed = new Set();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const val = card[r][c];
      if (val === "FREE" || (typeof val === "number" && drawnSet.has(val))) {
        allowed.add(`${r},${c}`);
      }
    }
  }
  if (!Array.isArray(daubs)) return [];
  return daubs.map(String).filter((key) => allowed.has(key));
}
