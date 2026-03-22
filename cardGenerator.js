/**
 * Generate a single 75-ball bingo card grid (square: 3×3, 4×4, or 5×5).
 * Column c uses numbers in [c*15+1, c*15+15]. Odd×odd grids get a center FREE.
 */

function shuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * @param {{ excludeStr?: string, preferStr?: string } | { exclude?: number[], prefer?: number[] }} [quirk]
 * @param {number} rows
 * @param {number} cols
 * @param {() => number} [rng]
 * @returns {(number|string)[][]}
 */
export function generateOneCard(quirk, rows, cols, rng = Math.random) {
  if (!Number.isInteger(rows) || !Number.isInteger(cols)) {
    throw new TypeError("rows and cols must be integers");
  }
  if (rows < 3 || cols < 3 || rows > 5 || cols > 5 || rows !== cols) {
    throw new RangeError("card size must be square 3×3, 4×4, or 5×5");
  }

  let exclude = [];
  let prefer = [];
  if (quirk) {
    if (Array.isArray(quirk.exclude)) exclude = quirk.exclude;
    else if (quirk.excludeStr != null) {
      exclude = String(quirk.excludeStr)
        .split(/[\s,]+/)
        .map((s) => parseInt(s, 10))
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= 75);
    }
    if (Array.isArray(quirk.prefer)) prefer = quirk.prefer;
    else if (quirk.preferStr != null) {
      prefer = String(quirk.preferStr)
        .split(/[\s,]+/)
        .map((s) => parseInt(s, 10))
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= 75);
    }
  }

  const excludeSet = new Set(exclude);
  const hasFree = rows % 2 === 1 && cols % 2 === 1;
  const freeRow = hasFree ? (rows - 1) >> 1 : -1;
  const freeCol = hasFree ? (cols - 1) >> 1 : -1;

  const colNums = [];
  for (let col = 0; col < cols; col++) {
    const start = col * 15 + 1;
    const needNums = hasFree && col === freeCol ? rows - 1 : rows;
    let pool = Array.from({ length: 15 }, (_, i) => start + i).filter((n) => !excludeSet.has(n));
    const preferredInCol = prefer.filter((n) => n >= start && n < start + 15);
    const chosen = [];
    for (const n of shuffle(preferredInCol, rng).slice(0, needNums)) {
      if (pool.includes(n)) {
        chosen.push(n);
        pool = pool.filter((x) => x !== n);
      }
    }
    const need = needNums - chosen.length;
    const rest = shuffle(pool, rng).slice(0, need);
    const nums = shuffle([...chosen, ...rest], rng);
    if (nums.length !== needNums) {
      throw new Error("Not enough numbers in column pool after exclude/prefer");
    }
    colNums.push(nums);
  }

  const card = Array.from({ length: rows }, () => Array(cols));
  for (let col = 0; col < cols; col++) {
    const nums = colNums[col];
    let idx = 0;
    for (let row = 0; row < rows; row++) {
      if (hasFree && row === freeRow && col === freeCol) {
        card[row][col] = "FREE";
      } else {
        card[row][col] = nums[idx++];
      }
    }
  }
  return card;
}
