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
  if (!card || !Array.isArray(card) || card.length !== 5) {
    return [];
  }
  const allowed = new Set();
  for (let r = 0; r < 5; r++) {
    const row = card[r];
    if (!Array.isArray(row) || row.length !== 5) continue;
    for (let c = 0; c < 5; c++) {
      const val = row[c];
      if (val === "FREE" || (typeof val === "number" && drawnSet.has(val))) {
        allowed.add(`${r},${c}`);
      }
    }
  }
  if (!Array.isArray(daubs)) return [];
  return daubs.map(String).filter((key) => allowed.has(key));
}
