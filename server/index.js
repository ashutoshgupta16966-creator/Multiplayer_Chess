/**
 * RajaChess Multiplayer Real-time Server
 * Node.js + Express + Socket.io
 * Deployable to Render or any persistent Node.js host.
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3001;

// Allowed CORS origins
const allowedOrigins = [
  'https://multiplayer-chess-eta.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8080'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app') || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive for easy testing and previews
  },
  credentials: true
}));

app.use(express.json());

// Basic health check route
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    app: 'RajaChess Socket Server',
    uptime: Math.floor(process.uptime()),
    activeRooms: rooms.size
  });
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Configure Socket.io with robust CORS and ping timeouts
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingInterval: 10000,
  pingTimeout: 5000
});

// ── In-Memory Rooms Store ────────────────────────────────────
// Map<roomCode, RoomData>
const rooms = new Map();

// Helper: Normalize mobile numbers (strip spaces, dashes, symbols)
function normalizeMobile(num) {
  if (!num) return '';
  const digits = String(num).replace(/\D/g, '');
  // If 12 digits starting with 91 (India), keep last 10
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

// Helper: Generate a clean 6-character alphanumeric room code
const CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excludes 0/O, 1/I for clarity
function generateRoomCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

// Seat definitions in RajaChess clockwise order:
// 2P: Gold (red, bottom), Sapphire (yellow, top)
// 3P: Gold (red, bottom), Sapphire (yellow, top), Emerald (green, left)
// 4P: Gold (red, bottom), Sapphire (yellow, top), Emerald (green, left), Ruby (blue, right)
const COLOR_SEQUENCE = [
  { id: 'red', name: 'Gold', seat: 'bottom', cssColor: '#FFD700' },
  { id: 'yellow', name: 'Sapphire', seat: 'top', cssColor: '#0F52BA' },
  { id: 'green', name: 'Emerald', seat: 'left', cssColor: '#50C878' },
  { id: 'blue', name: 'Ruby', seat: 'right', cssColor: '#E0115F' }
];

function getPlayerColors(count) {
  return COLOR_SEQUENCE.slice(0, count);
}

// ── Socket.io Connection & Event Handlers ───────────────────
io.on('connection', (socket) => {
  console.log(`[Socket Connected] ID: ${socket.id}`);

  /**
   * CREATE ROOM
   * Payload: { playerCount, hostMobile, invitedMobiles, boardStyle }
   */
  socket.on('create_room', (data, callback) => {
    try {
      const playerCount = Number(data.playerCount) || 2;
      if (playerCount < 2 || playerCount > 4) {
        const err = { success: false, error: 'Invalid player count. Must be 2, 3, or 4.' };
        if (callback) callback(err);
        return socket.emit('error_message', err);
      }

      const hostMobile = normalizeMobile(data.hostMobile);
      if (!hostMobile || hostMobile.length < 10) {
        const err = { success: false, error: 'Please enter a valid 10-digit mobile number for the host.' };
        if (callback) callback(err);
        return socket.emit('error_message', err);
      }

      const requiredInvites = playerCount - 1;
      const rawInvites = Array.isArray(data.invitedMobiles) ? data.invitedMobiles : [];
      const invitedMobiles = rawInvites.map(normalizeMobile).filter(m => m.length >= 10);

      if (invitedMobiles.length < requiredInvites) {
        const err = {
          success: false,
          error: `Please provide valid 10-digit mobile numbers for all ${requiredInvites} invited player(s).`
        };
        if (callback) callback(err);
        return socket.emit('error_message', err);
      }

      // Check for duplicate phone numbers in invites or with host
      const allNumbers = [hostMobile, ...invitedMobiles];
      const uniqueNumbers = new Set(allNumbers);
      if (uniqueNumbers.size !== allNumbers.length) {
        const err = { success: false, error: 'Each player mobile number must be unique.' };
        if (callback) callback(err);
        return socket.emit('error_message', err);
      }

      const roomCode = generateRoomCode();
      const boardStyle = data.boardStyle || 'ordinary';

      const hostPlayer = {
        socketId: socket.id,
        color: 'red',
        name: 'Gold',
        seat: 'bottom',
        mobile: hostMobile,
        isHost: true,
        connected: true,
        joinedAt: Date.now()
      };

      const room = {
        code: roomCode,
        playerCount: playerCount,
        boardStyle: boardStyle,
        hostMobile: hostMobile,
        whitelist: invitedMobiles, // Whitelist of other allowed players
        allMobiles: allNumbers,
        players: [hostPlayer],
        status: 'waiting', // 'waiting' | 'in_progress' | 'finished'
        currentTurn: 'red',
        turnOrder: COLOR_SEQUENCE.slice(0, playerCount).map(c => c.id),
        currentPlayerIndex: 0,
        moveHistory: [],
        createdAt: Date.now(),
        lastActivity: Date.now()
      };

      rooms.set(roomCode, room);

      socket.join(roomCode);
      socket.data = { roomCode, mobile: hostMobile, color: 'red' };

      const response = {
        success: true,
        roomCode: roomCode,
        player: hostPlayer,
        players: room.players,
        playerCount: playerCount,
        boardStyle: boardStyle,
        isHost: true
      };

      if (callback) callback(response);
      socket.emit('room_created', response);
      console.log(`[Room Created] ${roomCode} by ${hostMobile} (${playerCount} Players, ${boardStyle})`);
    } catch (e) {
      console.error('[create_room error]', e);
      const err = { success: false, error: 'Internal error while creating room.' };
      if (callback) callback(err);
      socket.emit('error_message', err);
    }
  });

  /**
   * JOIN ROOM
   * Payload: { roomCode, mobile }
   */
  socket.on('join_room', (data, callback) => {
    try {
      const roomCode = (data.roomCode || '').trim().toUpperCase();
      const mobile = normalizeMobile(data.mobile);

      if (!roomCode || !rooms.has(roomCode)) {
        const err = { success: false, error: 'Room not found. Please verify the 6-character room code.' };
        if (callback) callback(err);
        return socket.emit('error_message', err);
      }

      if (!mobile || mobile.length < 10) {
        const err = { success: false, error: 'Please enter a valid 10-digit mobile number.' };
        if (callback) callback(err);
        return socket.emit('error_message', err);
      }

      const room = rooms.get(roomCode);
      room.lastActivity = Date.now();

      // Check if this is an existing player reconnecting (host or joined player)
      const existingPlayer = room.players.find(p => p.mobile === mobile);
      if (existingPlayer) {
        if (existingPlayer.connected && existingPlayer.socketId !== socket.id) {
          const err = { success: false, error: 'A player with this mobile number is already active in the room.' };
          if (callback) callback(err);
          return socket.emit('error_message', err);
        }

        // Reconnect player!
        existingPlayer.socketId = socket.id;
        existingPlayer.connected = true;
        existingPlayer.disconnectedAt = null;

        socket.join(roomCode);
        socket.data = { roomCode, mobile, color: existingPlayer.color };

        const response = {
          success: true,
          roomCode: roomCode,
          player: existingPlayer,
          players: room.players,
          playerCount: room.playerCount,
          boardStyle: room.boardStyle,
          isHost: existingPlayer.isHost,
          status: room.status,
          currentTurn: room.currentTurn,
          moveHistory: room.moveHistory,
          isReconnect: true
        };

        if (callback) callback(response);
        socket.emit('room_joined', response);

        // Notify room of reconnection
        io.to(roomCode).emit('player_reconnected', {
          player: existingPlayer,
          players: room.players
        });
        console.log(`[Player Reconnected] ${existingPlayer.name} (${mobile}) to ${roomCode}`);
        return;
      }

      // Check whitelist: Is this mobile number in the room's whitelist?
      const isWhitelisted = room.whitelist.includes(mobile);
      if (!isWhitelisted) {
        const err = {
          success: false,
          error: 'This room is invite-only and your number was not added by the host.'
        };
        if (callback) callback(err);
        return socket.emit('error_message', err);
      }

      // Check if room is already full
      if (room.players.length >= room.playerCount) {
        const err = { success: false, error: 'This room has already reached maximum capacity.' };
        if (callback) callback(err);
        return socket.emit('error_message', err);
      }

      if (room.status === 'in_progress') {
        const err = { success: false, error: 'This match is already in progress.' };
        if (callback) callback(err);
        return socket.emit('error_message', err);
      }

      // Assign the next available color in order:
      // Index 1 -> Sapphire (yellow)
      // Index 2 -> Emerald (green)
      // Index 3 -> Ruby (blue)
      const assignedDef = COLOR_SEQUENCE[room.players.length];

      const newPlayer = {
        socketId: socket.id,
        color: assignedDef.id,
        name: assignedDef.name,
        seat: assignedDef.seat,
        mobile: mobile,
        isHost: false,
        connected: true,
        joinedAt: Date.now()
      };

      room.players.push(newPlayer);

      socket.join(roomCode);
      socket.data = { roomCode, mobile, color: newPlayer.color };

      const response = {
        success: true,
        roomCode: roomCode,
        player: newPlayer,
        players: room.players,
        playerCount: room.playerCount,
        boardStyle: room.boardStyle,
        isHost: false,
        status: room.status
      };

      if (callback) callback(response);
      socket.emit('room_joined', response);

      // Broadcast to all other players in the room
      io.to(roomCode).emit('player_joined', {
        newPlayer: newPlayer,
        players: room.players,
        isFull: room.players.length === room.playerCount
      });

      console.log(`[Player Joined] ${newPlayer.name} (${mobile}) joined ${roomCode} (${room.players.length}/${room.playerCount})`);

      // Auto-start or mark ready when room is full
      if (room.players.length === room.playerCount) {
        io.to(roomCode).emit('room_ready', {
          players: room.players,
          playerCount: room.playerCount
        });
      }
    } catch (e) {
      console.error('[join_room error]', e);
      const err = { success: false, error: 'Internal error while joining room.' };
      if (callback) callback(err);
      socket.emit('error_message', err);
    }
  });

  /**
   * START GAME (Host triggers or Auto-start)
   * Payload: { roomCode }
   */
  socket.on('start_game', (data, callback) => {
    try {
      const roomCode = data.roomCode || (socket.data && socket.data.roomCode);
      const room = rooms.get(roomCode);

      if (!room) {
        const err = { success: false, error: 'Room not found.' };
        if (callback) callback(err);
        return socket.emit('error_message', err);
      }

      // Verify sender is host
      const sender = room.players.find(p => p.socketId === socket.id);
      if (!sender || !sender.isHost) {
        const err = { success: false, error: 'Only the room host can start the game.' };
        if (callback) callback(err);
        return socket.emit('error_message', err);
      }

      if (room.players.length < room.playerCount) {
        const remaining = room.playerCount - room.players.length;
        const err = { success: false, error: `Waiting for ${remaining} more player(s) to join.` };
        if (callback) callback(err);
        return socket.emit('error_message', err);
      }

      room.status = 'in_progress';
      room.currentTurn = 'red'; // Gold always goes first
      room.lastActivity = Date.now();

      const gamePayload = {
        roomCode: room.code,
        playerCount: room.playerCount,
        boardStyle: room.boardStyle,
        turnOrder: room.turnOrder,
        currentTurn: room.currentTurn,
        players: room.players
      };

      io.to(roomCode).emit('game_started', gamePayload);
      if (callback) callback({ success: true });
      console.log(`[Game Started] Room ${roomCode} is now active!`);
    } catch (e) {
      console.error('[start_game error]', e);
    }
  });

  /**
   * MAKE MOVE
   * Payload: { roomCode, fromRow, fromCol, toRow, toCol, promotion }
   */
  socket.on('make_move', (data, callback) => {
    try {
      const roomCode = data.roomCode || (socket.data && socket.data.roomCode);
      const room = rooms.get(roomCode);

      if (!room || room.status !== 'in_progress') {
        const err = { success: false, error: 'Game is not currently active.' };
        if (callback) callback(err);
        return;
      }

      const playerColor = socket.data && socket.data.color;
      if (!playerColor) {
        const err = { success: false, error: 'Unrecognized player socket.' };
        if (callback) callback(err);
        return;
      }

      // Verify that it is this player's turn
      if (room.currentTurn !== playerColor) {
        const err = { success: false, error: `It is not your turn! Current turn: ${room.currentTurn}` };
        if (callback) callback(err);
        return socket.emit('error_message', err);
      }

      // Advance turn order clockwise among active players
      const currentIndex = room.turnOrder.indexOf(room.currentTurn);
      const nextIndex = (currentIndex + 1) % room.turnOrder.length;
      const nextTurn = room.turnOrder[nextIndex];
      room.currentTurn = nextTurn;
      room.lastActivity = Date.now();

      const moveRecord = {
        fromRow: data.fromRow,
        fromCol: data.fromCol,
        toRow: data.toRow,
        toCol: data.toCol,
        promotion: data.promotion || null,
        player: playerColor,
        nextTurn: nextTurn,
        timestamp: Date.now()
      };

      room.moveHistory.push(moveRecord);

      // Broadcast move to all players in the room (including sender)
      io.to(roomCode).emit('move_made', moveRecord);

      if (callback) callback({ success: true });
    } catch (e) {
      console.error('[make_move error]', e);
    }
  });

  /**
   * SYNC REQUEST (Reconnecting or late joiner)
   */
  socket.on('request_sync', (data) => {
    const roomCode = data.roomCode || (socket.data && socket.data.roomCode);
    const room = rooms.get(roomCode);
    if (!room) return;

    socket.emit('game_sync', {
      roomCode: room.code,
      playerCount: room.playerCount,
      boardStyle: room.boardStyle,
      status: room.status,
      currentTurn: room.currentTurn,
      turnOrder: room.turnOrder,
      players: room.players,
      moveHistory: room.moveHistory
    });
  });

  /**
   * DISCONNECT HANDLING
   */
  socket.on('disconnect', () => {
    console.log(`[Socket Disconnected] ID: ${socket.id}`);
    const { roomCode, mobile, color } = socket.data || {};
    if (!roomCode || !rooms.has(roomCode)) return;

    const room = rooms.get(roomCode);
    const player = room.players.find(p => p.socketId === socket.id || p.mobile === mobile);

    if (player) {
      player.connected = false;
      player.disconnectedAt = Date.now();
      room.lastActivity = Date.now();

      io.to(roomCode).emit('player_disconnected', {
        player: player,
        players: room.players,
        color: player.color,
        name: player.name,
        message: `${player.name} (${player.color}) disconnected. Waiting to reconnect...`
      });
      console.log(`[Player Disconnected] ${player.name} in room ${roomCode}`);
    }
  });
});

// ── Inactive Rooms Cleanup (runs every 5 minutes) ───────────
const ROOM_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    const allDisconnected = room.players.every(p => !p.connected);
    const isStale = (now - room.lastActivity) > ROOM_INACTIVITY_TIMEOUT_MS;

    if (allDisconnected || isStale) {
      console.log(`[Cleanup] Removing inactive room: ${code}`);
      rooms.delete(code);
    }
  }
}, 5 * 60 * 1000);

// ── Start Server ────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`  RajaChess Real-Time Server running on port ${PORT}`);
  console.log(`  Socket.io active with CORS support`);
  console.log(`===============================================`);
});
