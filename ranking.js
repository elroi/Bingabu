/**
 * Ranking helpers for leaderboard and MC callouts.
 * Testable in Node; also attached to window.BingabuRanking for bingo.html.
 */

const ORDINAL_PLACES = ["1st", "2nd", "3rd"];

export function getOrdinal(n) {
  if (n >= 1 && n <= 3) return ORDINAL_PLACES[n - 1];
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return n + "st";
  if (mod10 === 2 && mod100 !== 12) return n + "nd";
  if (mod10 === 3 && mod100 !== 13) return n + "rd";
  return n + "th";
}

/**
 * @param {Array<{ name: string, points: number, firstBingoAt: number }>} players
 * @returns {Array<{ name: string, points: number, firstBingoAt: number, rank: number }>}
 */
export function getRankedPlayers(players) {
  if (!players || players.length === 0) return [];
  const sorted = [...players].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return a.firstBingoAt - b.firstBingoAt;
  });
  return sorted.map((p, i) => ({ ...p, rank: i + 1 }));
}

/**
 * English-only templates for MC callouts. Do **not** rely on these strings in a localized UI:
 * pass locale-aware `phrases`, `standingsPickers`, and `ordinal` into {@link getRankingPhrase}
 * (see `bingo.html` for the production wiring).
 */
export const defaultRankingPhrases = {
  newLeader: (name) => `New leader: ${name}!`,
  movesInto2nd: (name) => `${name} moves into 2nd!`,
  movesInto3rd: (name) => `${name} into 3rd!`,
  in2nd: (name) => `Leaderboard update: ${name} in 2nd!`,
  intoNth: (name, ordStr) => `${name} into ${ordStr}!`,
};

export const defaultStandingsPickers = [
  (top) =>
    `Current standings: 1st ${top[0]?.name ?? ""}, 2nd ${top[1]?.name ?? ""}, 3rd ${top[2]?.name ?? ""}.`,
  (top) => `Top three: ${top.map((p) => p.name).join(", ")}.`,
];

const OCCASIONAL_STANDINGS_PROB = 0.18;

/**
 * @param {Array<{ name: string, rank: number }>} prevRanked
 * @param {Array<{ name: string, rank: number }>} currRanked
 * @param {{
 *   random?: () => number;
 *   phrases?: Partial<typeof defaultRankingPhrases>;
 *   standingsPickers?: Array<(top: Array<{ name: string }>) => string>;
 *   ordinal?: (n: number) => string;
 * }} [options]
 * @returns {string}
 *
 * **i18n:** Without `options`, merged phrases and {@link defaultStandingsPickers} stay English
 * (including ordinals via {@link getOrdinal}). Callers that surface text to users must supply
 * localized `phrases`, `standingsPickers`, and `ordinal`.
 */
export function getRankingPhrase(prevRanked, currRanked, options = {}) {
  if (!currRanked || currRanked.length === 0) return "";
  const random = options.random ?? (() => Math.random());
  const phrases = { ...defaultRankingPhrases, ...(options.phrases || {}) };
  const ordinalFn = options.ordinal ?? getOrdinal;
  const standingsPickers =
    options.standingsPickers && options.standingsPickers.length > 0
      ? options.standingsPickers
      : defaultStandingsPickers;

  if (prevRanked.length === 0) return "";

  const prevByName = new Map((prevRanked || []).map((p) => [p.name, p.rank]));

  const hasChange = currRanked.some(
    (p) => prevByName.get(p.name) !== undefined && prevByName.get(p.name) !== p.rank
  );
  const newLeader = prevRanked?.length > 0 && currRanked[0] && prevRanked[0].name !== currRanked[0].name;

  if (hasChange || newLeader) {
    if (newLeader) return phrases.newLeader(currRanked[0].name);
    const movers = currRanked.filter((p) => prevByName.get(p.name) !== p.rank);
    const mover = movers[0];
    if (!mover) return "";
    if (mover.rank === 2) return phrases.movesInto2nd(mover.name);
    if (mover.rank === 3) return phrases.movesInto3rd(mover.name);
    return phrases.intoNth(mover.name, ordinalFn(mover.rank));
  }

  if (random() < OCCASIONAL_STANDINGS_PROB) {
    const top = currRanked.slice(0, 3);
    const pick =
      standingsPickers[Math.floor(random() * standingsPickers.length)];
    return pick(top);
  }
  return "";
}

if (typeof window !== "undefined") {
  window.BingabuRanking = { getOrdinal, getRankedPlayers, getRankingPhrase };
}
