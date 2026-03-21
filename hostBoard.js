/**
 * Host caller board: cells use data-ball-id (1–75), not parsed innerText.
 * @param {ParentNode} boardRoot - e.g. document.getElementById("bingo-board")
 * @param {number[]} drawnSequence
 * @param {number|undefined} lastNum
 */
export function syncCallerBoardMarks(boardRoot, drawnSequence, lastNum) {
  if (!boardRoot) return;
  const drawn = new Set(drawnSequence);
  boardRoot.querySelectorAll(".number-cell[data-ball-id]").forEach((cell) => {
    const raw = cell.getAttribute("data-ball-id");
    const id = raw != null ? parseInt(raw, 10) : NaN;
    if (!Number.isInteger(id) || id < 1 || id > 75) return;
    cell.classList.toggle("marked", drawn.has(id));
    cell.classList.toggle("latest-draw", id === lastNum);
  });
}
