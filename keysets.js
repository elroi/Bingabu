import enWordsBeginner from "./keysets/en-words-beginner.json";
import iconsKidsV1 from "./keysets/icons-kids-v1.json";

export const NUMBERS_KEY_SET_ID = "numbers";
export const EN_WORDS_BEGINNER_ID = "en-words-beginner";
export const ICONS_KIDS_V1_ID = "icons-kids-v1";

/** @type {{ id: string, label: string }[]} */
export const KEY_SET_OPTIONS = [
  { id: NUMBERS_KEY_SET_ID, label: "Numbers (1–75)" },
  { id: EN_WORDS_BEGINNER_ID, label: "English words (beginner)" },
  { id: ICONS_KIDS_V1_ID, label: "Pictures / emoji (kids)" },
];

const KEY_SET_DATA = {
  [EN_WORDS_BEGINNER_ID]: enWordsBeginner,
  [ICONS_KIDS_V1_ID]: iconsKidsV1,
};

const VALID_IDS = new Set(KEY_SET_OPTIONS.map((o) => o.id));

/**
 * @param {unknown} id
 * @returns {string}
 */
export function normalizeKeySetId(id) {
  if (id === NUMBERS_KEY_SET_ID) return NUMBERS_KEY_SET_ID;
  if (typeof id === "string" && VALID_IDS.has(id)) return id;
  return NUMBERS_KEY_SET_ID;
}

/**
 * @param {Record<string, { text?: string, speech?: string, image?: string }>} data
 */
export function validateKeySetEntries(data) {
  const keys = Object.keys(data).filter((k) => /^\d+$/.test(k));
  if (keys.length !== 75) {
    throw new Error(`Expected 75 numeric keys, got ${keys.length}`);
  }
  for (let i = 1; i <= 75; i++) {
    const e = data[String(i)];
    if (!e || typeof e.text !== "string" || e.text.length === 0) {
      throw new Error(`Missing text for ball ${i}`);
    }
    if (typeof e.speech !== "string" || e.speech.length === 0) {
      throw new Error(`Missing speech for ball ${i}`);
    }
  }
}

validateKeySetEntries(enWordsBeginner);
validateKeySetEntries(iconsKidsV1);

/**
 * @param {number} ballId
 * @param {string} keySetId
 * @returns {{ text: string, speech: string, image: string | null }}
 */
export function resolveDisplay(ballId, keySetId) {
  const id = normalizeKeySetId(keySetId);
  if (id === NUMBERS_KEY_SET_ID) {
    const n = String(ballId);
    return { text: n, speech: n, image: null };
  }
  const map = KEY_SET_DATA[id];
  const entry = map[String(ballId)];
  if (!entry) {
    const n = String(ballId);
    return { text: n, speech: n, image: null };
  }
  const image = typeof entry.image === "string" && entry.image.length > 0 ? entry.image : null;
  return {
    text: entry.text,
    speech: entry.speech,
    image,
  };
}

/**
 * @param {HTMLElement} cell
 * @param {number} ballId
 * @param {string} keySetId
 */
export function fillCallerBoardCell(cell, ballId, keySetId) {
  if (!cell) return;
  cell.setAttribute("data-ball-id", String(ballId));
  const d = resolveDisplay(ballId, keySetId);
  cell.textContent = "";
  const nid = normalizeKeySetId(keySetId);
  cell.classList.toggle("number-cell-icons", nid === ICONS_KIDS_V1_ID);
  cell.classList.toggle("number-cell-words", nid === EN_WORDS_BEGINNER_ID);
  cell.setAttribute("aria-label", `${d.speech}, ball ${ballId}`);
  if (d.image) {
    const img = document.createElement("img");
    img.src = d.image;
    img.alt = d.speech;
    img.className = "number-cell-img";
    cell.appendChild(img);
  } else {
    cell.textContent = d.text;
  }
}

/**
 * @param {string | undefined} defaultId
 * @param {unknown} bySlot
 * @param {number} numParticipants
 * @returns {string[]}
 */
export function normalizeDisplayKeySetBySlot(defaultId, bySlot, numParticipants) {
  const def = normalizeKeySetId(defaultId);
  const n = Math.max(0, Math.min(12, Math.floor(numParticipants)));
  const out = [];
  if (!Array.isArray(bySlot)) {
    for (let i = 0; i < n; i++) out.push(def);
    return out;
  }
  for (let i = 0; i < n; i++) {
    out.push(normalizeKeySetId(bySlot[i] ?? def));
  }
  return out;
}

/**
 * @param {{ displayKeySetId?: string, displayKeySetBySlot?: string[] }} state
 * @param {number} slotIndex
 */
export function getEffectiveKeySetIdForSlot(state, slotIndex) {
  const def = normalizeKeySetId(state && state.displayKeySetId);
  const arr = state && Array.isArray(state.displayKeySetBySlot) ? state.displayKeySetBySlot : [];
  if (slotIndex >= 0 && slotIndex < arr.length) {
    return normalizeKeySetId(arr[slotIndex]);
  }
  return def;
}

/**
 * Host mapping: labels for one ball for every participant column.
 * @param {{ displayKeySetId?: string, displayKeySetBySlot?: string[], numParticipants?: number, participantNames?: string[] }} state
 * @param {number} ballId
 * @returns {{ canonical: string, rows: { name: string, label: string, speech: string }[] }}
 */
export function getMappingRowsForBall(state, ballId) {
  const np = typeof state.numParticipants === "number" ? state.numParticipants : 0;
  const names = Array.isArray(state.participantNames) ? state.participantNames : [];
  const bySlot = normalizeDisplayKeySetBySlot(state.displayKeySetId, state.displayKeySetBySlot, np);
  const letter =
    ballId <= 15 ? "B" : ballId <= 30 ? "I" : ballId <= 45 ? "N" : ballId <= 60 ? "G" : "O";
  const canonical = `${letter}-${ballId}`;
  const rows = [];
  for (let i = 0; i < np; i++) {
    const d = resolveDisplay(ballId, bySlot[i]);
    const name = (names[i] && String(names[i]).trim()) || `Player ${i + 1}`;
    rows.push({ name, label: d.text, speech: d.speech });
  }
  return { canonical, rows };
}
