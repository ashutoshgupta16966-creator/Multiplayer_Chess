/**
 * players.js — Player definitions and configuration.
 *
 * Seats are fixed:
 *   bottom (Red)   — row 13, cols 3–10   — faces upward
 *   top    (Yellow)— row 0,  cols 3–10   — faces downward
 *   left   (Green) — rows 3–10, col 0    — faces rightward
 *   right  (Blue)  — rows 3–10, col 13   — faces leftward
 *
 * For 2 players  : Red (bottom) + Yellow (top)
 * For 3 players  : Red + Yellow + Green
 * For 4 players  : Red + Yellow + Green + Blue
 */

export const PLAYER_DEFS = {
  red: {
    id:         'red',
    name:       'Red',
    seat:       'bottom',
    cssColor:   '#ef4444',
    cssRGB:     '239,68,68',
    textClass:  'piece-red',
    turnOrder:  0,
  },
  yellow: {
    id:         'yellow',
    name:       'Yellow',
    seat:       'top',
    cssColor:   '#facc15',
    cssRGB:     '250,204,21',
    textClass:  'piece-yellow',
    turnOrder:  1,
  },
  green: {
    id:         'green',
    name:       'Green',
    seat:       'left',
    cssColor:   '#22c55e',
    cssRGB:     '34,197,94',
    textClass:  'piece-green',
    turnOrder:  2,
  },
  blue: {
    id:         'blue',
    name:       'Blue',
    seat:       'right',
    cssColor:   '#3b82f6',
    cssRGB:     '59,130,246',
    textClass:  'piece-blue',
    turnOrder:  3,
  },
};

// Clockwise order for all four seats
export const TURN_ORDER = ['red', 'yellow', 'green', 'blue'];

/**
 * Returns the list of active player IDs for a given player count.
 * @param {2|3|4} count
 * @returns {string[]}
 */
export function getActivePlayers(count) {
  switch (count) {
    case 2: return ['red', 'yellow'];
    case 3: return ['red', 'yellow', 'green'];
    case 4: return ['red', 'yellow', 'green', 'blue'];
    default: throw new Error(`Invalid player count: ${count}`);
  }
}
