/**
 * main.js — Entry point for ChessX Multiplayer Chess.
 *
 * Handles:
 *  - Setup screen interactions (player count selection)
 *  - Screen transitions (setup → game)
 *  - Initial board + player panel rendering (Step 1)
 *
 * Steps 2+ (pieces, movement, rules) will be added in subsequent modules.
 */

import { renderBoard, updateTurnIndicator, renderPlayersList } from './renderer.js';
import { getActivePlayers, PLAYER_DEFS, TURN_ORDER } from './players.js';

// ── State ─────────────────────────────────────────────────────────────────────
let selectedPlayerCount = null;   // 2 | 3 | 4

// ── DOM references ────────────────────────────────────────────────────────────
const setupScreen   = document.getElementById('setup-screen');
const gameScreen    = document.getElementById('game-screen');
const startBtn      = document.getElementById('start-btn');
const backBtn       = document.getElementById('back-to-menu-btn');
const playerBtns    = document.querySelectorAll('.player-btn');
const startBtnText  = startBtn.querySelector('.start-btn-text');

// ── Setup screen logic ────────────────────────────────────────────────────────

/**
 * Selects a player count option.
 * @param {number} count
 */
function selectPlayerCount(count) {
  selectedPlayerCount = count;

  // Update button states
  playerBtns.forEach(btn => {
    const isSelected = Number(btn.dataset.count) === count;
    btn.classList.toggle('selected', isSelected);
    btn.setAttribute('aria-pressed', String(isSelected));
  });

  // Enable start button
  startBtn.disabled = false;
  startBtn.removeAttribute('aria-disabled');
  startBtnText.textContent = `Start ${count}-Player Game`;
}

// Attach player count button events
playerBtns.forEach(btn => {
  btn.setAttribute('aria-pressed', 'false');
  btn.addEventListener('click', () => {
    selectPlayerCount(Number(btn.dataset.count));
  });

  // Keyboard support
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectPlayerCount(Number(btn.dataset.count));
    }
  });
});

// ── Screen transitions ────────────────────────────────────────────────────────

/** Switches the visible screen. */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

/** Starts the game with the chosen player count. */
function startGame() {
  if (!selectedPlayerCount) return;

  const activePlayerIds = getActivePlayers(selectedPlayerCount);
  const activePlayers   = activePlayerIds.map(id => PLAYER_DEFS[id]);

  // Transition to game screen
  showScreen('game-screen');

  // Build the board
  renderBoard(activePlayerIds);

  // Initialise the turn indicator to the first player (Red always goes first)
  const firstPlayer = PLAYER_DEFS['red'];
  updateTurnIndicator(firstPlayer);
  renderPlayersList(activePlayers, 'red', new Set());

  // NOTE: Piece placement and game logic come in Step 2.
}

/** Returns to the setup screen. */
function returnToMenu() {
  showScreen('setup-screen');
  // Reset selection
  selectedPlayerCount = null;
  playerBtns.forEach(btn => {
    btn.classList.remove('selected');
    btn.setAttribute('aria-pressed', 'false');
  });
  startBtn.disabled = true;
  startBtnText.textContent = 'Select a mode to begin';
}

// ── Event listeners ───────────────────────────────────────────────────────────
startBtn.addEventListener('click', startGame);
backBtn.addEventListener('click', returnToMenu);

// Keyboard shortcut: Enter to start when a count is selected
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && setupScreen.classList.contains('active') && selectedPlayerCount) {
    startGame();
  }
});

// ── Init ──────────────────────────────────────────────────────────────────────
// Show setup screen on load (already has .active in HTML, but ensure it)
showScreen('setup-screen');
