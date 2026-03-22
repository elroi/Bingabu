/**
 * Shared bingo line counting and standings (host leaderboard + player UI).
 * Uses ball coverage only — same geometry as host getBingoLines / player auto-daub lines.
 */

import { getRankedPlayers } from "./ranking.js";

export const POINTS_PER_LINE = 10;

function isLineComplete(lineCells, drawnSet) {
  return lineCells.every((cell) => cell === "FREE" || drawnSet.has(cell));
}

export function countBingoLines(card, drawnSet) {
  let n = 0;
  for (let row = 0; row < 5; row++) {
    const cells = [card[row][0], card[row][1], card[row][2], card[row][3], card[row][4]];
    if (isLineComplete(cells, drawnSet)) n++;
  }
  for (let col = 0; col < 5; col++) {
    const cells = [card[0][col], card[1][col], card[2][col], card[3][col], card[4][col]];
    if (isLineComplete(cells, drawnSet)) n++;
  }
  const diag1 = [card[0][0], card[1][1], card[2][2], card[3][3], card[4][4]];
  if (isLineComplete(diag1, drawnSet)) n++;
  const diag2 = [card[0][4], card[1][3], card[2][2], card[3][1], card[4][0]];
  if (isLineComplete(diag2, drawnSet)) n++;
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
