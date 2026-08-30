/**
 * renderer.js — DOM rendering for the chess board (Step 1).
 *
 * Responsible for:
 *  - Building the 14×14 grid of cell elements
 *  - Assigning light/dark, zone, and invalid classes
 *  - Attaching coordinate labels on edge cells
 *  - Providing helpers used by later steps (piece rendering, highlights)
 */

import { BOARD_SIZE, isValidCell, getCellColor, getCellZone, cellLabel } from './board.js';

/** @type {HTMLElement[][]} — 2D array of cell DOM elements */
let cellEls = [];

/**
 * Build the entire board DOM inside #chess-board.
 * Call once after the game screen is shown.
 * @param {string[]} activePlayers — list of active player IDs (to decide which arms show zone tint)
 */
export function renderBoard(activePlayers = []) {
  const boardEl = document.getElementById('chess-board');
  boardEl.innerHTML = '';
  cellEls = [];

  // Map seat → zone name
  const seatZoneMap = {
    red:    'bottom',
    yellow: 'top',
    green:  'left',
    blue:   'right',
  };
  const activeZones = new Set(activePlayers.map(p => seatZoneMap[p]).filter(Boolean));

  for (let row = 0; row < BOARD_SIZE; row++) {
    cellEls[row] = [];
    for (let col = 0; col < BOARD_SIZE; col++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      cell.dataset.row = row;
      cell.dataset.col = col;

      // Unique ID for accessibility / testing
      cell.id = `cell-${row}-${col}`;

      if (!isValidCell(row, col)) {
        cell.classList.add('invalid');
        cell.setAttribute('aria-hidden', 'true');
      } else {
        // Light / dark colouring
        cell.classList.add(getCellColor(row, col));

        // Zone tinting (only for active player zones)
        const zone = getCellZone(row, col);
        if (zone && zone !== 'center' && activeZones.has(zone)) {
          cell.classList.add(`zone-${zone}`);
        }

        // Accessibility
        const label = cellLabel(row, col);
        cell.setAttribute('role', 'gridcell');
        cell.setAttribute('aria-label', `Square ${label}`);
        cell.dataset.label = label;

        // Coordinate labels — only on the border cells of valid squares
        _addCoordLabel(cell, row, col);
      }

      boardEl.appendChild(cell);
      cellEls[row][col] = cell;
    }
  }
}

/**
 * Adds small coordinate labels to cells on the edges of the board.
 */
function _addCoordLabel(cell, row, col) {
  const label = cellLabel(row, col);
  const colChar = label[0];
  const rowNum  = label.slice(1);

  // Bottom edge of a column segment → show file letter
  const isBottomEdgeFile = (
    (row === BOARD_SIZE - 1 && col >= 3 && col <= 10) ||
    (row === 10 && (col <= 2 || col >= 11))
  );
  // Left edge of a rank segment → show rank number
  const isLeftEdgeRank = (
    (col === 0 && row >= 3 && row <= 10) ||
    (col === 3 && (row <= 2 || row >= 11))
  );

  if (isBottomEdgeFile) {
    const span = document.createElement('span');
    span.classList.add('coord-label', 'coord-col');
    span.textContent = colChar;
    cell.appendChild(span);
  }
  if (isLeftEdgeRank) {
    const span = document.createElement('span');
    span.classList.add('coord-label', 'coord-row');
    span.textContent = rowNum;
    cell.appendChild(span);
  }
}

/**
 * Returns the DOM element for a cell.
 * @param {number} row
 * @param {number} col
 * @returns {HTMLElement|null}
 */
export function getCellEl(row, col) {
  return cellEls[row]?.[col] ?? null;
}

/**
 * Clears all highlight classes from every cell.
 */
export function clearHighlights() {
  document.querySelectorAll('.cell.selected, .cell.valid-move, .cell.valid-capture, .cell.in-check')
    .forEach(el => el.classList.remove('selected', 'valid-move', 'valid-capture', 'in-check'));
}

/**
 * Places a piece element inside a cell.
 * @param {number} row
 * @param {number} col
 * @param {string} symbol   — Unicode chess symbol (e.g. '♔')
 * @param {string} playerId — 'red' | 'yellow' | 'green' | 'blue'
 * @param {string} pieceType — e.g. 'king', 'queen', etc. (for aria)
 */
export function placePiece(row, col, symbol, playerId, pieceType) {
  const cell = getCellEl(row, col);
  if (!cell) return;

  const piece = document.createElement('span');
  piece.classList.add('piece', `piece-${playerId}`);
  piece.textContent = symbol;
  piece.dataset.player   = playerId;
  piece.dataset.pieceType = pieceType;
  piece.dataset.row      = row;
  piece.dataset.col      = col;
  piece.setAttribute('role', 'img');
  piece.setAttribute('aria-label', `${playerId} ${pieceType}`);
  cell.appendChild(piece);
}

/**
 * Removes any piece element from a cell.
 * @param {number} row
 * @param {number} col
 */
export function removePiece(row, col) {
  const cell = getCellEl(row, col);
  if (!cell) return;
  const piece = cell.querySelector('.piece');
  if (piece) piece.remove();
}

/**
 * Updates the turn indicator panel with current player info.
 * @param {{id: string, name: string, cssColor: string}} player
 */
export function updateTurnIndicator(player) {
  const avatar = document.getElementById('turn-avatar');
  const name   = document.getElementById('turn-name');
  const indicator = document.getElementById('turn-indicator');
  if (!avatar || !name) return;

  avatar.style.background    = player.cssColor;
  avatar.style.borderColor   = player.cssColor;
  avatar.style.boxShadow     = `0 0 12px ${player.cssColor}88`;
  name.textContent            = player.name;
  indicator.style.borderColor = `${player.cssColor}55`;
}

/**
 * Renders the player status list in the left panel.
 * @param {Array<{id, name, cssColor, cssRGB}>} players
 * @param {string} currentPlayerId
 * @param {Set<string>} eliminatedIds
 */
export function renderPlayersList(players, currentPlayerId, eliminatedIds = new Set()) {
  const container = document.getElementById('players-list');
  if (!container) return;

  container.innerHTML = '';
  players.forEach(p => {
    const isActive   = p.id === currentPlayerId;
    const isElim     = eliminatedIds.has(p.id);

    const item = document.createElement('div');
    item.classList.add('player-item');
    if (isActive) item.classList.add('active-turn');
    if (isElim)   item.classList.add('eliminated');
    item.style.setProperty('--player-color', p.cssColor);
    item.style.setProperty('--player-rgb',   p.cssRGB);

    const statusText = isElim ? 'Out' : isActive ? '▶' : '';
    const badgeClass = isElim ? 'badge-elim' : isActive ? 'badge-active' : '';

    item.innerHTML = `
      <span class="player-color-dot" style="background:${p.cssColor}"></span>
      ${statusText ? `<span class="player-status-badge ${badgeClass}">${statusText}</span>` : ''}
    `;
    container.appendChild(item);
  });
}
