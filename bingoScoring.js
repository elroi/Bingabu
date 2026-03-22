/**
 * Shared bingo line counting and standings (host leaderboard + player UI).
 * Uses ball coverage only — same geometry as host getBingoLines / player auto-daub lines.
 */

import { getRankedPlayers } from "./ranking.js";

export const POINTS_PER_LINE = 10;

const LETTERS = ["B", "I", "N", "G", "O"];

/** @param {unknown[][]} card */
function getCardSize(card) {
  if (!Array.isArray(card) || card.length === 0) return null;
  const rows = card.length;
  const cols = card[0]?.length;
  if (!Number.isInteger(cols) || cols < 1) return null;
  for (let r = 0; r < rows; r++) {
    const row = card[r];
    if (!Array.isArray(row) || row.length !== cols) return null;
  }
  return { rows, cols };
}

function isLineComplete(lineCells, drawnSet) {
  return lineCells.every((cell) => cell === "FREE" || drawnSet.has(cell));
}

/**
 * @param {unknown[][]} card
 * @param {Set<number>} drawnSet
 */
export function countBingoLines(card, drawnSet) {
  const size = getCardSize(card);
  if (!size) return 0;
  const { rows, cols } = size;
  let n = 0;
  for (let row = 0; row < rows; row++) {
    const cells = [];
    for (let c = 0; c < cols; c++) cells.push(card[row][c]);
    if (isLineComplete(cells, drawnSet)) n++;
  }
  for (let col = 0; col < cols; col++) {
    const cells = [];
    for (let r = 0; r < rows; r++) cells.push(card[r][col]);
    if (isLineComplete(cells, drawnSet)) n++;
  }
  if (rows === cols) {
    const diag1 = [];
    const diag2 = [];
    for (let i = 0; i < rows; i++) {
      diag1.push(card[i][i]);
      diag2.push(card[i][cols - 1 - i]);
    }
    if (isLineComplete(diag1, drawnSet)) n++;
    if (isLineComplete(diag2, drawnSet)) n++;
  }
  return n;
}

export function getFirstBingoDrawIndex(card, drawnSequence) {
  const seq = drawnSequence || [];
  for (let i = 1; i <= seq.length; i++) {
    const set = new Set(seq.slice(0, i));
    if (countBingoLines(card, set) >= 1) return i;
  }
  return Infinity;
}

/**
 * Host-oriented English line labels (fed into i18n via formatBingoLineLabel).
 * @param {unknown[][]} card
 * @param {Set<number>} drawnSet
 * @returns {string[]}
 */
export function getBingoLinesEn(card, drawnSet) {
  const size = getCardSize(card);
  if (!size) return [];
  const { rows, cols } = size;
  const lines = [];
  for (let row = 0; row < rows; row++) {
    const cells = [];
    for (let c = 0; c < cols; c++) cells.push(card[row][c]);
    if (isLineComplete(cells, drawnSet)) lines.push(`Row ${row + 1}`);
  }
  for (let col = 0; col < cols; col++) {
    const cells = [];
    for (let r = 0; r < rows; r++) cells.push(card[r][col]);
    const letter = LETTERS[col] ?? String(col);
    if (isLineComplete(cells, drawnSet)) lines.push(`Col ${letter}`);
  }
  if (rows === cols) {
    const diag1 = [];
    const diag2 = [];
    for (let i = 0; i < rows; i++) {
      diag1.push(card[i][i]);
      diag2.push(card[i][cols - 1 - i]);
    }
    if (isLineComplete(diag1, drawnSet)) lines.push("Diagonal \\");
    if (isLineComplete(diag2, drawnSet)) lines.push("Diagonal /");
  }
  return lines;
}

function isManualCellComplete(card, r, c, drawnSet, localDaubs) {
  const val = card[r][c];
  if (val === "FREE") return true;
  return drawnSet.has(val) && localDaubs.has(`${r},${c}`);
}

/**
 * Player manual-daub mode: cell counts as marked only if drawn and locally daubed.
 * @param {unknown[][]} card
 * @param {Set<number>} drawnSet
 * @param {Set<string>} localDaubs — keys "row,col"
 * @returns {string[]} same shape as getBingoLinesEn for mapping to player.* i18n
 */
export function getBingoLinesManualEn(card, drawnSet, localDaubs) {
  const size = getCardSize(card);
  if (!size) return [];
  const { rows, cols } = size;
  const lines = [];
  const complete = (positions) =>
    positions.every(([r, c]) => isManualCellComplete(card, r, c, drawnSet, localDaubs));

  for (let row = 0; row < rows; row++) {
    const positions = [];
    for (let c = 0; c < cols; c++) positions.push([row, c]);
    if (complete(positions)) lines.push(`Row ${row + 1}`);
  }
  for (let col = 0; col < cols; col++) {
    const positions = [];
    for (let r = 0; r < rows; r++) positions.push([r, col]);
    const letter = LETTERS[col] ?? String(col);
    if (complete(positions)) lines.push(`Col ${letter}`);
  }
  if (rows === cols) {
    const d1 = [];
    const d2 = [];
    for (let i = 0; i < rows; i++) {
      d1.push([i, i]);
      d2.push([i, cols - 1 - i]);
    }
    if (complete(d1)) lines.push("Diagonal \\");
    if (complete(d2)) lines.push("Diagonal /");
  }
  return lines;
}

/**
 * @param {{
 *   participantCards: unknown[][];
 *   participantNames?: (string|null|undefined)[];
 *   drawnSequence?: number[];
 *   defaultName: (index: number) => string;
 * }} opts
 */
export function rankParticipantsForStandings({
  participantCards,
  participantNames,
  drawnSequence,
  defaultName,
}) {
  const cards = participantCards || [];
  const names = participantNames || [];
  const seq = drawnSequence || [];
  const drawnSet = new Set(seq);
  const players = cards.map((card, index) => {
    const lines = countBingoLines(card, drawnSet);
    const points = lines * POINTS_PER_LINE;
    const firstBingoAt = getFirstBingoDrawIndex(card, seq);
    const raw = names[index] != null ? String(names[index]).trim() : "";
    const name = raw || defaultName(index);
    return { index, name, points, firstBingoAt };
  });
  return getRankedPlayers(players);
}
