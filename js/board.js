/**
 * board.js — Board geometry definitions for the 14x14 cross-shaped board.
 *
 * Board layout (14×14):
 *   Rows 0–13, Cols 0–13
 *   Invalid corners: rows 0-2 × cols 0-2, rows 0-2 × cols 11-13
 *                    rows 11-13 × cols 0-2, rows 11-13 × cols 11-13
 *
 * Player zones (3-row arms):
 *   Top    (Yellow)  : rows 0–2,   cols 3–10
 *   Bottom (Red)     : rows 11–13, cols 3–10
 *   Left   (Green)   : rows 3–10,  cols 0–2
 *   Right  (Blue)    : rows 3–10,  cols 11–13
 *   Center            : rows 3–10,  cols 3–10
 */

export const BOARD_SIZE = 14;

/**
 * Returns true if (row, col) is a valid (non-corner) cell on the cross board.
 * @param {number} row
 * @param {number} col
 * @returns {boolean}
 */
export function isValidCell(row, col) {
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return false;
  // Top-left corner
  if (row <= 2 && col <= 2) return false;
  // Top-right corner
  if (row <= 2 && col >= 11) return false;
  // Bottom-left corner
  if (row >= 11 && col <= 2) return false;
  // Bottom-right corner
  if (row >= 11 && col >= 11) return false;
  return true;
}

/**
 * Returns the zone label for a cell: 'top', 'bottom', 'left', 'right', 'center', or null.
 * @param {number} row
 * @param {number} col
 * @returns {string|null}
 */
export function getCellZone(row, col) {
  if (!isValidCell(row, col)) return null;
  if (row <= 2)  return 'top';
  if (row >= 11) return 'bottom';
  if (col <= 2)  return 'left';
  if (col >= 11) return 'right';
  return 'center';
}

/**
 * Determines whether a cell should be light or dark.
 * Standard chessboard colouring: (row + col) % 2 === 0 → light.
 * @param {number} row
 * @param {number} col
 * @returns {'light'|'dark'}
 */
export function getCellColor(row, col) {
  return (row + col) % 2 === 0 ? 'light' : 'dark';
}

/**
 * Returns a cell's algebraic-style coordinate label (e.g. "a14", "n1").
 * Columns: a–n (left to right), Rows: 14–1 (top to bottom) for display.
 * @param {number} row
 * @param {number} col
 * @returns {string}
 */
export function cellLabel(row, col) {
  const colChar = String.fromCharCode(97 + col); // 'a' + col
  const rowNum  = BOARD_SIZE - row;
  return `${colChar}${rowNum}`;
}

/**
 * Generates the full list of valid cells in board order.
 * @returns {Array<{row: number, col: number}>}
 */
export function getAllValidCells() {
  const cells = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (isValidCell(r, c)) cells.push({ row: r, col: c });
    }
  }
  return cells;
}
