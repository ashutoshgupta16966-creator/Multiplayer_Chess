/**
 * chessx.js — ChessX Multiplayer Chess (2–4 Players)
 * Single-file bundle (no ES modules) for direct file:// compatibility.
 *
 * Step 1: Board rendering + player count setup screen.
 * Steps 2+ to follow.
 */

/* ════════════════════════════════════════════════════════════
   BOARD GEOMETRY
   14×14 cross-shaped board.
   Invalid corners: rows 0-2 × cols 0-2 / 11-13,
                    rows 11-13 × cols 0-2 / 11-13
   ════════════════════════════════════════════════════════════ */
var BOARD_SIZE = 14;

/** Global set of active zones (top, bottom, left, right) */
var activeZonesSet = new Set();

function isValidCell(row, col) {
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return false;

  if (BOARD_SIZE === 14) {

    // ── 3P New Style: HEXAGONAL CHESS LOCK ─────────────────────
    // 6-sided hexagonal boundary (matching Hexagonal Chess Lock reference image).
    // Flat top and bottom, angled left and right vertices.
    if (boardStyleMode === 'ns3-hexagonal' || (boardStyleMode === 'newstyle' && (typeof selectedPlayerCount !== 'undefined' && selectedPlayerCount === 3))) {
      // Cut top-left corner
      if (row + col < 3) return false;
      // Cut top-right corner
      if (row + (13 - col) < 3) return false;
      // Cut bottom-left corner
      if ((13 - row) + col < 3) return false;
      // Cut bottom-right corner
      if ((13 - row) + (13 - col) < 3) return false;
      return true;
    }

    // ── 4P Style 1: OCTAGONAL CHESS LOCK ───────────────────────
    // 8-sided octagonal boundary with truncated corners.
    // Each side = 8 squares, diagonal cuts = 3 squares each corner.
    if (boardStyleMode === 'ns4-octagonal' || (boardStyleMode === 'newstyle' && (typeof selectedPlayerCount === 'undefined' || selectedPlayerCount === 4))) {
      // Cut top-left diagonal
      if (row + col < 3) return false;
      // Cut top-right diagonal
      if (row - col > 10) return false;   // row + (13-col) < 3 → row - col > 10
      // Cut bottom-left diagonal
      if (col - row > 10) return false;   // (13-row) + col < 3 → col - row > 10
      // Cut bottom-right diagonal
      if (row + col > 23) return false;   // (13-row) + (13-col) < 3 → row+col > 23
      return true;
    }

    // ── 4P Style 2: DIAMOND CHESS LOCK ─────────────────────────
    // 4 diamond-arm quadrants extending from the 4 sides of the 14×14 grid.
    // Each arm is a triangular wedge. There is a genuine hollow diamond void
    // at the centre with Manhattan radius 3.5 from centre (6.5, 6.5).
    if (boardStyleMode === 'ns4-diamond') {
      var cr = row - 6.5;
      var cc = col - 6.5;
      var manhattan = Math.abs(cr) + Math.abs(cc);
      // Central diamond void: strictly inside (non-inclusive) radius 4.0
      if (manhattan < 4.0) return false;
      // Outer boundary: must not exceed radius 13.5 (full grid is ~13.5 max)
      if (manhattan > 13.5) return false;
      // Quadrant arm: the cell must be in one of the 4 triangular directions.
      // A cell is in a quadrant arm if abs(cr) > abs(cc) (top/bottom arm)
      // or abs(cc) > abs(cr) (left/right arm).
      // This means cells on the exact diagonals (abs(cr)==abs(cc)) are excluded.
      if (Math.abs(cr) === Math.abs(cc)) return false;
      return true;
    }

    // ── 4P Style 3: CIRCULAR CHESS LOCK ─────────────────────────
    // Annular ring (doughnut): hollow circle centre, circular outer boundary.
    // Inner radius void = 2.5 cells from centre, outer = 7.4 cells.
    // Outer radius 7.4 covers piece starting positions at rows/cols 0,13.
    if (boardStyleMode === 'ns4-circular') {
      var dr = row - 6.5;
      var dc = col - 6.5;
      var dist = Math.sqrt(dr * dr + dc * dc);
      return dist >= 2.5 && dist <= 7.4;
    }

    // ── Standard Ordinary cross-shaped board ────────────────────
    if (row <= 2 && col <= 2) return false;
    if (row <= 2 && col >= 11) return false;
    if (row >= 11 && col <= 2) return false;
    if (row >= 11 && col >= 11) return false;
  }
  return true;
}


function getCellZone(row, col) {
  if (!isValidCell(row, col)) return null;
  if (BOARD_SIZE === 14) {
    if (row <= 2) return 'top';
    if (row >= 11) return 'bottom';
    if (col <= 2) return 'left';
    if (col >= 11) return 'right';
    return 'center';
  }
  return 'center';
}

function getCellColor(row, col) {
  return (row + col) % 2 === 0 ? 'light' : 'dark';
}

function cellLabel(row, col) {
  return String.fromCharCode(97 + col) + (BOARD_SIZE - row);
}

/* ════════════════════════════════════════════════════════════
   SINGLE SOURCE OF TRUTH — PLAYER COLOR PALETTES & DEFINITIONS
   ════════════════════════════════════════════════════════════ */
const SKIN_PALETTES = {
  color_standard: {
    red: { name: 'Gold', cssColor: '#FFD700', cssRGB: '255,215,0' },
    yellow: { name: 'Sapphire', cssColor: '#0F52BA', cssRGB: '15,82,186' },
    green: { name: 'Emerald', cssColor: '#50C878', cssRGB: '80,200,120' },
    blue: { name: 'Ruby', cssColor: '#E0115F', cssRGB: '224,17,95' }
  },
  color_golden: {
    red: { name: 'Shining Gold', cssColor: '#FFD700', cssRGB: '255,215,0' },
    yellow: { name: 'Sun Gold', cssColor: '#FFC700', cssRGB: '255,199,0' },
    green: { name: 'Crown Gold', cssColor: '#E6B800', cssRGB: '230,184,0' },
    blue: { name: 'Imperial Gold', cssColor: '#D4AF37', cssRGB: '212,175,55' }
  },
  color_crystal: {
    red: { name: 'Cyan Crystal', cssColor: '#00FFFF', cssRGB: '0,255,255' },
    yellow: { name: 'Crimson Red', cssColor: '#E02424', cssRGB: '224,36,36' },
    green: { name: 'Magenta Neon', cssColor: '#FF00FF', cssRGB: '255,0,255' },
    blue: { name: 'Diamond White', cssColor: '#FFFFFF', cssRGB: '255,255,255' }
  }
};

var PLAYER_DEFS = {
  red: {
    id: 'red', name: 'Gold', seat: 'bottom',
    cssColor: '#FFD700', cssRGB: '255,215,0',
  },
  yellow: {
    id: 'yellow', name: 'Sapphire', seat: 'top',
    cssColor: '#0F52BA', cssRGB: '15,82,186',
  },
  green: {
    id: 'green', name: 'Emerald', seat: 'left',
    cssColor: '#50C878', cssRGB: '80,200,120',
  },
  blue: {
    id: 'blue', name: 'Ruby', seat: 'right',
    cssColor: '#E0115F', cssRGB: '224,17,95',
  },
};

function syncPlayerColorPalette() {
  var skinId = (typeof StoreManager !== 'undefined') ? StoreManager.getEquipped('color') : 'color_standard';
  var palette = SKIN_PALETTES[skinId] || SKIN_PALETTES.color_standard;

  // 1. Dynamic Single Source of Truth update for PLAYER_DEFS
  ['red', 'yellow', 'green', 'blue'].forEach(function (pid) {
    if (palette[pid] && PLAYER_DEFS[pid]) {
      PLAYER_DEFS[pid].name = palette[pid].name;
      PLAYER_DEFS[pid].cssColor = palette[pid].cssColor;
      PLAYER_DEFS[pid].cssRGB = palette[pid].cssRGB;
    }
  });

  // 2. Dynamic subtext labels for 2P, 3P, and 4P cards
  var p2Detail = document.querySelector('#btn-2p .player-btn-detail');
  if (p2Detail) {
    p2Detail.textContent = PLAYER_DEFS.red.name + ' vs ' + PLAYER_DEFS.yellow.name;
  }

  var p3Detail = document.querySelector('#btn-3p .player-btn-detail');
  if (p3Detail) {
    p3Detail.textContent = PLAYER_DEFS.red.name + ' · ' + PLAYER_DEFS.yellow.name + ' · ' + PLAYER_DEFS.green.name;
  }

  var p4Detail = document.querySelector('#btn-4p .player-btn-detail');
  if (p4Detail) {
    p4Detail.textContent = PLAYER_DEFS.red.name + ' · ' + PLAYER_DEFS.yellow.name + ' · ' + PLAYER_DEFS.green.name + ' · ' + PLAYER_DEFS.blue.name;
  }

  // 3. Dynamic Seat Diagram dots
  var seats = [
    { btnId: 'btn-2p', dots: { bottom: 'red', top: 'yellow' } },
    { btnId: 'btn-3p', dots: { bottom: 'red', top: 'yellow', left: 'green' } },
    { btnId: 'btn-4p', dots: { bottom: 'red', top: 'yellow', left: 'green', right: 'blue' } }
  ];

  seats.forEach(function (s) {
    var btn = document.getElementById(s.btnId);
    if (!btn) return;
    Object.keys(s.dots).forEach(function (pos) {
      var dot = btn.querySelector('.dot-' + pos);
      if (dot) {
        var pid = s.dots[pos];
        dot.style.setProperty('--c', PLAYER_DEFS[pid].cssColor);
        dot.style.backgroundColor = PLAYER_DEFS[pid].cssColor;
      }
    });
  });

  // 4. Dynamic Position Legends on Setup Screen
  var legendContainer = document.querySelector('.setup-legend');
  if (legendContainer) {
    legendContainer.innerHTML = `
      <div class="legend-item"><span class="legend-dot" style="background:${PLAYER_DEFS.red.cssColor}"></span> ${PLAYER_DEFS.red.name} — Bottom</div>
      <div class="legend-item"><span class="legend-dot" style="background:${PLAYER_DEFS.yellow.cssColor}"></span> ${PLAYER_DEFS.yellow.name} — Top</div>
      <div class="legend-item"><span class="legend-dot" style="background:${PLAYER_DEFS.green.cssColor}"></span> ${PLAYER_DEFS.green.name} — Left</div>
      <div class="legend-item"><span class="legend-dot" style="background:${PLAYER_DEFS.blue.cssColor}"></span> ${PLAYER_DEFS.blue.name} — Right</div>
    `;
  }

  // 5. Dynamic Mode Selection Screen description text
  var compDesc = document.querySelector('#mode-computer .mode-btn-desc');
  if (compDesc) {
    compDesc.textContent = 'You play ' + PLAYER_DEFS.red.name + ' — AI controls the rest';
  }
}

const TURN_ORDER_ALL = ['red', 'yellow', 'green', 'blue'];

function getActivePlayers(count) {
  switch (count) {
    case 2: return ['red', 'yellow'];
    case 3: return ['red', 'yellow', 'green'];
    case 4: return ['red', 'yellow', 'green', 'blue'];
    default: throw new Error('Invalid count: ' + count);
  }
}

/* ════════════════════════════════════════════════════════════
   RENDERER — Board DOM construction
   ════════════════════════════════════════════════════════════ */
let cellEls = []; // 2D array of <div> elements

// Keep all interaction state explicitly initialized. The previous bundle
// relied on implicit globals, so the first attempt to attach the board
// listener could throw before a move was ever processed.
var boardState = [];
var selectedCell = null;
var validMoves = [];
var boardClickHandlerRef = null;
var gameActivePlayers = [];
var currentPlayerIndex = 0;
var eliminatedSet = new Set();
var aiPlayerIds = new Set();
var moveHistory = [];
var lastBoardInput = { key: '', time: 0 };
var boardStyleMode = 'ordinary'; // 'ordinary' | 'newstyle' (3/4 player only)

function renderBoard(activePlayerIds) {
  BOARD_SIZE = (activePlayerIds.length === 2) ? 8 : 14;

  const boardEl = document.getElementById('chess-board');
  boardEl.innerHTML = '';
  cellEls = [];

  if (BOARD_SIZE === 8) {
    boardEl.classList.add('mode-2p');
    boardEl.classList.remove('mode-multi');
    boardEl.setAttribute('aria-label', '8x8 chess board');
  } else {
    boardEl.classList.add('mode-multi');
    boardEl.classList.remove('mode-2p');
    boardEl.setAttribute('aria-label', '14x14 chess board');
  }

  // Apply / remove NS shape classes (cleared first)
  var allNS4Classes = [
    'style-ns4-hex', 'style-ns4-ring', 'style-ns4-diamond',
    'style-ns4-octagonal', 'style-ns4-circular', 'style-ns3-hexagonal', 'style-newstyle'
  ];
  allNS4Classes.forEach(function (cls) { boardEl.classList.remove(cls); });
  if (boardStyleMode === 'ns4-octagonal') boardEl.classList.add('style-ns4-octagonal');
  else if (boardStyleMode === 'ns4-diamond') boardEl.classList.add('style-ns4-diamond');
  else if (boardStyleMode === 'ns4-circular') boardEl.classList.add('style-ns4-circular');
  else if (boardStyleMode === 'ns3-hexagonal' || (boardStyleMode === 'newstyle' && activePlayerIds.length === 3)) {
    boardEl.classList.add('style-ns3-hexagonal');
  } else if (boardStyleMode === 'newstyle') {
    boardEl.classList.add('style-ns4-octagonal');
  }

  const seatZoneMap = { red: 'bottom', yellow: 'top', green: 'left', blue: 'right' };
  activeZonesSet = new Set(activePlayerIds.map(p => seatZoneMap[p]).filter(Boolean));

  // Ensure CSS grid templates are not overridden dynamically
  boardEl.style.gridTemplateRows = '';
  boardEl.style.gridTemplateColumns = '';

  for (let row = 0; row < BOARD_SIZE; row++) {
    cellEls[row] = [];
    for (let col = 0; col < BOARD_SIZE; col++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      cell.dataset.row = row;
      cell.dataset.col = col;
      cell.id = `cell-${row}-${col}`;

      if (!isValidCell(row, col)) {
        cell.classList.add('invalid');
        cell.setAttribute('aria-hidden', 'true');
      } else {
        // Light / dark squares
        cell.classList.add(getCellColor(row, col));

        // Zone tint (only for active player arms in 14x14)
        const zone = getCellZone(row, col);
        if (zone && zone !== 'center' && activeZonesSet.has(zone)) {
          cell.classList.add(`zone-${zone}`);
        }

        // Accessibility
        const lbl = cellLabel(row, col);
        cell.setAttribute('role', 'gridcell');
        cell.setAttribute('aria-label', 'Square ' + lbl);
        cell.dataset.label = lbl;

        // Coordinate hints on edge cells
        _addCoordLabel(cell, row, col);
      }

      // Bind directly to every real cell. This remains reliable after the
      // board is rebuilt for a different player mode.
      bindCellInput(cell);
      boardEl.appendChild(cell);
      cellEls[row][col] = cell;
    }
  }

  // After all cells rendered, update the visual shape overlay
  updateBoardShapeOverlay();
}

/**
 * Updates the SVG #board-shape-overlay to draw the exact outer boundary
 * matching the reference Chess Lock images, without clipping pointer events.
 */
function updateBoardShapeOverlay() {
  var svg = document.getElementById('board-shape-overlay');
  if (!svg) return;

  // Clear previous overlay content (keep <defs>)
  var defs = svg.querySelector('defs');
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  if (defs) svg.appendChild(defs);

  var boardEl = document.getElementById('chess-board');
  if (!boardEl) return;

  // Hide overlay for normal modes
  if (boardStyleMode === 'ordinary' || BOARD_SIZE === 8) {
    svg.style.display = 'none';
    return;
  }

  svg.style.display = 'block';

  // Match the overlay exactly to the chess-board element position
  var rect = boardEl.getBoundingClientRect();
  var parentRect = boardEl.parentElement.getBoundingClientRect();
  var x = rect.left - parentRect.left;
  var y = rect.top - parentRect.top;
  var W = rect.width;
  var H = rect.height;

  svg.setAttribute('width', parentRect.width);
  svg.setAttribute('height', parentRect.height);
  svg.style.position = 'absolute';
  svg.style.top = '0';
  svg.style.left = '0';
  svg.style.pointerEvents = 'none';
  svg.style.zIndex = '2';

  var svgNS = 'http://www.w3.org/2000/svg';

  if (boardStyleMode === 'ns3-hexagonal' || (boardStyleMode === 'newstyle' && typeof selectedPlayerCount !== 'undefined' && selectedPlayerCount === 3)) {
    // 3P Hexagonal Chess Lock: symmetrical boundary matching the 3 player sectors (Red, Yellow, Green)
    var cutX = W * (3 / 14);
    var cutY = H * (3 / 14);
    var hexPoly = document.createElementNS(svgNS, 'polygon');
    var hexPts = [
      (x + cutX) + ',' + y,
      (x + W - cutX) + ',' + y,
      (x + W) + ',' + (y + cutY),
      (x + W) + ',' + (y + H - cutY),
      (x + W - cutX) + ',' + (y + H),
      (x + cutX) + ',' + (y + H),
      x + ',' + (y + H - cutY),
      x + ',' + (y + cutY)
    ].join(' ');
    hexPoly.setAttribute('points', hexPts);
    hexPoly.setAttribute('fill', 'none');
    hexPoly.setAttribute('stroke', 'rgba(34,197,94,0.9)'); // Emerald green glowing stroke
    hexPoly.setAttribute('stroke-width', '3');
    svg.appendChild(hexPoly);

    // Corner fills: mask ONLY the 4 outer corner void triangles (leaving cols 0-1 rows 3-10 completely open)
    var bgColor = '#09081a';
    var corners = [
      // Top-Left corner void
      [x + ',' + y, (x + cutX) + ',' + y, x + ',' + (y + cutY)],
      // Top-Right corner void
      [(x + W - cutX) + ',' + y, (x + W) + ',' + y, (x + W) + ',' + (y + cutY)],
      // Bottom-Left corner void
      [x + ',' + (y + H - cutY), (x + cutX) + ',' + (y + H), x + ',' + (y + H)],
      // Bottom-Right corner void
      [(x + W) + ',' + (y + H - cutY), (x + W - cutX) + ',' + (y + H), (x + W) + ',' + (y + H)]
    ];
    corners.forEach(function(pts3) {
      var tri = document.createElementNS(svgNS, 'polygon');
      tri.setAttribute('points', pts3.join(' '));
      tri.setAttribute('fill', bgColor);
      tri.setAttribute('stroke', 'none');
      svg.appendChild(tri);
    });

  } else if (boardStyleMode === 'ns4-octagonal' || boardStyleMode === 'newstyle') {
    // 8-sided octagon: corners cut = 3/14 of board width
    var cut = W * (3 / 14);
    var cutH = H * (3 / 14);
    // Draw octagon stroke outline on top
    var poly = document.createElementNS(svgNS, 'polygon');
    var pts = [
      (x + cut) + ',' + y,
      (x + W - cut) + ',' + y,
      (x + W) + ',' + (y + cutH),
      (x + W) + ',' + (y + H - cutH),
      (x + W - cut) + ',' + (y + H),
      (x + cut) + ',' + (y + H),
      x + ',' + (y + H - cutH),
      x + ',' + (y + cutH)
    ].join(' ');
    poly.setAttribute('points', pts);
    poly.setAttribute('fill', 'none');
    poly.setAttribute('stroke', 'rgba(240,192,64,0.9)');
    poly.setAttribute('stroke-width', '3');
    svg.appendChild(poly);

    // Corner fill (mask the outer triangular corner voids with bg colour)
    var bgColor = '#09081a';
    var corners = [
      // top-left triangle
      [x + ',' + y, (x + cut) + ',' + y, x + ',' + (y + cutH)],
      // top-right triangle
      [(x + W - cut) + ',' + y, (x + W) + ',' + y, (x + W) + ',' + (y + cutH)],
      // bottom-left triangle
      [x + ',' + (y + H - cutH), (x + cut) + ',' + (y + H), x + ',' + (y + H)],
      // bottom-right triangle
      [(x + W) + ',' + (y + H - cutH), (x + W - cut) + ',' + (y + H), (x + W) + ',' + (y + H)]
    ];
    corners.forEach(function(pts3) {
      var tri = document.createElementNS(svgNS, 'polygon');
      tri.setAttribute('points', pts3.join(' '));
      tri.setAttribute('fill', bgColor);
      tri.setAttribute('stroke', 'none');
      svg.appendChild(tri);
    });

  } else if (boardStyleMode === 'ns4-diamond') {
    // Diamond Chess Lock: draw 4 glowing corner block outlines + a diamond void in centre
    // The void is a diamond shape centred on the board
    var cx = x + W / 2;
    var cy = y + H / 2;
    // Diamond void: half-size = 2.5/14 of board
    var dHalf = W * (3.5 / 14);
    // Draw the central diamond void with dark fill
    var diamond = document.createElementNS(svgNS, 'polygon');
    var dPts = [
      cx + ',' + (cy - dHalf),
      (cx + dHalf) + ',' + cy,
      cx + ',' + (cy + dHalf),
      (cx - dHalf) + ',' + cy
    ].join(' ');
    diamond.setAttribute('points', dPts);
    diamond.setAttribute('fill', '#09081a');
    diamond.setAttribute('stroke', 'rgba(240,192,64,0.85)');
    diamond.setAttribute('stroke-width', '3');
    svg.appendChild(diamond);

  } else if (boardStyleMode === 'ns4-circular') {
    // Circular Chess Lock: draw inner circle void + outer circle stroke
    var cx2 = x + W / 2;
    var cy2 = y + H / 2;
    var outerR = W * (7.4 / 14);   // matches isValidCell outer radius 7.4
    var innerR = W * (2.5 / 14);   // matches isValidCell inner void radius 2.5

    // Inner circle fill (the hollow void)
    var innerCircle = document.createElementNS(svgNS, 'circle');
    innerCircle.setAttribute('cx', cx2);
    innerCircle.setAttribute('cy', cy2);
    innerCircle.setAttribute('r', innerR);
    innerCircle.setAttribute('fill', '#09081a');
    innerCircle.setAttribute('stroke', 'rgba(56,189,248,0.7)');
    innerCircle.setAttribute('stroke-width', '3');
    svg.appendChild(innerCircle);

    // Outer circle stroke boundary
    var outerCircle = document.createElementNS(svgNS, 'circle');
    outerCircle.setAttribute('cx', cx2);
    outerCircle.setAttribute('cy', cy2);
    outerCircle.setAttribute('r', outerR);
    outerCircle.setAttribute('fill', 'none');
    outerCircle.setAttribute('stroke', 'rgba(56,189,248,0.9)');
    outerCircle.setAttribute('stroke-width', '3');
    svg.appendChild(outerCircle);
  }
}

function _addCoordLabel(cell, row, col) {
  const lbl = cellLabel(row, col);
  const colChar = lbl[0];
  const rowNum = lbl.slice(1);

  var showFile = false;
  var showRank = false;

  if (BOARD_SIZE === 8) {
    showFile = (row === 7);
    showRank = (col === 0);
  } else {
    showFile = (row === 13 && col >= 3 && col <= 10) || (row === 10 && (col <= 2 || col >= 11));
    showRank = (col === 0 && row >= 3 && row <= 10) || (col === 3 && (row <= 2 || row >= 11));
  }

  if (showFile) {
    const s = document.createElement('span');
    s.classList.add('coord-label', 'coord-col');
    s.textContent = colChar;
    cell.appendChild(s);
  }
  if (showRank) {
    const s = document.createElement('span');
    s.classList.add('coord-label', 'coord-row');
    s.textContent = rowNum;
    cell.appendChild(s);
  }
}

function getCellEl(row, col) {
  return (cellEls[row] && cellEls[row][col]) ? cellEls[row][col] : null;
}

function clearHighlights() {
  document.querySelectorAll('.cell.selected,.cell.valid-move,.cell.valid-capture,.cell.in-check')
    .forEach(el => el.classList.remove('selected', 'valid-move', 'valid-capture', 'in-check'));
}

function updateTurnIndicator(player) {
  const avatar = document.getElementById('turn-avatar');
  const nameEl = document.getElementById('turn-name');
  const indicator = document.getElementById('turn-indicator');
  if (!avatar || !nameEl) return;
  avatar.style.background = player.cssColor;
  avatar.style.borderColor = player.cssColor;
  avatar.style.boxShadow = `0 0 12px ${player.cssColor}88`;
  nameEl.textContent = player.name;
  indicator.style.borderColor = player.cssColor + '55';
}

function renderPlayersList(activePlayers, currentId, eliminatedIds) {
  const container = document.getElementById('players-list');
  if (!container) return;
  container.innerHTML = '';

  const gridOrder = ['red', 'yellow', 'blue', 'green'];
  const activeMap = new Map(activePlayers.map(p => [p.id, p]));

  gridOrder.forEach(pid => {
    const p = activeMap.get(pid);
    const item = document.createElement('div');
    item.classList.add('player-item', 'grid-slot-' + pid);

    if (p) {
      const isActive = p.id === currentId;
      const isElim = eliminatedIds.has(p.id);

      if (isActive) item.classList.add('active-turn');
      if (isElim) item.classList.add('eliminated');
      item.style.setProperty('--player-color', p.cssColor);
      item.style.setProperty('--player-rgb', p.cssRGB);

      // ONLY centered color circle (active ring handled concentrically via CSS)
      if (isActive) {
        item.innerHTML = `<span class="player-color-dot" style="background:${p.cssColor}"></span>`;
      } else {
        const elimBadge = isElim ? '<span class="player-status-badge badge-elim">✕</span>' : '';
        item.innerHTML = `
          <span class="player-color-dot" style="background:${p.cssColor}"></span>
          ${elimBadge}
        `;
      }
    } else {
      // Inactive seat in 2P / 3P mode: Only dim color circle on left
      const def = PLAYER_DEFS[pid] || { name: pid, cssColor: '#555' };
      item.classList.add('inactive-slot');
      item.style.setProperty('--player-color', def.cssColor);
      item.innerHTML = `
        <span class="player-color-dot inactive-dot" style="background:${def.cssColor}; opacity:0.3;"></span>
      `;
    }
    container.appendChild(item);
  });
}

/* ════════════════════════════════════════════════════════════
   PIECE DEFINITIONS & SHAPES
   ════════════════════════════════════════════════════════════ */
const PIECE_SYMBOLS = {
  king: '♚',
  queen: '♛',
  rook: '♜',
  bishop: '♝',
  knight: '♞',
  pawn: '♟',
};

const SVG_SHAPES = {
  shape_medieval: {
    king: `<svg viewBox="0 0 24 24" fill="currentColor" style="width:75%;height:75%;"><path d="M2 4l3 5 7-6 7 6 3-5v14H2V4zm2 12h16v-2H4v2z"/></svg>`,
    queen: `<svg viewBox="0 0 24 24" fill="currentColor" style="width:75%;height:75%;"><path d="M12 2L9 7l-5-2 3 6-5 1v8h20v-8l-5-1 3-6-5 2-3-5zm-8 16h16v-2H4v2z"/></svg>`,
    rook: `<svg viewBox="0 0 24 24" fill="currentColor" style="width:70%;height:70%;"><path d="M4 2v3h2V3h3v2h2V3h2v2h2V3h3v2h2V2H4zm2 5v13h12V7H6zm3 10H7v-2h2v2zm0-4H7v-2h2v2zm4 4h-2v-2h2v2zm0-4h-2v-2h2v2zm4 4h-2v-2h2v2zm0-4h-2v-2h2v2z"/></svg>`,
    bishop: `<svg viewBox="0 0 24 24" fill="currentColor" style="width:70%;height:70%;"><path d="M12 2a6 6 0 0 0-6 6c0 4 6 12 6 12s6-8 6-6a6 6 0 0 0-6-6zm0 3a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm1 7h-2v-2h2v2z"/></svg>`,
    knight: `<svg viewBox="0 0 24 24" fill="currentColor" style="width:75%;height:75%;"><path d="M19 12c-.5-1.5-1.5-3-3-4-1.5-1-3.5-1-4.5.5-1.5-1.5-4-1.5-5 .5C5.5 10.5 5 12 5 14c0 3 3 5 6 5h4c2 0 4-2 4-5v-2zm-6 2h-2v-2h2v2z"/></svg>`,
    pawn: `<svg viewBox="0 0 24 24" fill="currentColor" style="width:60%;height:60%;"><path d="M12 2C6.5 2 2 6.5 2 12c0 5 4 8.5 10 10 6-1.5 10-5 10-10 0-5.5-4.5-10-10-10zm0 15c-2.8 0-5-2.2-5-5s2.2-5 5-5 5 2.2 5 5-2.2 5-5 5z"/></svg>`
  },
  shape_futuristic: {
    king: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:75%;height:75%;"><polygon points="12 2 22 8.5 22 17.5 12 22 2 17.5 2 8.5"/><circle cx="12" cy="12" r="4"/></svg>`,
    queen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:75%;height:75%;"><polygon points="12 2 22 12 12 22 2 12"/><polygon points="12 6 18 12 12 18 6 12"/></svg>`,
    rook: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:70%;height:70%;"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v18M3 12h18"/></svg>`,
    bishop: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:70%;height:70%;"><polygon points="12 2 22 20 2 20"/><line x1="12" y1="2" x2="12" y2="20"/><line x1="2" y1="14" x2="22" y2="14"/></svg>`,
    knight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:75%;height:75%;"><polygon points="13 2 3 14 11 14 11 22 21 10 13 10"/></svg>`,
    pawn: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:60%;height:60%;"><polygon points="12 5 19 19 5 19"/><circle cx="12" cy="14" r="2"/></svg>`
  },
  shape_mythic: {
    king: `<svg viewBox="0 0 24 24" fill="currentColor" style="width:75%;height:75%;"><path d="M12 2.2c-.4 0-.8.3-.9.7l-.6 3.1-2.9-1.3c-.4-.2-.8-.1-1 .2s-.2.8.1 1l2.3 2.1-3-.7c-.4-.1-.8.1-.9.5s0 .8.4.9l2.9 1.1-2.9 1.1c-.4.2-.5.5-.4.9s.5.5.9.4l3-.7-2.3 2.1c-.3.3-.3.8-.1 1s.7.3 1 .2l2.9-1.3.6 3.1c.1.4.5.7.9.7s.8-.3.9-.7l.6-3.1 2.9 1.3c.1.1.3.1.5.1.3 0 .5-.1.6-.3.2-.3.2-.8-.1-1l-2.3-2.1 3 .7c.4.1.8-.1.9-.5s0-.8-.4-.9l-2.9-1.1 2.9-1.1c.4-.2.5-.5.4-.9s-.5-.5-.9-.4l-3 .7 2.3-2.1c.3-.3.3-.8.1-1s-.7-.3-1-.2l-2.9 1.3-.6-3.1c-.1-.4-.5-.7-.9-.7zm0 6.3c1.9 0 3.5 1.6 3.5 3.5s-1.6 3.5-3.5 3.5-3.5-1.6-3.5-3.5 1.6-3.5 3.5-3.5z"/></svg>`,
    queen: `<svg viewBox="0 0 24 24" fill="currentColor" style="width:75%;height:75%;"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c1 0 2-.2 3-.5-4-1.5-6.5-5.5-6.5-9.5s2.5-8 6.5-9.5c-1-.3-2-.5-3-.5zm4 4l1 2 2.5.5-1.8 1.8.5 2.5-2.2-1.2-2.2 1.2.5-2.5-1.8-1.8 2.5-.5 1-2z"/></svg>`,
    rook: `<svg viewBox="0 0 24 24" fill="currentColor" style="width:70%;height:70%;"><path d="M12 2c-.6 0-1 .4-1 1v6c0 .6.4 1 1 1s1-.4 1-1V3c0-.6-.4-1-1-1zm6.4.7c-.5.3-.6.9-.3 1.4l3 5.2c.3.5.9.6 1.4.3.5-.3.6-.9.3-1.4l-3-5.2c-.3-.5-.9-.6-1.4-.3zM5.6 2.7c-.5-.3-1.1-.2-1.4.3l-3 5.2c-.3.5-.2 1.1.3 1.4.5.3 1.1.2 1.4-.3l3-5.2c.3-.5.2-1.1-.3-1.4zM12 12c-4.4 0-8 3.6-8 8v2h16v-2c0-4.4-3.6-8-8-8zm-5 8c0-1.7 1.3-3 3-3s3 1.3 3 3H7zm10 0c0-1.7 1.3-3 3-3s3 1.3 3 3h-6z"/></svg>`,
    bishop: `<svg viewBox="0 0 24 24" fill="currentColor" style="width:70%;height:70%;"><path d="M12 2c-3 4-5 7-5 10a5 5 0 0 0 10 0c0-3-2-6-5-10zm0 15c-1.7 0-3-1.3-3-3s2-4 3-5c1 1 3 3.3 3 5s-1.3 3-3 3z"/></svg>`,
    knight: `<svg viewBox="0 0 24 24" fill="currentColor" style="width:75%;height:75%;"><path d="M12 2a10 10 0 0 0-8.7 15c1.4-1 3.2-1.5 5-1.5 1.5 0 3 .3 4.3 1L12 15a6 6 0 0 1-5.3-3.2A10 10 0 0 0 12 22a10 10 0 0 0 10-10A10 10 0 0 0 12 2zm1-8a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/></svg>`,
    pawn: `<svg viewBox="0 0 24 24" fill="currentColor" style="width:60%;height:60%;"><path d="M12 3a7 7 0 0 0-7 7c0 4 7 11 7 11s7-7 7-7a7 7 0 0 0-7-7zm0 10a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/></svg>`
  }
};

function applyPieceStyle(piece, pieceType, playerId) {
  var shapeSetId = 'shape_classic';
  if (typeof StoreManager !== 'undefined') {
    shapeSetId = StoreManager.getEquipped('shape') || 'shape_classic';
  }
  piece.innerHTML = '';
  piece.classList.remove('shape-style-medieval', 'shape-style-futuristic', 'shape-style-mythic');

  if (shapeSetId === 'shape_classic') {
    piece.textContent = PIECE_SYMBOLS[pieceType];
  } else {
    piece.innerHTML = SVG_SHAPES[shapeSetId][pieceType] || '';
    piece.classList.add('shape-style-' + shapeSetId.split('_')[1]);
  }
}

// Standard back-rank order (left to right, facing up)
// R  N  B  Q  K  B  N  R
const BACK_RANK = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];

// Mirrored back-rank for players facing the first (K/Q swapped so rulers meet)
// R  N  B  K  Q  B  N  R
const BACK_RANK_MIRROR = ['rook', 'knight', 'bishop', 'king', 'queen', 'bishop', 'knight', 'rook'];

/**
 * Places a single piece's DOM span into the given cell.
 */
function placePiece(row, col, pieceType, playerId) {
  const cell = getCellEl(row, col);
  if (!cell) return;

  const piece = document.createElement('span');
  piece.classList.add('piece', 'piece-' + playerId);
  applyPieceStyle(piece, pieceType, playerId);
  piece.dataset.player = playerId;
  piece.dataset.pieceType = pieceType;
  piece.dataset.row = row;
  piece.dataset.col = col;
  piece.setAttribute('role', 'img');
  piece.setAttribute('aria-label', playerId + ' ' + pieceType);
  piece.draggable = true;
  bindPieceInput(piece, row, col);
  cell.appendChild(piece);
}

function getInputCell(event) {
  var target = event && event.target;
  if (!target || !target.closest) return null;
  var cell = target.closest('.cell');
  var boardEl = document.getElementById('chess-board');
  if (!cell || !boardEl || !boardEl.contains(cell) || cell.classList.contains('invalid')) return null;
  return cell;
}

function inputCellCoordinates(cell) {
  if (!cell || !cell.dataset) return null;
  var row = Number(cell.dataset.row);
  var col = Number(cell.dataset.col);
  if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || col < 0 || row >= BOARD_SIZE || col >= BOARD_SIZE) {
    return null;
  }
  return { row: row, col: col };
}

function processCellInteraction(cell, event) {
  var coords = inputCellCoordinates(cell);
  if (!coords) return;

  // Touch devices can emit pointerdown, touchstart, and click for one tap.
  // Process the first signal and ignore the synthetic duplicates.
  var now = Date.now();
  var key = coords.row + ':' + coords.col;
  if (lastBoardInput.key === key && now - lastBoardInput.time < 450) return;
  lastBoardInput = { key: key, time: now };
  handleCellClick(coords.row, coords.col);
}

function handleBoardInput(event) {
  var cell = getInputCell(event);
  if (!cell) return;
  event.preventDefault();
  if (event.stopPropagation) event.stopPropagation();
  processCellInteraction(cell, event);
}

function bindCellInput(cell) {
  ['click', 'pointerdown', 'touchstart', 'dragstart'].forEach(function (eventName) {
    cell.addEventListener(eventName, handleBoardInput, { passive: false });
  });
}

function bindPieceInput(piece, row, col) {
  ['click', 'pointerdown', 'touchstart', 'dragstart'].forEach(function (eventName) {
    piece.addEventListener(eventName, function (event) {
      // A piece is part of its cell, but has its own listeners so mouse,
      // touch and drag interactions never depend on a particular child node.
      event.preventDefault();
      event.stopPropagation();
      processCellInteraction(getCellEl(row, col), event);
    }, { passive: false });
  });
}

/**
 * Removes any piece element from a cell.
 */
function removePiece(row, col) {
  const cell = getCellEl(row, col);
  if (!cell) return;
  const p = cell.querySelector('.piece');
  if (p) p.remove();
}

/**
 * Places all pieces for all active players.
 *
 * Board zones:
 *   Red    (bottom) : back rank row 13, pawns row 12, cols 3-10
 *   Yellow (top)    : back rank row  0, pawns row  1, cols 3-10
 *   Green  (left)   : back rank col  0, pawns col  1, rows 3-10
 *   Blue   (right)  : back rank col 13, pawns col 12, rows 3-10
 */
function placeAllPieces(activePlayerIds) {
  if (BOARD_SIZE === 8) {
    // Standard 8x8 2-Player setup
    for (var i = 0; i < 8; i++) {
      placePiece(7, i, BACK_RANK[i], 'red');
      placePiece(6, i, 'pawn', 'red');
    }
    for (var i = 0; i < 8; i++) {
      placePiece(0, i, BACK_RANK_MIRROR[i], 'yellow');
      placePiece(1, i, 'pawn', 'yellow');
    }
    return;
  }

  activePlayerIds.forEach(function (playerId) {
    var seat = PLAYER_DEFS[playerId].seat;

    if (seat === 'bottom') {
      for (var i = 0; i < 8; i++) {
        placePiece(13, 3 + i, BACK_RANK[i], playerId);
        placePiece(12, 3 + i, 'pawn', playerId);
      }

    } else if (seat === 'top') {
      for (var i = 0; i < 8; i++) {
        placePiece(0, 3 + i, BACK_RANK_MIRROR[i], playerId);
        placePiece(1, 3 + i, 'pawn', playerId);
      }

    } else if (seat === 'left') {
      for (var i = 0; i < 8; i++) {
        placePiece(3 + i, 0, BACK_RANK[i], playerId);
        placePiece(3 + i, 1, 'pawn', playerId);
      }

    } else if (seat === 'right') {
      for (var i = 0; i < 8; i++) {
        placePiece(3 + i, 13, BACK_RANK_MIRROR[i], playerId);
        placePiece(3 + i, 12, 'pawn', playerId);
      }
    }
  });
}

function initBoardState(activePlayerIds) {
  boardState = [];
  for (var r = 0; r < BOARD_SIZE; r++) {
    boardState[r] = [];
    for (var c = 0; c < BOARD_SIZE; c++) boardState[r][c] = null;
  }

  if (BOARD_SIZE === 8) {
    for (var i = 0; i < 8; i++) {
      boardState[7][i] = { player: 'red', type: BACK_RANK[i] };
      boardState[6][i] = { player: 'red', type: 'pawn' };
    }
    for (var i = 0; i < 8; i++) {
      boardState[0][i] = { player: 'yellow', type: BACK_RANK_MIRROR[i] };
      boardState[1][i] = { player: 'yellow', type: 'pawn' };
    }
    return;
  }

  activePlayerIds.forEach(function (pid) {
    var seat = PLAYER_DEFS[pid].seat;
    if (seat === 'bottom') {
      for (var i = 0; i < 8; i++) {
        boardState[13][3 + i] = { player: pid, type: BACK_RANK[i] };
        boardState[12][3 + i] = { player: pid, type: 'pawn' };
      }
    } else if (seat === 'top') {
      for (var i = 0; i < 8; i++) {
        boardState[0][3 + i] = { player: pid, type: BACK_RANK_MIRROR[i] };
        boardState[1][3 + i] = { player: pid, type: 'pawn' };
      }
    } else if (seat === 'left') {
      for (var i = 0; i < 8; i++) {
        boardState[3 + i][0] = { player: pid, type: BACK_RANK[i] };
        boardState[3 + i][1] = { player: pid, type: 'pawn' };
      }
    } else if (seat === 'right') {
      for (var i = 0; i < 8; i++) {
        boardState[3 + i][13] = { player: pid, type: BACK_RANK_MIRROR[i] };
        boardState[3 + i][12] = { player: pid, type: 'pawn' };
      }
    }
  });
}

/* ════════════════════════════════════════════════════════════
   PIECE LIMITS (for pawn promotion)
   ════════════════════════════════════════════════════════════ */
var PIECE_LIMITS = { queen: 1, rook: 2, knight: 2, bishop: 2 };

/* ════════════════════════════════════════════════════════════
   MOVE GENERATION
   Returns [{row, col, isCapture}] for each piece type.
   Does NOT yet apply check-detection (Step 4).
   ════════════════════════════════════════════════════════════ */

/**
 * Pawn move/capture directions keyed by player seat.
 *
 * dr/dc      : one-step forward direction
 * startRow/Col: the row (or col) where the pawn sits after initial placement
 *               — used to allow the two-step opening move
 * capDeltas  : [dr, dc] pairs for diagonal capture squares
 */
var PAWN_CONFIG = {
  red: { dr: -1, dc: 0, startRow: 12, capDeltas: [[-1, -1], [-1, +1]] },
  yellow: { dr: +1, dc: 0, startRow: 1, capDeltas: [[+1, -1], [+1, +1]] },
  green: { dr: 0, dc: +1, startCol: 1, capDeltas: [[-1, +1], [+1, +1]] },
  blue: { dr: 0, dc: -1, startCol: 12, capDeltas: [[-1, -1], [+1, -1]] },
};

function cellEmpty(r, c, state) { return isValidCell(r, c) && state[r][c] === null; }
function cellEnemy(r, c, pid, state) { return isValidCell(r, c) && state[r][c] !== null && state[r][c].player !== pid; }
function cellFriend(r, c, pid, state) { return isValidCell(r, c) && state[r][c] !== null && state[r][c].player === pid; }

function pawnMoves(row, col, pid, state) {
  var moves = [];
  var cfg = PAWN_CONFIG[pid];
  var r1 = row + cfg.dr, c1 = col + cfg.dc;

  if (cellEmpty(r1, c1, state)) {
    moves.push({ row: r1, col: c1, isCapture: false });
    // Two-step opening move
    var onStart = false;
    if (BOARD_SIZE === 8) {
      onStart = (pid === 'red' && row === 6) || (pid === 'yellow' && row === 1);
    } else {
      onStart = (pid === 'red' && row === 12)
        || (pid === 'yellow' && row === 1)
        || (pid === 'green' && col === 1)
        || (pid === 'blue' && col === 12);
    }
    if (onStart) {
      var r2 = row + cfg.dr * 2, c2 = col + cfg.dc * 2;
      if (cellEmpty(r2, c2, state)) moves.push({ row: r2, col: c2, isCapture: false });
    }
  }
  // Diagonal captures
  cfg.capDeltas.forEach(function (d) {
    var cr = row + d[0], cc = col + d[1];
    if (cellEnemy(cr, cc, pid, state)) moves.push({ row: cr, col: cc, isCapture: true });
  });
  return moves;
}

function slidingMoves(row, col, pid, dirs, state) {
  var moves = [];
  dirs.forEach(function (d) {
    var r = row + d[0], c = col + d[1];
    while (isValidCell(r, c)) {
      if (state[r][c] === null) {
        moves.push({ row: r, col: c, isCapture: false });
      } else if (state[r][c].player !== pid) {
        moves.push({ row: r, col: c, isCapture: true });
        break;
      } else {
        break; // blocked by own piece
      }
      r += d[0]; c += d[1];
    }
  });
  return moves;
}

function rookMoves(row, col, pid, state) { return slidingMoves(row, col, pid, [[0, 1], [0, -1], [1, 0], [-1, 0]], state); }
function bishopMoves(row, col, pid, state) { return slidingMoves(row, col, pid, [[-1, -1], [-1, 1], [1, -1], [1, 1]], state); }
function queenMoves(row, col, pid, state) { return slidingMoves(row, col, pid, [[0, 1], [0, -1], [1, 0], [-1, 0], [-1, -1], [-1, 1], [1, -1], [1, 1]], state); }

function knightMoves(row, col, pid, state) {
  var moves = [];
  [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]].forEach(function (d) {
    var r = row + d[0], c = col + d[1];
    if (isValidCell(r, c) && !cellFriend(r, c, pid, state))
      moves.push({ row: r, col: c, isCapture: state[r][c] !== null });
  });
  return moves;
}

function kingMoves(row, col, pid, state) {
  var moves = [];
  [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]].forEach(function (d) {
    var r = row + d[0], c = col + d[1];
    if (isValidCell(r, c) && !cellFriend(r, c, pid, state))
      moves.push({ row: r, col: c, isCapture: state[r][c] !== null });
  });
  return moves;
}

function getPseudoLegalMoves(row, col, state) {
  var piece = state[row][col];
  if (!piece) return [];
  switch (piece.type) {
    case 'pawn': return pawnMoves(row, col, piece.player, state);
    case 'rook': return rookMoves(row, col, piece.player, state);
    case 'bishop': return bishopMoves(row, col, piece.player, state);
    case 'queen': return queenMoves(row, col, piece.player, state);
    case 'knight': return knightMoves(row, col, piece.player, state);
    case 'king': return kingMoves(row, col, piece.player, state);
    default: return [];
  }
}

function isSquareAttacked(r, c, attackerId, state) {
  for (var i = 0; i < BOARD_SIZE; i++) {
    for (var j = 0; j < BOARD_SIZE; j++) {
      var p = state[i][j];
      if (p && p.player === attackerId) {
        var moves = getPseudoLegalMoves(i, j, state);
        for (var m = 0; m < moves.length; m++) {
          if (moves[m].row === r && moves[m].col === c) return true;
        }
      }
    }
  }
  return false;
}

function isKingInCheck(playerId, state) {
  var kr = -1, kc = -1;
  for (var i = 0; i < BOARD_SIZE; i++) {
    for (var j = 0; j < BOARD_SIZE; j++) {
      var p = state[i][j];
      if (p && p.player === playerId && p.type === 'king') {
        kr = i; kc = j;
        break;
      }
    }
    if (kr !== -1) break;
  }
  if (kr === -1) return false;

  for (var i = 0; i < gameActivePlayers.length; i++) {
    var oppId = gameActivePlayers[i].id;
    if (oppId !== playerId && !eliminatedSet.has(oppId)) {
      if (isSquareAttacked(kr, kc, oppId, state)) return true;
    }
  }
  return false;
}

function getLegalMoves(row, col) {
  var piece = boardState[row][col];
  if (!piece) return [];

  var pseudoMoves = getPseudoLegalMoves(row, col, boardState);
  var validMovesList = [];

  for (var i = 0; i < pseudoMoves.length; i++) {
    var move = pseudoMoves[i];
    // Clone state and simulate
    var tempState = cloneBoardState(boardState);
    tempState[move.row][move.col] = piece;
    tempState[row][col] = null;

    // Check if the move leaves the king in check
    if (!isKingInCheck(piece.player, tempState)) {
      validMovesList.push(move);
    }
  }

  return validMovesList;
}

/* ════════════════════════════════════════════════════════════
   CLICK HANDLING — Selection, highlighting, move execution
   ════════════════════════════════════════════════════════════ */

function currentPlayer() {
  return gameActivePlayers[currentPlayerIndex];
}

/**
 * Eliminates a player from the game.
 * Returns true  → caller should immediately advance the turn.
 * Returns false → turn will be advanced later (e.g. after alert dismissed).
 */
function eliminatePlayer(playerId, reason) {
  eliminatedSet.add(playerId);

  // Remove all pieces
  for (var r = 0; r < BOARD_SIZE; r++) {
    for (var c = 0; c < BOARD_SIZE; c++) {
      if (boardState[r][c] && boardState[r][c].player === playerId) {
        boardState[r][c] = null;
        removePiece(r, c);
      }
    }
  }

  // Check win condition
  var activeCount = gameActivePlayers.length - eliminatedSet.size;

  if (activeCount <= 1) {
    var winnerId = null;
    for (var i = 0; i < gameActivePlayers.length; i++) {
      if (!eliminatedSet.has(gameActivePlayers[i].id)) winnerId = gameActivePlayers[i].id;
    }
    triggerGameOver(winnerId, false);
    return true; // game is over — no further advanceTurn needed
  }

  // Mid-game elimination notification
  if (reason === 'King captured') {
    // Banner-only: show disqualification without blocking
    showDisqualificationBanner(PLAYER_DEFS[playerId].name);
  } else if (reason === 'Checkmate') {
    // Show disqualification banner AND the blocking checkmate modal
    showDisqualificationBanner(PLAYER_DEFS[playerId].name);
    playAlertSound();
    speakCheckmate();
    showCheckmateAlert(PLAYER_DEFS[playerId], function () {
      advanceTurn(); // continue after player dismisses
    });
    return false; // caller must NOT call advanceTurn — modal will do it
  }
  // Stalemate: silent elimination, no banner needed

  return true; // caller should proceed normally
}

function showCheckBanner(playerName) {
  var banner = document.getElementById('check-banner');
  var text = document.getElementById('check-banner-text');
  if (!banner || !text) return;
  text.textContent = playerName + "'s King is in Check!";
  banner.classList.add('active');

  if (window.checkBannerTimeout) clearTimeout(window.checkBannerTimeout);
  window.checkBannerTimeout = setTimeout(function () {
    banner.classList.remove('active');
  }, 3500);
}

/**
 * Shows the promotion banner for a given player and piece type.
 * Auto-hides after 4 seconds.
 */
function showPromotionBanner(playerName, pieceType) {
  var banner = document.getElementById('promotion-banner');
  var text = document.getElementById('promotion-banner-text');
  var icon = banner ? banner.querySelector('.promotion-banner-icon') : null;
  if (!banner || !text) return;

  var pieceSymbols = { queen: '♛', rook: '♜', knight: '♞', bishop: '♝' };
  var sym = pieceSymbols[pieceType] || '♛';
  icon.textContent = sym;
  text.textContent = playerName + ' promoted a Pawn to ' + pieceType.charAt(0).toUpperCase() + pieceType.slice(1) + '!';

  banner.classList.add('active');
  banner.setAttribute('aria-hidden', 'false');
  if (window.promoBannerTimeout) clearTimeout(window.promoBannerTimeout);
  window.promoBannerTimeout = setTimeout(function () {
    banner.classList.remove('active');
    banner.setAttribute('aria-hidden', 'true');
  }, 4000);
}

/**
 * Shows the disqualification banner for a given player.
 * Auto-hides after 4 seconds.
 */
function showDisqualificationBanner(playerName) {
  var banner = document.getElementById('disqualified-banner');
  var text = document.getElementById('disqualified-banner-text');
  if (!banner || !text) return;
  text.textContent = playerName + ' has been Disqualified!';
  banner.classList.add('active');
  banner.setAttribute('aria-hidden', 'false');
  if (window.disqBannerTimeout) clearTimeout(window.disqBannerTimeout);
  window.disqBannerTimeout = setTimeout(function () {
    banner.classList.remove('active');
    banner.setAttribute('aria-hidden', 'true');
  }, 4500);
}

/* ════════════════════════════════════════════════════════════
   MOVE LOG
   ════════════════════════════════════════════════════════════ */

/**
 * Appends one entry to the move log panel.
 * @param {{ player: string, type: string }} piece - the moving piece
 * @param {number} fromRow
 * @param {number} fromCol
 * @param {number} toRow
 * @param {number} toCol
 * @param {{ type: string }|null} capturedPiece
 */
function logMove(piece, fromRow, fromCol, toRow, toCol, capturedPiece) {
  var logEl = document.getElementById('move-log');
  // Clear the "No moves yet" placeholder on first move
  var placeholder = logEl.querySelector('.log-empty');
  if (placeholder) placeholder.remove();

  var fromLabel = cellLabel(fromRow, fromCol);
  var toLabel = cellLabel(toRow, toCol);
  var pieceName = piece.type.charAt(0).toUpperCase() + piece.type.slice(1);
  var player = PLAYER_DEFS[piece.player];
  var capText = capturedPiece
    ? ' <span class="log-capture">×' + capturedPiece.type.charAt(0).toUpperCase() + capturedPiece.type.slice(1) + '</span>'
    : '';

  var entry = document.createElement('div');
  entry.classList.add('log-entry');
  entry.innerHTML =
    '<span class="log-dot" style="background:' + player.cssColor + '"></span>' +
    '<span class="log-player" style="color:' + player.cssColor + '">' + player.name + '</span>' +
    ' ' + pieceName + ': ' + fromLabel + ' → ' + toLabel + capText;

  logEl.appendChild(entry);
  logEl.scrollTop = logEl.scrollHeight;
}

/**
 * Appends a promotion annotation to the last log entry.
 * @param {string} promotedType
 */
function appendPromotionToLog(promotedType) {
  var logEl = document.getElementById('move-log');
  var last = logEl.querySelector('.log-entry:last-child');
  if (!last) return;
  var span = document.createElement('span');
  span.className = 'log-promo';
  span.textContent = ' ↗ ' + promotedType.charAt(0).toUpperCase() + promotedType.slice(1);
  last.appendChild(span);
}

/**
 * Rebuilds the captured-pieces panel from captureLog.
 * Shows "PlayerA captured PlayerB's PieceType" for every capture, chronologically.
 */
function updateCapturedArea() {
  var container = document.getElementById('captured-area');
  if (!container) return;
  container.innerHTML = '';

  if (captureLog.length === 0) {
    var empty = document.createElement('p');
    empty.className = 'log-empty';
    empty.textContent = 'No captures yet.';
    container.appendChild(empty);
    return;
  }

  captureLog.forEach(function (entry) {
    var item = document.createElement('div');
    item.className = 'capture-entry';
    item.innerHTML =
      '<span class="capture-dot" style="background:' + entry.byColor + '"></span>' +
      '<span class="capture-text">' +
      '<span style="color:' + entry.byColor + ';font-weight:700">' + entry.byName + '</span>' +
      ' captured ' +
      '<span style="color:' + entry.ofColor + ';font-weight:600">' + entry.ofName + '</span>' +
      '\u2019s <span class="capture-piece-symbol" style="color:' + entry.ofColor + '">' + entry.symbol + '</span>' +
      ' <span style="color:var(--text-secondary)">' +
      entry.type.charAt(0).toUpperCase() + entry.type.slice(1) +
      '</span>' +
      '</span>';
    container.appendChild(item);
  });

  // Auto-scroll to the latest capture
  container.scrollTop = container.scrollHeight;
}

/* ════════════════════════════════════════════════════════════
   PAWN PROMOTION
   ════════════════════════════════════════════════════════════ */

var PIECE_SYMBOLS_PROMO = { queen: '♛', rook: '♜', knight: '♞', bishop: '♝' };

/**
 * Returns true if (row, col) is a pawn promotion square for playerId.
 */
function isPawnPromotionSquare(row, col, playerId) {
  var seat = PLAYER_DEFS[playerId].seat;
  if (BOARD_SIZE === 8) {
    if (seat === 'bottom') return row === 0;
    if (seat === 'top') return row === 7;
    return false;
  }
  if (seat === 'bottom') return row === 0 && col >= 3 && col <= 10;
  if (seat === 'top') return row === 13 && col >= 3 && col <= 10;
  if (seat === 'left') return col === 13 && row >= 3 && row <= 10;
  if (seat === 'right') return col === 0 && row >= 3 && row <= 10;
  return false;
}

/** Counts how many pieces of `type` the player currently has on the board. */
function countPiecesOnBoard(playerId, type) {
  var n = 0;
  for (var r = 0; r < BOARD_SIZE; r++)
    for (var c = 0; c < BOARD_SIZE; c++)
      if (boardState[r][c] && boardState[r][c].player === playerId && boardState[r][c].type === type) n++;
  return n;
}

/**
 * Returns an array of { type, available, current, max } for promotion choices,
 * respecting the piece-count caps in PIECE_LIMITS.
 */
function getAvailablePromotions(playerId) {
  return ['queen', 'rook', 'knight', 'bishop'].map(function (type) {
    var current = countPiecesOnBoard(playerId, type);
    var max = PIECE_LIMITS[type];
    return { type: type, available: current < max, current: current, max: max };
  });
}

/**
 * Shows the pawn-promotion modal and calls onChoose(type) when the player picks.
 */
function showPromotionModal(row, col, playerId, onChoose) {
  var modal = document.getElementById('promotion-modal');
  var pawIcon = document.getElementById('promotion-pawn-icon');
  var msgEl = document.getElementById('promotion-message');
  var optsEl = document.getElementById('promotion-options');
  var player = PLAYER_DEFS[playerId];

  pawIcon.style.color = player.cssColor;
  pawIcon.style.textShadow = '0 0 20px ' + player.cssColor;
  msgEl.textContent = player.name + "'s pawn promoted — choose a piece:";

  optsEl.innerHTML = '';
  getAvailablePromotions(playerId).forEach(function (p) {
    var btn = document.createElement('button');
    btn.className = 'promotion-btn';
    if (!p.available) btn.disabled = true;
    btn.innerHTML =
      '<span class="promotion-btn-icon" style="color:' + player.cssColor + '">' +
      PIECE_SYMBOLS_PROMO[p.type] +
      '</span>' +
      '<span class="promotion-btn-name">' + p.type.charAt(0).toUpperCase() + p.type.slice(1) + '</span>' +
      '<span class="promotion-btn-note">' +
      (p.available ? p.current + ' / ' + p.max : 'At max (' + p.max + ')') +
      '</span>';

    if (p.available) {
      btn.addEventListener('click', function () {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        onChoose(p.type);
      });
    }
    optsEl.appendChild(btn);
  });

  modal.setAttribute('aria-hidden', 'false');
  modal.classList.add('active');
}

/* ════════════════════════════════════════════════════════════
   AUDIO / SPEECH
   ════════════════════════════════════════════════════════════ */

/**
 * Speaks the single word "Checkmate" using the browser's Speech Synthesis API.
 * Silently skips if the API is unavailable.
 */
function speakCheckmate() {
  try {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // stop any ongoing speech first
    var utter = new SpeechSynthesisUtterance('Checkmate');
    utter.rate = 0.85;
    utter.pitch = 0.75;
    utter.volume = 1;
    window.speechSynthesis.speak(utter);
  } catch (e) { /* Speech Synthesis not supported — skip */ }
}

/**
 * Plays a two-tone alert beep using the Web Audio API.
 * Silently skips if the API is unavailable.
 */
function playAlertSound() {
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    [[440, 0], [660, 0.2]].forEach(function (pair) {
      var freq = pair[0], delay = pair[1];
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.28);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.3);
    });
  } catch (e) { /* Web Audio not supported — skip */ }
}

/**
 * Shows the mid-game checkmate alert modal for a specific player.
 * Calls onDismiss() when the user clicks OK.
 * @param {{ name: string, cssColor: string, cssRGB: string }} player
 * @param {Function} onDismiss
 */
function showCheckmateAlert(player, onDismiss) {
  var modal = document.getElementById('checkmate-alert-modal');
  var content = modal.querySelector('.checkmate-alert-content');
  var icon = document.getElementById('checkmate-alert-icon');
  var title = document.getElementById('checkmate-alert-title');
  var msg = document.getElementById('checkmate-alert-message');
  var btn = document.getElementById('checkmate-alert-dismiss-btn');

  // Apply player colour theme
  content.style.setProperty('--alert-player-color', player.cssColor);
  content.style.setProperty('--alert-player-rgb', player.cssRGB);
  icon.style.color = player.cssColor;
  icon.style.textShadow = '0 0 30px ' + player.cssColor;
  title.style.color = player.cssColor;
  title.textContent = player.name + ' is Checkmated!';
  msg.textContent = player.name + "'s King has been Checkmated — they are eliminated from the game.";

  // Re-trigger the pop animation by toggling the class
  icon.classList.remove('checkmate-alert-icon');
  void icon.offsetWidth; // force reflow
  icon.classList.add('checkmate-alert-icon');

  modal.setAttribute('aria-hidden', 'false');
  modal.classList.add('active');

  function dismiss() {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    btn.removeEventListener('click', dismiss);
    if (onDismiss) onDismiss();
  }
  btn.addEventListener('click', dismiss);
}

/**
 * Advance to next non-eliminated player, update UI.
 */
function advanceTurn() {
  clearHighlights();
  selectedCell = null;
  validMoves = [];

  // Check safety net: if no pawn moves or captures in 20 half-moves, auto-resolve game
  if (movesWithoutProgress >= 20) {
    autoResolveGame();
    return;
  }

  var attempts = 0;
  do {
    currentPlayerIndex = (currentPlayerIndex + 1) % gameActivePlayers.length;
    attempts++;
    if (attempts > gameActivePlayers.length) return; // game over
  } while (eliminatedSet.has(gameActivePlayers[currentPlayerIndex].id));

  var cp = currentPlayer();

  // Check if current player has any legal moves
  var hasMoves = false;
  for (var r = 0; r < BOARD_SIZE; r++) {
    for (var c = 0; c < BOARD_SIZE; c++) {
      var p = boardState[r][c];
      if (p && p.player === cp.id) {
        if (getLegalMoves(r, c).length > 0) {
          hasMoves = true;
          break;
        }
      }
    }
    if (hasMoves) break;
  }

  if (!hasMoves) {
    var inCheck = isKingInCheck(cp.id, boardState);
    var reason = inCheck ? "Checkmate" : "Stalemate";
    var continueNow = eliminatePlayer(cp.id, reason);
    if (continueNow) advanceTurn(); // Skip their turn (modal will call it if continueNow is false)
    return;
  }

  if (isKingInCheck(cp.id, boardState)) {
    showCheckBanner(cp.name);
    if (typeof SoundManager !== 'undefined') SoundManager.playCheck();
  }

  updateTurnIndicator(cp);
  renderPlayersList(gameActivePlayers, cp.id, eliminatedSet);

  // Trigger AI move if this player is computer-controlled
  if (aiPlayerIds.has(cp.id)) {
    var aiId = cp.id;
    setTimeout(function () { executeAIMove(aiId); }, 650);
  }
}

/**
 * Clone board state deeply.
 */
function cloneBoardState(state) {
  var copy = [];
  for (var r = 0; r < BOARD_SIZE; r++) {
    copy[r] = [];
    for (var c = 0; c < BOARD_SIZE; c++) {
      if (state[r][c]) {
        copy[r][c] = { player: state[r][c].player, type: state[r][c].type };
      } else {
        copy[r][c] = null;
      }
    }
  }
  return copy;
}

/**
 * Sync the entire board DOM to the logic state.
 */
function syncBoardDOM() {
  for (var r = 0; r < BOARD_SIZE; r++) {
    for (var c = 0; c < BOARD_SIZE; c++) {
      removePiece(r, c);
      if (boardState[r][c]) {
        placePiece(r, c, boardState[r][c].type, boardState[r][c].player);
      }
    }
  }
}

/**
 * Execute a move: update boardState, refresh DOM, log it, advance turn.
 * If the move triggers pawn promotion, the turn advances only after the
 * player picks a promotion piece.
 */

function executeMove(fromRow, fromCol, toRow, toCol) {
  /* Start the game timer on the very first move */
  startGameTimer();

  var piece = boardState[fromRow][fromCol];
  if (!piece) return;

  var logEl = document.getElementById('move-log');
  var capturedPiece = boardState[toRow][toCol];

  // Save history snapshot (including current log length and progress counter for undo)
  moveHistory.push({
    boardState: cloneBoardState(boardState),
    eliminatedSet: new Set(eliminatedSet),
    currentPlayerIndex: currentPlayerIndex,
    logCount: logEl.querySelectorAll('.log-entry').length,
    movesWithoutProgress: movesWithoutProgress
  });
  document.getElementById('undo-btn').disabled = false;

  // Track progress safety net (resets on captures or pawn moves)
  if (capturedPiece !== null || piece.type === 'pawn') {
    movesWithoutProgress = 0;
  } else {
    movesWithoutProgress++;
  }

  // Remove captured piece from DOM
  if (capturedPiece !== null) {
    removePiece(toRow, toCol);
    if (typeof SoundManager !== 'undefined') SoundManager.playCapture();
  } else {
    if (typeof SoundManager !== 'undefined') SoundManager.playMove();
  }

  // Update logical state
  boardState[toRow][toCol] = piece;
  boardState[fromRow][fromCol] = null;

  // Sync DOM
  removePiece(fromRow, fromCol);
  placePiece(toRow, toCol, piece.type, piece.player);

  // Handle King capture (Disqualification)
  if (capturedPiece && capturedPiece.type === 'king') {
    eliminatePlayer(capturedPiece.player, 'King captured');
  }

  // Log the move immediately (promotion annotation added later if needed)
  logMove(piece, fromRow, fromCol, toRow, toCol, capturedPiece);

  // Track capture in the capture log (right panel)
  if (capturedPiece) {
    var capBy = PLAYER_DEFS[piece.player];
    var capOf = PLAYER_DEFS[capturedPiece.player];
    captureLog.push({
      byName: capBy.name, byColor: capBy.cssColor,
      ofName: capOf.name, ofColor: capOf.cssColor,
      type: capturedPiece.type,
      symbol: PIECE_SYMBOLS[capturedPiece.type] || '♟'
    });
    updateCapturedArea();
  }

  // Check for pawn promotion
  if (piece.type === 'pawn' && isPawnPromotionSquare(toRow, toCol, piece.player)) {
    var promos = getAvailablePromotions(piece.player);
    var hasAvail = promos.some(function (p) { return p.available; });
    if (!hasAvail) {
      // Every promotion type is at its cap — pawn stays as pawn
      advanceTurn();
      return;
    }

    // In vs Computer mode, AI players auto-promote without showing the modal
    if (aiPlayerIds.has(piece.player)) {
      // AI picks the best available: queen > rook > knight > bishop
      var preferOrder = ['queen', 'rook', 'knight', 'bishop'];
      var aiChoice = null;
      for (var pi = 0; pi < preferOrder.length; pi++) {
        var found = promos.find(function (p) { return p.type === preferOrder[pi] && p.available; });
        if (found) { aiChoice = found.type; break; }
      }
      if (!aiChoice) aiChoice = promos.find(function (p) { return p.available; }).type;
      boardState[toRow][toCol] = { player: piece.player, type: aiChoice };
      removePiece(toRow, toCol);
      placePiece(toRow, toCol, aiChoice, piece.player);
      appendPromotionToLog(aiChoice);
      showPromotionBanner(PLAYER_DEFS[piece.player].name, aiChoice);
      advanceTurn();
      return;
    }

    // Human player: show the promotion modal
    showPromotionModal(toRow, toCol, piece.player, function (chosenType) {
      // Apply promotion to logical state and DOM
      boardState[toRow][toCol] = { player: piece.player, type: chosenType };
      removePiece(toRow, toCol);
      placePiece(toRow, toCol, chosenType, piece.player);
      // Annotate the log entry with the chosen promotion
      appendPromotionToLog(chosenType);
      showPromotionBanner(PLAYER_DEFS[piece.player].name, chosenType);
      advanceTurn();
    });
    return; // turn advances inside the modal callback above
  }

  advanceTurn();
}

/**
 * Undo the last move.
 */
function undoLastMove() {
  if (moveHistory.length === 0) return;
  var snapshot = moveHistory.pop();

  boardState = snapshot.boardState;
  eliminatedSet = snapshot.eliminatedSet;
  currentPlayerIndex = snapshot.currentPlayerIndex;
  movesWithoutProgress = snapshot.movesWithoutProgress || 0;

  if (moveHistory.length === 0) {
    document.getElementById('undo-btn').disabled = true;
  }

  // Restore move log to pre-move state
  var logEl = document.getElementById('move-log');
  var entries = logEl.querySelectorAll('.log-entry');
  for (var i = entries.length - 1; i >= snapshot.logCount; i--) {
    entries[i].remove();
  }
  if (logEl.querySelectorAll('.log-entry').length === 0 && !logEl.querySelector('.log-empty')) {
    var ph = document.createElement('p');
    ph.className = 'log-empty';
    ph.textContent = 'No moves yet.';
    logEl.appendChild(ph);
  }

  // Re-sync DOM
  syncBoardDOM();
  clearHighlights();
  selectedCell = null;
  validMoves = [];

  var cp = currentPlayer();
  updateTurnIndicator(cp);
  renderPlayersList(gameActivePlayers, cp.id, eliminatedSet);
}

/**
 * Handle a click on a board cell (row, col).
 * Three cases:
 *   1. Clicked own piece → select it and show moves
 *   2. Already selected + clicked a legal destination → execute move
 *   3. Clicked empty/enemy with nothing selected → deselect
 */
function handleCellClick(row, col) {
  var cp = currentPlayer();
  var piece = boardState[row][col];

  // Case 1: clicking own piece — (re-)select it
  if (piece && piece.player === cp.id) {
    clearHighlights();
    selectedCell = { row: row, col: col };
    validMoves = getLegalMoves(row, col);

    var cellEl = getCellEl(row, col);
    if (cellEl) cellEl.classList.add('selected');

    validMoves.forEach(function (m) {
      var mc = getCellEl(m.row, m.col);
      if (mc) mc.classList.add(m.isCapture ? 'valid-capture' : 'valid-move');
    });
    return;
  }

  // Case 2: a piece is selected — try to move to this cell
  if (selectedCell) {
    var dest = validMoves.find(function (m) { return m.row === row && m.col === col; });
    if (dest) {
      startGameTimer();
      executeMove(selectedCell.row, selectedCell.col, row, col);
    } else {
      // Clicked invalid square — deselect
      clearHighlights();
      selectedCell = null;
      validMoves = [];
    }
  }
}

/**
 * Attach a single delegated click listener to the board container.
 * Safe to call on every new game — removes the old listener first.
 */
function attachBoardClickHandler() {
  var boardEl = document.getElementById('chess-board');
  if (boardClickHandlerRef) {
    boardEl.removeEventListener('click', boardClickHandlerRef);
  }
  boardClickHandlerRef = function (e) {
    // Walk up from the click target to find the nearest .cell
    var target = e.target;
    while (target && target !== boardEl) {
      if (target.classList && target.classList.contains('cell')) break;
      target = target.parentElement;
    }
    if (!target || !target.classList.contains('cell')) return;
    if (target.classList.contains('invalid')) return;

    var row = parseInt(target.dataset.row, 10);
    var col = parseInt(target.dataset.col, 10);
    if (isNaN(row) || isNaN(col)) return;
    handleCellClick(row, col);
  };
  boardEl.addEventListener('click', boardClickHandlerRef);
}

/* ════════════════════════════════════════════════════════════
   AI OPPONENT
   ════════════════════════════════════════════════════════════ */

var PIECE_VALUES = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 0 };

function getAllMovesForPlayer(playerId) {
  var moves = [];
  for (var r = 0; r < BOARD_SIZE; r++) {
    for (var c = 0; c < BOARD_SIZE; c++) {
      var piece = boardState[r][c];
      if (piece && piece.player === playerId) {
        var legal = getLegalMoves(r, c);
        legal.forEach(function (m) {
          moves.push({ fromRow: r, fromCol: c, toRow: m.row, toCol: m.col, isCapture: m.isCapture });
        });
      }
    }
  }
  return moves;
}

function scoreMoveIntermediate(move) {
  var score = 0;
  var movingPiece = boardState[move.fromRow][move.fromCol];
  if (!movingPiece) return 0;
  var playerId = movingPiece.player;

  if (move.isCapture) {
    var target = boardState[move.toRow][move.toCol];
    if (target) score += PIECE_VALUES[target.type] * 10;
  }
  var center = (BOARD_SIZE - 1) / 2;
  var dr = move.toRow - center, dc = move.toCol - center;
  score += Math.max(0, 4 - Math.sqrt(dr * dr + dc * dc)) * 0.5;

  // Targeting/attacking opponent Kings (seeking checkmate)
  if (movingPiece.type !== 'king') {
    var dist = getDistanceToClosestEnemyKing(move.toRow, move.toCol, playerId);
    score += (BOARD_SIZE - dist) * 2;
  }

  // Pawn push bonus to utilize revival logic
  if (movingPiece.type === 'pawn') {
    var seat = PLAYER_DEFS[playerId].seat;
    if (seat === 'top' && move.toRow > move.fromRow) score += 10;
    if (seat === 'bottom' && move.toRow < move.fromRow) score += 10;
    if (seat === 'left' && move.toCol > move.fromCol) score += 10;
    if (seat === 'right' && move.toCol < move.fromCol) score += 10;
  }

  // Heavy penalty for moving King back and forth unless King is in check
  if (movingPiece.type === 'king') {
    var inCheck = isKingInCheck(playerId, boardState);
    if (!inCheck) {
      score -= 150;
    }
  }

  // Safety net aggressive endgame evaluation
  if (movesWithoutProgress >= 14) {
    var dist = getDistanceToClosestEnemyKing(move.toRow, move.toCol, playerId);
    score += (BOARD_SIZE - dist) * 15;
  }

  return score;
}

function scoreMoveAdvanced(move, playerId) {
  var score = 0;
  var movingPiece = boardState[move.fromRow][move.fromCol];
  if (!movingPiece) return 0;

  if (move.isCapture) {
    var target = boardState[move.toRow][move.toCol];
    if (target) score += PIECE_VALUES[target.type] * 100;
  }
  var tempState = cloneBoardState(boardState);
  tempState[move.toRow][move.toCol] = movingPiece;
  tempState[move.fromRow][move.fromCol] = null;

  for (var i = 0; i < gameActivePlayers.length; i++) {
    var oppId = gameActivePlayers[i].id;
    if (oppId !== playerId && !eliminatedSet.has(oppId)) {
      if (isKingInCheck(oppId, tempState)) score += 25;
    }
  }
  if (isKingInCheck(playerId, tempState)) score -= 500;

  var center = (BOARD_SIZE - 1) / 2;
  var dr = move.toRow - center, dc = move.toCol - center;
  score += Math.max(0, 5 - Math.sqrt(dr * dr + dc * dc)) * 2;

  // Targeting/attacking opponent Kings
  if (movingPiece.type !== 'king') {
    var dist = getDistanceToClosestEnemyKing(move.toRow, move.toCol, playerId);
    score += (BOARD_SIZE - dist) * 4;
  }

  // Active pawn push bonus for promotion
  if (movingPiece.type === 'pawn') {
    var seat = PLAYER_DEFS[playerId].seat;
    if (seat === 'top' && move.toRow > move.fromRow) score += 20;
    if (seat === 'bottom' && move.toRow < move.fromRow) score += 20;
    if (seat === 'left' && move.toCol > move.fromCol) score += 20;
    if (seat === 'right' && move.toCol < move.fromCol) score += 20;
  }

  // Heavy penalty for shuffling King
  if (movingPiece.type === 'king') {
    var inCheck = isKingInCheck(playerId, boardState);
    if (!inCheck) {
      score -= 200;
    }
  }

  // Safety net aggressive endgame evaluation
  if (movesWithoutProgress >= 14) {
    var dist = getDistanceToClosestEnemyKing(move.toRow, move.toCol, playerId);
    score += (BOARD_SIZE - dist) * 30;
  }

  return score;
}

/**
 * 1-ply look-ahead evaluator — used only by the Advanced AI.
 * Builds on scoreMoveAdvanced but also penalises moves that immediately
 * expose friendly pieces to opponent capture, and rewards moves that put
 * any opponent king into check.
 */
function scoreMoveDeep(move, playerId) {
  var base = scoreMoveAdvanced(move, playerId);

  // Simulate the move on a temporary state
  var tempState = cloneBoardState(boardState);
  var movingPiece = tempState[move.fromRow][move.fromCol];
  if (!movingPiece) return base;
  tempState[move.toRow][move.toCol] = movingPiece;
  tempState[move.fromRow][move.fromCol] = null;

  // Penalty: highest-value friendly piece that any opponent can immediately capture
  var oppPenalty = 0;
  for (var i = 0; i < gameActivePlayers.length; i++) {
    var oppId = gameActivePlayers[i].id;
    if (oppId === playerId || eliminatedSet.has(oppId)) continue;
    for (var r = 0; r < BOARD_SIZE; r++) {
      for (var c = 0; c < BOARD_SIZE; c++) {
        var oppPiece = tempState[r][c];
        if (!oppPiece || oppPiece.player !== oppId) continue;
        var oppMoves = getPseudoLegalMoves(r, c, tempState);
        for (var m = 0; m < oppMoves.length; m++) {
          var mv = oppMoves[m];
          if (mv.isCapture && tempState[mv.row] && tempState[mv.row][mv.col] &&
              tempState[mv.row][mv.col].player === playerId) {
            var capVal = PIECE_VALUES[tempState[mv.row][mv.col].type] || 0;
            if (capVal > oppPenalty) oppPenalty = capVal;
          }
        }
      }
    }
  }

  // Bonus: reward for putting any opponent king into check after this move
  var checkBonus = 0;
  for (var j = 0; j < gameActivePlayers.length; j++) {
    var oId = gameActivePlayers[j].id;
    if (oId !== playerId && !eliminatedSet.has(oId)) {
      if (isKingInCheck(oId, tempState)) checkBonus += 60;
    }
  }

  return base + checkBonus - oppPenalty * 60;
}

function executeAIMove(playerId) {
  if (!currentPlayer() || currentPlayer().id !== playerId) return;
  var moves = getAllMovesForPlayer(playerId);
  if (moves.length === 0) return;

  var chosen;
  if (selectedDifficulty === 'beginner') {
    // Beginner (upgraded): uses intermediate scoring, picks from top-5 with randomness.
    // Equivalent to old Advanced — still beatable but requires real strategy from human.
    moves.sort(function (a, b) { return scoreMoveIntermediate(b) - scoreMoveIntermediate(a); });
    var topN = Math.min(5, moves.length);
    chosen = moves[Math.floor(Math.random() * topN)];
  } else if (selectedDifficulty === 'intermediate') {
    // Intermediate (upgraded): uses advanced scoring, picks from top-2.
    // Sharp positional play with only minimal randomness.
    moves.sort(function (a, b) { return scoreMoveAdvanced(b, playerId) - scoreMoveAdvanced(a, playerId); });
    var topN2 = Math.min(2, moves.length);
    chosen = moves[Math.floor(Math.random() * topN2)];
  } else {
    // Advanced (upgraded): uses 1-ply deep look-ahead, always takes the single best move.
    // Most aggressive and calculated — hardest to beat.
    moves.sort(function (a, b) { return scoreMoveDeep(b, playerId) - scoreMoveDeep(a, playerId); });
    chosen = moves[0];
  }
  executeMove(chosen.fromRow, chosen.fromCol, chosen.toRow, chosen.toCol);
}

/* ════════════════════════════════════════════════════════════
   PARTICLE CANVAS — premium floating gold/white particles
   ════════════════════════════════════════════════════════════ */
function initParticleCanvas() {
  var screens = ['setup-screen', 'mode-screen', 'board-style-screen'];
  screens.forEach(function (screenId) {
    var screen = document.getElementById(screenId);
    if (!screen) return;
    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;';
    screen.insertBefore(canvas, screen.firstChild);
    function resize() { canvas.width = screen.offsetWidth || window.innerWidth; canvas.height = screen.offsetHeight || window.innerHeight; }
    resize();
    window.addEventListener('resize', resize);
    var pts = [];
    for (var i = 0; i < 60; i++) {
      pts.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.7 + 0.3,
        speed: Math.random() * 0.35 + 0.08,
        drift: (Math.random() - 0.5) * 0.25,
        alpha: Math.random() * 0.55 + 0.12,
        gold: Math.random() > 0.45
      });
    }
    var ctx = canvas.getContext('2d');
    function frame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach(function (p) {
        p.y -= p.speed; p.x += p.drift;
        if (p.y < -5) { p.y = canvas.height + 5; p.x = Math.random() * canvas.width; }
        if (p.x < -5 || p.x > canvas.width + 5) p.x = Math.random() * canvas.width;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.gold ? '#f0c040' : '#e8e0ff';
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      requestAnimationFrame(frame);
    }
    frame();
  });
}

/* ════════════════════════════════════════════════════════════
   SETUP SCREEN LOGIC
   ════════════════════════════════════════════════════════════ */
let selectedPlayerCount = null;
var selectedMode = null;   // 'friends' | 'computer'
var selectedDifficulty = null; // 'beginner' | 'intermediate' | 'advanced'
var selectedBoardStyle = null; // 'ordinary' | 'newstyle' (for 3/4 player only)

const setupScreen = document.getElementById('setup-screen');
const gameScreen = document.getElementById('game-screen');
const startBtn = document.getElementById('start-btn');
const backBtn = document.getElementById('back-to-menu-btn');
const playerBtns = document.querySelectorAll('.player-btn');
const startBtnText = startBtn.querySelector('.start-btn-text');

/* ── Mode-screen helpers (called from HTML onclick) ────────── */
function selectMode(mode) {
  selectedMode = mode;
  document.querySelectorAll('.mode-btn').forEach(function (b) { b.classList.remove('selected'); });
  var btn = document.getElementById('mode-' + mode);
  if (btn) btn.classList.add('selected');
  var diffPanel = document.getElementById('difficulty-panel');
  if (mode === 'computer') {
    diffPanel.classList.add('visible');
    diffPanel.setAttribute('aria-hidden', 'false');
  } else {
    diffPanel.classList.remove('visible');
    diffPanel.setAttribute('aria-hidden', 'true');
    selectedDifficulty = 'none';
  }
  _updateModeStartBtn();
}

function selectDifficulty(diff) {
  selectedDifficulty = diff;
  document.querySelectorAll('.diff-btn').forEach(function (b) { b.classList.remove('selected'); });
  var btn = document.getElementById('diff-' + diff);
  if (btn) btn.classList.add('selected');
  _updateModeStartBtn();
}

function _updateModeStartBtn() {
  var btn = document.getElementById('mode-start-btn');
  var txt = btn.querySelector('.start-btn-text');
  if (!selectedMode) { btn.disabled = true; txt.textContent = 'Select a mode to begin'; return; }
  if (selectedMode === 'computer' && !selectedDifficulty) { btn.disabled = true; txt.textContent = 'Select a difficulty'; return; }
  btn.disabled = false;
  txt.textContent = selectedMode === 'computer'
    ? 'Play vs Computer (' + selectedDifficulty.charAt(0).toUpperCase() + selectedDifficulty.slice(1) + ')'
    : 'Play with Friends';
}

function confirmModeAndStart() {
  if (!selectedMode) return;
  if (selectedMode === 'computer' && !selectedDifficulty) return;
  // 3/4 player games show the board-style selection screen before starting
  if (selectedPlayerCount === 3 || selectedPlayerCount === 4) {
    showBoardStyleScreen();
  } else {
    boardStyleMode = 'ordinary';
    startGame();
  }
}

function showBoardStyleScreen() {
  selectedBoardStyle = null;
  document.querySelectorAll('.style-btn').forEach(function (b) { b.classList.remove('selected'); });
  var bsBtn = document.getElementById('board-style-start-btn');
  if (bsBtn) {
    bsBtn.disabled = true;
    bsBtn.querySelector('.start-btn-text').textContent = 'Select a style to begin';
  }
  var sub = document.getElementById('board-style-subtitle');
  if (sub) sub.textContent = selectedPlayerCount + '-Player Game — Choose Board Style';
  showScreen('board-style-screen');
}

function selectBoardStyle(style) {
  selectedBoardStyle = style;
  document.querySelectorAll('.style-btn').forEach(function (b) { b.classList.remove('selected'); });
  var btn = document.getElementById('style-' + style);
  if (btn) btn.classList.add('selected');

  var bsBtn = document.getElementById('board-style-start-btn');
  if (bsBtn) {
    // For 4P + newstyle: forward to sub-selector; don't enable start btn yet
    if (selectedPlayerCount === 4 && style === 'newstyle') {
      bsBtn.disabled = false;
      bsBtn.querySelector('.start-btn-text').textContent = 'Choose Shape →';
    } else {
      bsBtn.disabled = false;
      bsBtn.querySelector('.start-btn-text').textContent =
        style === 'newstyle' ? 'Play New Style ◆' : 'Play Ordinary Style ⊞';
    }
  }
}

function confirmBoardStyleAndStart() {
  if (!selectedBoardStyle) return;
  // 4P + New Style → show sub-selector for Hex/Ring/Diamond
  if (selectedPlayerCount === 4 && selectedBoardStyle === 'newstyle') {
    showScreen('ns4-style-screen');
    return;
  }
  boardStyleMode = selectedBoardStyle;
  startGame();
}

/**
 * Called from #ns4-style-screen when user selects one of the 3 shapes.
 * style: 'ns4-octagonal' | 'ns4-diamond' | 'ns4-circular'
 * Sets boardStyleMode and immediately starts the game.
 */
function selectNS4Style(style) {
  boardStyleMode = style;
  startGame();
}

function selectPlayerCount(count) {
  selectedPlayerCount = count;
  playerBtns.forEach(btn => {
    const sel = Number(btn.dataset.count) === count;
    btn.classList.toggle('selected', sel);
    btn.setAttribute('aria-pressed', String(sel));
  });
  startBtn.disabled = false;
  startBtnText.textContent = `Next: Choose Mode →`;
}

playerBtns.forEach(btn => {
  btn.addEventListener('click', () => selectPlayerCount(Number(btn.dataset.count)));
  btn.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectPlayerCount(Number(btn.dataset.count));
    }
  });
});

/* ════════════════════════════════════════════════════════════
   SCREEN TRANSITIONS & SPA HISTORY ROUTING
   ════════════════════════════════════════════════════════════ */

/**
 * _resetScreenState(id)
 * Resets all UI selection flags and button states for the given screen so
 * that every interactive element is live and responsive after a back
 * navigation (popstate) returns to that screen.
 */
function _resetScreenState(id) {
  switch (id) {
    case 'setup-screen':
      // Reset player-count selection and start button
      selectedPlayerCount = null;
      document.querySelectorAll('.player-btn').forEach(function (b) {
        b.classList.remove('selected');
        b.setAttribute('aria-pressed', 'false');
        b.disabled = false; // ensure buttons are never left disabled
      });
      startBtn.disabled = true;
      startBtnText.textContent = 'Select player count first';
      break;

    case 'mode-screen':
      // Reset mode + difficulty UI only — keep playerCount intact
      selectedMode = null;
      selectedDifficulty = null;
      document.querySelectorAll('.mode-btn').forEach(function (b) { b.classList.remove('selected'); b.disabled = false; });
      document.querySelectorAll('.diff-btn').forEach(function (b) { b.classList.remove('selected'); b.disabled = false; });
      var dp = document.getElementById('difficulty-panel');
      if (dp) { dp.classList.remove('visible'); dp.setAttribute('aria-hidden', 'true'); }
      _updateModeStartBtn();
      break;

    case 'board-style-screen':
      // Reset board style selection — keep playerCount + mode intact
      selectedBoardStyle = null;
      document.querySelectorAll('.style-btn').forEach(function (b) { b.classList.remove('selected'); b.disabled = false; });
      var bsBtn = document.getElementById('board-style-start-btn');
      if (bsBtn) { bsBtn.disabled = true; bsBtn.querySelector('.start-btn-text').textContent = 'Select a style to begin'; }
      break;

    case 'ns4-style-screen':
      // Reset ns4 shape selection buttons
      document.querySelectorAll('.ns4-style-btn').forEach(function (b) { b.classList.remove('selected'); b.disabled = false; });
      break;

    default:
      break;
  }
}

function showScreen(id, pushHistory) {
  if (pushHistory !== false) {
    try {
      if (!history.state || history.state.screen !== id) {
        history.pushState({ screen: id }, '', '?step=' + id);
      }
    } catch (e) { }
  }

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  var scr = document.getElementById(id);
  if (scr) scr.classList.add('active');

  // Pull-to-refresh & HUD conditional visibility:
  // ONLY active gameplay screen disables pull-to-refresh (gameplay-active).
  // Home, setup, mode, style, and store screens keep pull-to-refresh enabled.
  if (id === 'game-screen') {
    document.documentElement.classList.add('gameplay-active');
    document.body.classList.add('gameplay-active');
    document.body.classList.remove('show-hud');
  } else {
    document.documentElement.classList.remove('gameplay-active');
    document.body.classList.remove('gameplay-active');
    document.body.classList.add('show-hud');
  }

  if (typeof PointsManager !== 'undefined') {
    PointsManager.updateHUD();
  }
}

/* ════════════════════════════════════════════════════════════
   SOUND MANAGER (Web Audio API Synthesizer)
   ════════════════════════════════════════════════════════════ */
var SoundManager = {
  audioCtx: null,
  muted: localStorage.getItem('rajachess_muted') === 'true',

  initCtx: function () {
    if (!this.audioCtx) {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  },

  isMuted: function () {
    return this.muted;
  },

  toggleMute: function () {
    this.muted = !this.muted;
    localStorage.setItem('rajachess_muted', String(this.muted));
    this.updateUI();
    if (!this.muted) {
      this.playMove();
    }
  },

  updateUI: function () {
    var btns = document.querySelectorAll('.sound-toggle-btn');
    var muted = this.muted;
    btns.forEach(function (b) {
      var icon = b.querySelector('.sound-icon');
      var text = b.querySelector('.sound-text');
      if (icon) icon.textContent = muted ? '🔇' : '🔊';
      if (text) text.textContent = muted ? 'Muted' : 'Sound On';
      b.setAttribute('aria-label', muted ? 'Unmute Sound' : 'Mute Sound');
      b.classList.toggle('muted', muted);
    });
  },

  playMove: function () {
    if (this.muted) return;
    this.initCtx();
    if (!this.audioCtx) return;
    try {
      var ctx = this.audioCtx;
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) { }
  },

  playCapture: function () {
    if (this.muted) return;
    this.initCtx();
    if (!this.audioCtx) return;
    try {
      var ctx = this.audioCtx;
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(650, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) { }
  },

  playCheck: function () {
    if (this.muted) return;
    this.initCtx();
    if (!this.audioCtx) return;
    try {
      var ctx = this.audioCtx;
      var now = ctx.currentTime;
      [659.25, 880.00].forEach(function (freq, idx) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.35, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.1 + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.14);
      });
    } catch (e) { }
  },

  playGameOver: function (isWin) {
    if (this.muted) return;
    this.initCtx();
    if (!this.audioCtx) return;
    try {
      var ctx = this.audioCtx;
      var now = ctx.currentTime;
      if (isWin) {
        var notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach(function (freq, idx) {
          var osc = ctx.createOscillator();
          var gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.12);
          gain.gain.setValueAtTime(0.4, now + idx * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.12 + 0.28);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.12);
          osc.stop(now + idx * 0.12 + 0.28);
        });
      } else {
        var notes = [392.00, 329.63, 261.63];
        notes.forEach(function (freq, idx) {
          var osc = ctx.createOscillator();
          var gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now + idx * 0.16);
          gain.gain.setValueAtTime(0.3, now + idx * 0.16);
          gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.16 + 0.24);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.16);
          osc.stop(now + idx * 0.16 + 0.24);
        });
      }
    } catch (e) { }
  }
};

/* ════════════════════════════════════════════════════════════
   STATS & ACHIEVEMENTS MANAGER
   ════════════════════════════════════════════════════════════ */
var StatsManager = {
  getStats: function () {
    var raw = localStorage.getItem('rajachess_stats');
    if (!raw) return { gamesPlayed: 0, wins: 0, losses: 0 };
    try { return JSON.parse(raw); } catch (e) { return { gamesPlayed: 0, wins: 0, losses: 0 }; }
  },

  saveStats: function (s) {
    localStorage.setItem('rajachess_stats', JSON.stringify(s));
  },

  recordMatchEnd: function (isWin) {
    var s = this.getStats();
    s.gamesPlayed = (s.gamesPlayed || 0) + 1;
    if (isWin) s.wins = (s.wins || 0) + 1;
    else s.losses = (s.losses || 0) + 1;
    this.saveStats(s);
    this.checkAchievements();
  },

  getWinRate: function () {
    var s = this.getStats();
    if (!s.gamesPlayed || s.gamesPlayed === 0) return 0;
    return Math.round((s.wins / s.gamesPlayed) * 100);
  },

  achievements: [
    { id: 'first_victory', title: 'First Victory', desc: 'Win your first match in RajaChess', icon: '🏆', check: function (s) { return s.wins >= 1; } },
    { id: 'chess_master', title: 'Chess Master', desc: 'Achieve 5 match victories', icon: '👑', check: function (s) { return s.wins >= 5; } },
    { id: 'shahi_collector', title: 'Shahi Collector', desc: 'Purchase any item from the Shahi Khazana store', icon: '🏺', check: function (s) { return typeof StoreManager !== 'undefined' && StoreManager.getOwned().length > 3; } },
    { id: 'grand_monarch', title: 'Grand Monarch', desc: 'Achieve 10 match victories', icon: '⚔️', check: function (s) { return s.wins >= 10; } },
    { id: 'treasury_tycoon', title: 'Treasury Tycoon', desc: 'Earn 500 total points in royal wealth', icon: '🪙', check: function (s) { return typeof PointsManager !== 'undefined' && PointsManager.get() >= 500; } }
  ],

  checkAchievements: function () {
    var modal = document.getElementById('stats-modal');
    if (modal && modal.classList.contains('active')) {
      this.renderModal();
    }
  },

  renderModal: function () {
    var s = this.getStats();
    var wr = this.getWinRate();

    var gamesEl = document.getElementById('stat-games');
    var winsEl = document.getElementById('stat-wins');
    var lossesEl = document.getElementById('stat-losses');
    var rateEl = document.getElementById('stat-winrate');

    if (gamesEl) gamesEl.textContent = s.gamesPlayed;
    if (winsEl) winsEl.textContent = s.wins;
    if (lossesEl) lossesEl.textContent = s.losses;
    if (rateEl) rateEl.textContent = wr + '%';

    var container = document.getElementById('badges-grid');
    if (!container) return;
    container.innerHTML = '';

    this.achievements.forEach(function (ach) {
      var unlocked = ach.check(s);
      var badge = document.createElement('div');
      badge.className = 'badge-card ' + (unlocked ? 'unlocked' : 'locked');
      badge.innerHTML = `
        <div class="badge-icon">${ach.icon}</div>
        <div class="badge-content">
          <div class="badge-title">${ach.title}</div>
          <div class="badge-desc">${ach.desc}</div>
        </div>
        <div class="badge-status">${unlocked ? '✨ Unlocked' : '🔒 Locked'}</div>
      `;
      container.appendChild(badge);
    });
  }
};

function openStatsModal() {
  StatsManager.renderModal();
  var modal = document.getElementById('stats-modal');
  if (modal) {
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
  }
}

function closeStatsModal() {
  var modal = document.getElementById('stats-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  }
}

/* ════════════════════════════════════════════════════════════
   GAMIFICATION, STORE, VICTORY & SAFETY NET MANAGERS
   ════════════════════════════════════════════════════════════ */
var movesWithoutProgress = 0;
var confettiActive = false;
var confettiParticles = [];

var PointsManager = {
  get: function () {
    var pts = localStorage.getItem('rajachess_totalPoints');
    return pts ? parseInt(pts, 10) : 0;
  },
  add: function (n) {
    var pts = this.get() + n;
    localStorage.setItem('rajachess_totalPoints', pts);
    this.updateHUD();
    return pts;
  },
  deduct: function (n) {
    var pts = Math.max(0, this.get() - n);
    localStorage.setItem('rajachess_totalPoints', pts);
    this.updateHUD();
    return pts;
  },
  updateHUD: function () {
    var pts = this.get();
    var valEl = document.getElementById('points-hud-value');
    if (valEl) valEl.textContent = pts;
    var sValEl = document.getElementById('store-balance-value');
    if (sValEl) sValEl.textContent = pts;
  }
};

var StoreManager = {
  items: {
    board_classic: { id: "board_classic", name: "Royal Classic", price: 0, desc: "Classic traditional chess board (Free)", type: "board", class: "theme-classic", previewHtml: `<div class="preview-board-classic"></div>` },
    board_neon: { id: "board_neon", name: "Neon Cyberpunk", price: 200, desc: "Glowing cybernetic battlefield", type: "board", class: "theme-neon", previewHtml: `<div class="preview-board-neon"></div>` },
    board_marble: { id: "board_marble", name: "Imperial Marble", price: 450, desc: "Luxurious polished marble tiles", type: "board", class: "theme-marble", previewHtml: `<div class="preview-board-marble"></div>` },
    board_forest: { id: "board_forest", name: "Enchanted Forest", price: 350, desc: "Deep emerald green woodland board", type: "board", class: "theme-forest", previewHtml: `<div style="background:repeating-conic-gradient(#2d5a27 0% 25%,#1a3a15 25% 50%);background-size:30px 30px;width:100%;height:100%"></div>` },
    board_royal: { id: "board_royal", name: "Royal Purple", price: 500, desc: "Deep violet regal board for kings", type: "board", class: "theme-royal", previewHtml: `<div style="background:repeating-conic-gradient(#3b1f6a 0% 25%,#1e0f3a 25% 50%);background-size:30px 30px;width:100%;height:100%"></div>` },

    color_standard: { id: "color_standard", name: "Standard Colors", price: 0, desc: "Classic multiplayer layout (Free)", type: "color", class: "skin-standard", previewHtml: `<div class="preview-piece-color"><span class="preview-piece-dot" style="background:#FFD700"></span><span class="preview-piece-dot" style="background:#0F52BA"></span><span class="preview-piece-dot" style="background:#50C878"></span><span class="preview-piece-dot" style="background:#E0115F"></span></div>` },
    color_golden: { id: "color_golden", name: "Golden Dynasty", price: 350, desc: "Regal shimmering gold overlay", type: "color", class: "skin-golden", previewHtml: `<div class="preview-piece-color"><span class="preview-piece-dot" style="background:#ffd700;box-shadow:0 0 8px #ffd700"></span><span class="preview-piece-dot" style="background:#ffd700;box-shadow:0 0 8px #ffd700"></span><span class="preview-piece-dot" style="background:#ffd700;box-shadow:0 0 8px #ffd700"></span><span class="preview-piece-dot" style="background:#ffd700;box-shadow:0 0 8px #ffd700"></span></div>` },
    color_crystal: { id: "color_crystal", name: "Crystal Obsidian", price: 600, desc: "Highly vibrant crystal elements", type: "color", class: "skin-crystal", previewHtml: `<div class="preview-piece-color"><span class="preview-piece-dot" style="background:#00ffff"></span><span class="preview-piece-dot" style="background:#e02424"></span><span class="preview-piece-dot" style="background:#ff00ff"></span><span class="preview-piece-dot" style="background:#ffffff"></span></div>` },

    shape_classic: { id: "shape_classic", name: "Classic Set", price: 0, desc: "Standard traditional Unicode shapes (Free)", type: "shape", previewHtml: `<span class="preview-piece-shape">♚</span>` },
    shape_medieval: { id: "shape_medieval", name: "Medieval Set", price: 500, desc: "Classic serif crown & crest shapes", type: "shape", previewHtml: `<span class="preview-piece-shape shape-style-medieval">♛</span>` },
    shape_futuristic: { id: "shape_futuristic", name: "Futuristic Set", price: 750, desc: "Sleek glowing polyline geometry style", type: "shape", previewHtml: `<span class="preview-piece-shape shape-style-futuristic">♞</span>` },
    shape_mythic: { id: "shape_mythic", name: "Mythic Set", price: 1000, desc: "Premium ornate shapes with extra contrast", type: "shape", previewHtml: `<span class="preview-piece-shape shape-style-mythic">♚</span>` }
  },
  getOwned: function () {
    var owned = localStorage.getItem('rajachess_owned');
    if (!owned) {
      owned = ['board_classic', 'color_standard', 'shape_classic'];
      localStorage.setItem('rajachess_owned', JSON.stringify(owned));
    } else {
      try { owned = JSON.parse(owned); } catch (e) { owned = ['board_classic', 'color_standard', 'shape_classic']; }
    }
    return owned;
  },
  addOwned: function (id) {
    var owned = this.getOwned();
    if (owned.indexOf(id) === -1) {
      owned.push(id);
      localStorage.setItem('rajachess_owned', JSON.stringify(owned));
    }
  },
  getEquipped: function (type) {
    var val = localStorage.getItem('rajachess_equipped_' + type);
    if (!val) {
      if (type === 'board') val = 'board_classic';
      else if (type === 'color') val = 'color_standard';
      else if (type === 'shape') val = 'shape_classic';
      localStorage.setItem('rajachess_equipped_' + type, val);
    }
    return val;
  },
  equip: function (type, id) {
    localStorage.setItem('rajachess_equipped_' + type, id);
    this.applyTheme();
  },
  applyTheme: function () {
    var boardTheme = this.getEquipped('board');
    var boardEl = document.getElementById('chess-board');
    if (boardEl) {
      boardEl.classList.remove('theme-classic', 'theme-neon', 'theme-marble', 'theme-forest', 'theme-royal');
      var it = this.items[boardTheme];
      if (it && it.class) {
        boardEl.classList.add(it.class);
      }
    }

    var colorSkin = this.getEquipped('color');
    document.body.classList.remove('skin-standard', 'skin-golden', 'skin-crystal');
    var itColor = this.items[colorSkin];
    if (itColor && itColor.class) {
      document.body.classList.add(itColor.class);
    }

    syncPlayerColorPalette();

    var gameScreen = document.getElementById('game-screen');
    if (gameScreen && gameScreen.classList.contains('active')) {
      syncBoardDOM();
    }
  }
};

function openStore() {
  showScreen('store-screen');
  switchStoreTab('board');
}

function closeStore() {
  showScreen('setup-screen');
}

function switchStoreTab(tab) {
  document.querySelectorAll('.store-tab').forEach(function (b) {
    b.classList.remove('active');
    b.setAttribute('aria-selected', 'false');
  });
  var btn = document.getElementById('stab-' + tab);
  if (btn) {
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
  }

  document.querySelectorAll('.store-panel').forEach(function (p) {
    p.classList.add('hidden');
  });
  var pan = document.getElementById('store-panel-' + tab);
  if (pan) pan.classList.remove('hidden');

  renderStoreTab(tab);
}

function renderStoreTab(tab) {
  var grid = document.getElementById('store-grid-' + tab);
  if (!grid) return;
  grid.innerHTML = '';

  var owned = StoreManager.getOwned();
  var equipped = StoreManager.getEquipped(tab);
  var totalPoints = PointsManager.get();

  var items = Object.values(StoreManager.items).filter(function (it) { return it.type === tab; });

  items.forEach(function (it) {
    var card = document.createElement('div');
    card.className = 'store-card';

    var isOwned = owned.indexOf(it.id) !== -1;
    var isEquipped = equipped === it.id;

    var actionBtnHtml = '';
    if (isEquipped) {
      actionBtnHtml = `<button class="store-buy-btn equipped" disabled>Equipped</button>`;
    } else if (isOwned) {
      actionBtnHtml = `<button class="store-buy-btn equip" onclick="equipStoreItem('${tab}', '${it.id}')">Equip</button>`;
    } else {
      var canBuy = totalPoints >= it.price;
      actionBtnHtml = `<button class="store-buy-btn buy" ${canBuy ? '' : 'disabled'} onclick="purchaseStoreItem('${tab}', '${it.id}', ${it.price})">🪙 ${it.price} pts</button>`;
    }

    card.innerHTML = `
      <div class="store-card-preview">
        ${it.previewHtml || ''}
      </div>
      <div class="store-card-info">
        <div class="store-card-title">${it.name}</div>
        <div class="store-card-desc">${it.desc}</div>
      </div>
      <div class="store-card-actions">
        ${actionBtnHtml}
      </div>
    `;
    grid.appendChild(card);
  });
}

function purchaseStoreItem(type, id, price) {
  var totalPoints = PointsManager.get();
  if (totalPoints < price) return;

  PointsManager.deduct(price);
  StoreManager.addOwned(id);
  StoreManager.equip(type, id);
  renderStoreTab(type);
  PointsManager.updateHUD();
  if (typeof StatsManager !== 'undefined') StatsManager.checkAchievements();
}

function equipStoreItem(type, id) {
  StoreManager.equip(type, id);
  renderStoreTab(type);
}

function startConfetti() {
  var canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  canvas.width = canvas.parentElement.offsetWidth || window.innerWidth;
  canvas.height = canvas.parentElement.offsetHeight || window.innerHeight;

  confettiParticles = [];
  confettiActive = true;

  var colors = ['#f0c040', '#d4891a', '#e8e0ff', '#ef4444', '#22c55e', '#3b82f6'];
  for (var i = 0; i < 150; i++) {
    confettiParticles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 6 + 4,
      d: Math.random() * canvas.height,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10 - 5,
      tiltAngleIncremental: Math.random() * 0.07 + 0.02,
      tiltAngle: 0
    });
  }

  var ctx = canvas.getContext('2d');
  function draw() {
    if (!confettiActive) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var remaining = 0;
    confettiParticles.forEach(function (p) {
      p.tiltAngle += p.tiltAngleIncremental;
      p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
      p.x += Math.sin(p.tiltAngle);
      p.tilt = Math.sin(p.tiltAngle - remaining / 3) * 15;

      if (p.y <= canvas.height) remaining++;

      ctx.beginPath();
      ctx.lineWidth = p.r / 2;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
      ctx.stroke();
    });

    if (remaining > 0) {
      requestAnimationFrame(draw);
    } else {
      confettiActive = false;
    }
  }
  draw();
}

function stopConfetti() {
  confettiActive = false;
  var canvas = document.getElementById('confetti-canvas');
  if (canvas) {
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

function getDistanceToClosestEnemyKing(row, col, playerId) {
  var minDistance = Infinity;
  for (var r = 0; r < BOARD_SIZE; r++) {
    for (var c = 0; c < BOARD_SIZE; c++) {
      var p = boardState[r][c];
      if (p && p.type === 'king' && p.player !== playerId && !eliminatedSet.has(p.player)) {
        var dist = Math.abs(row - r) + Math.abs(col - c);
        if (dist < minDistance) minDistance = dist;
      }
    }
  }
  return minDistance === Infinity ? 0 : minDistance;
}

function calculateMaterialScore(playerId) {
  var score = 0;
  for (var r = 0; r < BOARD_SIZE; r++) {
    for (var c = 0; c < BOARD_SIZE; c++) {
      var p = boardState[r][c];
      if (p && p.player === playerId) {
        score += PIECE_VALUES[p.type] || 0;
      }
    }
  }
  return score;
}

function autoResolveGame() {
  var remainingPlayers = gameActivePlayers.filter(function (p) {
    return !eliminatedSet.has(p.id);
  });

  var scores = remainingPlayers.map(function (p) {
    return {
      player: p,
      score: calculateMaterialScore(p.id)
    };
  });

  scores.sort(function (a, b) {
    return b.score - a.score;
  });

  var winner = scores[0].player;

  scores.forEach(function (s) {
    if (s.player.id !== winner.id) {
      eliminatedSet.add(s.player.id);
      for (var r = 0; r < BOARD_SIZE; r++) {
        for (var c = 0; c < BOARD_SIZE; c++) {
          if (boardState[r][c] && boardState[r][c].player === s.player.id) {
            boardState[r][c] = null;
            removePiece(r, c);
          }
        }
      }
    }
  });

  triggerGameOver(winner.id, true);
}

function triggerGameOver(winnerId, isAutoResolved) {
  let finalTime = stopGameTimer();
  var activeCount = gameActivePlayers.length - eliminatedSet.size;
  var isVictory = false;
  if (selectedMode === 'computer') {
    isVictory = (winnerId === 'red');
  } else {
    isVictory = true;
  }

  if (typeof SoundManager !== 'undefined') SoundManager.playGameOver(isVictory);
  if (typeof StatsManager !== 'undefined') StatsManager.recordMatchEnd(isVictory);

  if (isVictory) {
    var modal = document.getElementById('victory-modal');
    var msgEl = document.getElementById('victory-message');
    var amtEl = document.getElementById('vpb-amount');
    var totEl = document.getElementById('vpb-total');

    var ptsEarned = 0;
    var count = gameActivePlayers.length;
    var difficulty = selectedDifficulty || 'beginner';

    if (count === 2 || count === 3) {
      if (difficulty === 'beginner') ptsEarned = 25;
      else if (difficulty === 'intermediate') ptsEarned = 50;
      else if (difficulty === 'advanced') ptsEarned = 100;
      else ptsEarned = 25;
    } else if (count === 4) {
      if (difficulty === 'beginner') ptsEarned = 100;
      else if (difficulty === 'intermediate') ptsEarned = 150;
      else if (difficulty === 'advanced') ptsEarned = 200;
      else ptsEarned = 100;
    }

    var totalPoints = PointsManager.add(ptsEarned);

    if (msgEl) {
      msgEl.textContent = isAutoResolved
        ? "Match auto-resolved by material evaluation. Winner: " + PLAYER_DEFS[winnerId].name + "!"
        : "Winner: " + PLAYER_DEFS[winnerId].name + "!";
    }

    if (amtEl) amtEl.textContent = "+" + ptsEarned + " 🪙";
    if (totEl) totEl.textContent = "Total: " + totalPoints + " pts";

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    startConfetti();
  } else {
    var modal = document.getElementById('checkmate-modal');
    var title = modal.querySelector('.modal-title');
    var msg = document.getElementById('checkmate-message');
    var closeBtn = document.getElementById('close-modal-btn');

    title.textContent = "Game Over!";
    if (isAutoResolved) {
      msg.textContent = "Match auto-resolved by material evaluation. Winner: " + PLAYER_DEFS[winnerId].name + " (AI)";
    } else {
      if (gameActivePlayers.length === 2) {
        msg.textContent = "Winner: " + (winnerId ? PLAYER_DEFS[winnerId].name : "Nobody") + " | You were eliminated.";
      } else {
        msg.textContent = (winnerId ? PLAYER_DEFS[winnerId].name : "Nobody") + " (AI) is the WINNER!";
      }
    }
    closeBtn.textContent = "Back to Menu";
    closeBtn.onclick = function () {
      modal.classList.remove('active');
      returnToMenu();
    };
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
  }
}

function startGame() {
  if (!selectedPlayerCount) return;

  // ── Reset timer before anything else ──────────────────────
  resetGameTimer();

  var activeIds = getActivePlayers(selectedPlayerCount);

  // ── Game state reset ────────────────────────────────────────
  // Build the active player list in TURN_ORDER_ALL clockwise order
  gameActivePlayers = TURN_ORDER_ALL
    .filter(function (id) { return activeIds.indexOf(id) !== -1; })
    .map(function (id) { return PLAYER_DEFS[id]; });
  currentPlayerIndex = 0;     // Red always goes first
  eliminatedSet = new Set();
  aiPlayerIds = new Set();
  // Set up AI players (human is always Red in vs-computer mode)
  if (selectedMode === 'computer') {
    activeIds.forEach(function (id) { if (id !== 'red') aiPlayerIds.add(id); });
  }
  selectedCell = null;
  validMoves = [];
  moveHistory = [];
  captureLog = [];
  movesWithoutProgress = 0;
  document.getElementById('undo-btn').disabled = true;

  // ── Render board + pieces ────────────────────────────────────
  showScreen('game-screen');
  renderBoard(activeIds);
  placeAllPieces(activeIds);
  initBoardState(activeIds);  // sync logical state with DOM

  // Apply visual themes
  if (typeof StoreManager !== 'undefined') {
    StoreManager.applyTheme();
  }

  // ── UI ───────────────────────────────────────────────────────
  var cp = currentPlayer();
  updateTurnIndicator(cp);
  renderPlayersList(gameActivePlayers, cp.id, eliminatedSet);

  // ── Wire up click handling ───────────────────────────────────
  attachBoardClickHandler();

  // ── Reset move log & captured pieces ─────────────────────────
  captureLog = [];
  moveHistory = [];
  movesWithoutProgress = 0;
  updateCapturedArea();
  var logEl = document.getElementById('move-log');
  if (logEl) logEl.innerHTML = '<p class="log-empty">No moves yet.</p>';
}

function returnToMenu(pushHistory) {
  showScreen('setup-screen', pushHistory);
  resetGameTimer();
  selectedPlayerCount = null;
  selectedMode = null;
  selectedDifficulty = null;
  selectedBoardStyle = null;
  boardStyleMode = 'ordinary';
  aiPlayerIds = new Set();
  moveHistory = [];
  captureLog = [];
  movesWithoutProgress = 0;
  updateCapturedArea();
  var logEl = document.getElementById('move-log');
  if (logEl) logEl.innerHTML = '<p class="log-empty">No moves yet.</p>';
  playerBtns.forEach(btn => {
    btn.classList.remove('selected');
    btn.setAttribute('aria-pressed', 'false');
  });
  startBtn.disabled = true;
  startBtnText.textContent = 'Select player count first';
}

/* ── SPA Popstate / Mobile Back Button & Gesture Handler ── */
window.addEventListener('popstate', function (e) {
  // ── Step 1: Dismiss any open modal/overlay first ──────────────────────────
  // Each modal interception pushes its own history entry on open, so
  // a single back swipe correctly closes the topmost layer.

  var promotionModal = document.getElementById('promotion-modal');
  if (promotionModal && !promotionModal.getAttribute('aria-hidden') === false) {
    // promotion modal uses aria-hidden="false" when visible
    if (promotionModal.getAttribute('aria-hidden') === 'false') {
      promotionModal.setAttribute('aria-hidden', 'true');
      return;
    }
  }

  var checkmateAlertModal = document.getElementById('checkmate-alert-modal');
  if (checkmateAlertModal && checkmateAlertModal.getAttribute('aria-hidden') === 'false') {
    checkmateAlertModal.setAttribute('aria-hidden', 'true');
    return;
  }

  var statsModal = document.getElementById('stats-modal');
  if (statsModal && statsModal.classList.contains('active')) {
    closeStatsModal();
    return;
  }

  var victoryModal = document.getElementById('victory-modal');
  if (victoryModal && victoryModal.classList.contains('active')) {
    victoryModal.classList.remove('active');
    if (typeof stopConfetti === 'function') stopConfetti();
    returnToMenu(false);
    return;
  }

  var checkmateModal = document.getElementById('checkmate-modal');
  if (checkmateModal && checkmateModal.classList.contains('active')) {
    checkmateModal.classList.remove('active');
    returnToMenu(false);
    return;
  }

  // ── Step 2: Determine target screen from history state ────────────────────
  // Prefer history.state.screen; fallback to ?step= URL param; then setup-screen.
  var targetScreen;
  if (e.state && e.state.screen) {
    targetScreen = e.state.screen;
  } else {
    var urlParams = new URLSearchParams(window.location.search);
    targetScreen = urlParams.get('step') || 'setup-screen';
  }

  var VALID_SCREENS = ['setup-screen', 'mode-screen', 'board-style-screen', 'ns4-style-screen', 'game-screen', 'store-screen'];
  if (VALID_SCREENS.indexOf(targetScreen) === -1) {
    targetScreen = 'setup-screen';
  }

  var currentScreenEl = document.querySelector('.screen.active');
  var currentScreenId = currentScreenEl ? currentScreenEl.id : '';

  // ── Step 3: Navigate and reset UI state so buttons are never frozen ────────
  if (currentScreenId === 'game-screen' && targetScreen !== 'game-screen') {
    // Going back from active game → always clean up game state first
    returnToMenu(false);
    if (targetScreen !== 'setup-screen') {
      _resetScreenState(targetScreen);
      showScreen(targetScreen, false);
    }
  } else {
    // All other back transitions: reset the target screen's UI state first,
    // then show it. This ensures all buttons are unfrozen and fully interactive.
    _resetScreenState(targetScreen);
    showScreen(targetScreen, false);
  }
});

startBtn.addEventListener('click', function () {
  if (!selectedPlayerCount) return;
  // Reset mode screen and board style state
  selectedMode = null;
  selectedDifficulty = null;
  selectedBoardStyle = null;
  document.querySelectorAll('.mode-btn').forEach(function (b) { b.classList.remove('selected'); });
  document.querySelectorAll('.diff-btn').forEach(function (b) { b.classList.remove('selected'); });
  var dp = document.getElementById('difficulty-panel');
  dp.classList.remove('visible');
  dp.setAttribute('aria-hidden', 'true');
  var sub = document.getElementById('mode-screen-subtitle');
  if (sub) sub.textContent = selectedPlayerCount + '-Player Game';
  _updateModeStartBtn();
  showScreen('mode-screen');
});
backBtn.addEventListener('click', returnToMenu);

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && setupScreen.classList.contains('active') && selectedPlayerCount) {
    startGame();
  }
});

// Undo button
document.getElementById('undo-btn').addEventListener('click', undoLastMove);

// Modal close button
document.getElementById('close-modal-btn').addEventListener('click', function () {
  document.getElementById('checkmate-modal').classList.remove('active');
});

// Victory modal close button
var victoryCloseBtn = document.getElementById('victory-close-btn');
if (victoryCloseBtn) {
  victoryCloseBtn.addEventListener('click', function () {
    document.getElementById('victory-modal').classList.remove('active');
    stopConfetti();
    returnToMenu();
  });
}

/* ════════════════════════════════════════════════════════════
   INIT
   ════════════════════════════════════════════════════════════ */
if (typeof StoreManager !== 'undefined') {
  StoreManager.applyTheme();
}
if (typeof PointsManager !== 'undefined') {
  PointsManager.updateHUD();
}
if (typeof SoundManager !== 'undefined') {
  SoundManager.updateUI();
}
document.addEventListener('click', function () {
  if (typeof SoundManager !== 'undefined') SoundManager.initCtx();
}, { once: false });

try {
  if (!history.state || !history.state.screen) {
    history.replaceState({ screen: 'setup-screen' }, '', '?step=setup-screen');
  }
} catch (e) { }

showScreen('setup-screen', false);
initParticleCanvas();
updateCapturedArea();

/* ════════════════════════════════════════════════════════════
   GAME TIMER — Single unified implementation
   - Starts on first move (called from executeMove/handleCellClick)
   - stopGameTimer() clears the interval and returns elapsed MM:SS
   - resetGameTimer() calls stop then resets display to 00:00
   ════════════════════════════════════════════════════════════ */

/** @type {number|null} Interval ID for the running game timer */
var gameTimerInterval = null;

/** Seconds counted since the first move of the current game */
var secondsElapsed = 0;

/** True once the timer has been started this game */
var isTimerStarted = false;

/**
 * Start the game timer. Safe to call multiple times — only starts once per game.
 * Call this on the first move.
 */
function startGameTimer() {
  if (isTimerStarted) return;
  isTimerStarted = true;
  secondsElapsed = 0;

  gameTimerInterval = setInterval(function () {
    secondsElapsed++;

    var mins = Math.floor(secondsElapsed / 60);
    var secs = secondsElapsed % 60;
    var formatted =
      (mins < 10 ? '0' + mins : mins) + ':' +
      (secs < 10 ? '0' + secs : secs);

    /* Update all game timer digit elements (both top bar and in-game timer) */
    document.querySelectorAll('.game-timer-digits').forEach(function (el) {
      el.textContent = formatted;
    });
  }, 1000);
}

/**
 * Stop the game timer.
 * @returns {string} Elapsed time formatted as MM:SS
 */
function stopGameTimer() {
  if (gameTimerInterval) {
    clearInterval(gameTimerInterval);
    gameTimerInterval = null;
  }
  isTimerStarted = false;

  var mins = Math.floor(secondsElapsed / 60);
  var secs = secondsElapsed % 60;
  return (mins < 10 ? '0' + mins : mins) + ':' + (secs < 10 ? '0' + secs : secs);
}

/**
 * Fully reset the game timer: stop the interval, zero the counter,
 * and reset top bar & in-game timer displays to 00:00.
 */
function resetGameTimer() {
  stopGameTimer();
  secondsElapsed = 0;

  document.querySelectorAll('.game-timer-digits').forEach(function (el) {
    el.textContent = '00:00';
  });
}