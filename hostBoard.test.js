import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { syncCallerBoardMarks } from "./hostBoard.js";

describe("syncCallerBoardMarks", () => {
  it("marks cells by data-ball-id, not innerText (non-numeric labels)", () => {
    const dom = new JSDOM(
      `<div id="bingo-board">
        <div class="number-cell" data-ball-id="3">🐝</div>
        <div class="number-cell" data-ball-id="4">tree</div>
      </div>`
    );
    const board = dom.window.document.getElementById("bingo-board");
    syncCallerBoardMarks(board, [3], 3);
    const cells = [...board.querySelectorAll(".number-cell")];
    expect(cells[0].classList.contains("marked")).toBe(true);
    expect(cells[0].classList.contains("latest-draw")).toBe(true);
    expect(cells[1].classList.contains("marked")).toBe(false);
  });

  it("clears latest-draw when lastNum undefined", () => {
    const dom = new JSDOM(
      `<div id="bingo-board"><div class="number-cell marked latest-draw" data-ball-id="1">x</div></div>`
    );
    const board = dom.window.document.getElementById("bingo-board");
    syncCallerBoardMarks(board, [1], undefined);
    const cell = board.querySelector(".number-cell");
    expect(cell.classList.contains("marked")).toBe(true);
    expect(cell.classList.contains("latest-draw")).toBe(false);
  });
});
