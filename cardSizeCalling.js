/**
 * Card-size-aware calling: draw pool and display helpers for square 3×3 / 4×4 / 5×5 games.
 * Column c uses [c*15+1, c*15+15]; max ball id equals number of columns × 15.
 */

/**
 * @param {number} size Square edge length 3, 4, or 5
 * @returns {number} Highest ball id that can appear on cards of this size (45, 60, or 75)
 */
export function maxBallIdForSquareCardSize(size) {
  if (size === 3 || size === 4 || size === 5) return size * 15;
  return 75;
}

/**
 * @param {number} size
 * @returns {number[]} All ball ids 1..max for this card size
 */
export function fullDrawPoolForSquareCardSize(size) {
  const max = maxBallIdForSquareCardSize(size);
  return Array.from({ length: max }, (_, i) => i + 1);
}

/**
 * Numbers not yet drawn, for host cage (order preserved = ascending 1..max minus drawn).
 * @param {number} size
 * @param {number[]} drawnSequence
 * @returns {number[]}
 */
export function availableNumbersAfterDraws(size, drawnSequence) {
  const max = maxBallIdForSquareCardSize(size);
  const drawn = new Set(drawnSequence);
  const out = [];
  for (let n = 1; n <= max; n++) {
    if (!drawn.has(n)) out.push(n);
  }
  return out;
}

/**
 * Drop draws outside the pool for this card size (and de-dupe), preserving order.
 * Used when loading saved host state so older/corrupt sequences still render.
 * @param {number[]} saved
 * @param {number} size
 * @returns {number[]}
 */
export function coercedDrawnSequenceForCardSize(saved, size) {
  const max = maxBallIdForSquareCardSize(size);
  const seen = new Set();
  const out = [];
  if (!Array.isArray(saved)) return out;
  for (const n of saved) {
    if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > max) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

function bingoLetterForBall(num) {
  if (num <= 15) return "B";
  if (num <= 30) return "I";
  if (num <= 45) return "N";
  if (num <= 60) return "G";
  return "O";
}

/**
 * Full 5×5 games use classic "B-12" style; smaller grids show the label only so players
 * are not primed to look for missing BINGO columns.
 * @param {number} ballId
 * @param {string} displayLabel Resolved display text (number, word, etc.)
 * @param {number} squareSize 3, 4, or 5
 * @returns {string}
 */
export function formatCurrentCallForDisplay(ballId, displayLabel, squareSize) {
  const s = squareSize === 3 || squareSize === 4 || squareSize === 5 ? squareSize : 5;
  if (s >= 5) return `${bingoLetterForBall(ballId)}-${displayLabel}`;
  return String(displayLabel);
}
