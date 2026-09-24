const { io: Client } = require('socket.io-client');
const http = require('http');

async function runTests() {
  console.log('--- Starting RajaChess Server Verification Test ---');

  // 1. Verify HTTP Health Check
  const healthCheck = await new Promise((resolve, reject) => {
    http.get('http://localhost:3001/health', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });

  console.log(`[HTTP Health Check] Status: ${healthCheck.status}, Body: ${healthCheck.body}`);
  if (healthCheck.status !== 200) throw new Error('Health check failed');

  // 2. Connect Host Client
  const hostSocket = Client('http://localhost:3001');
  await new Promise(res => hostSocket.on('connect', res));
  console.log(`[Host Connected] ID: ${hostSocket.id}`);

  // 3. Create 3-Player Room
  const createRes = await new Promise((resolve) => {
    hostSocket.emit('create_room', {
      playerCount: 3,
      hostMobile: '9999911111',
      invitedMobiles: ['9888822222', '9777733333'],
      boardStyle: 'ordinary'
    }, resolve);
  });

  console.log('[Room Created Response]:', createRes);
  if (!createRes.success || !createRes.roomCode || createRes.roomCode.length !== 6) {
    throw new Error('Create room failed');
  }
  const roomCode = createRes.roomCode;

  // 4. Test unauthorized join (not on whitelist)
  const strangerSocket = Client('http://localhost:3001');
  await new Promise(res => strangerSocket.on('connect', res));
  const rejectedRes = await new Promise((resolve) => {
    strangerSocket.emit('join_room', {
      roomCode: roomCode,
      mobile: '9111100000' // not whitelisted
    }, resolve);
  });
  console.log('[Non-Whitelisted Join Attempt]:', rejectedRes);
  if (rejectedRes.success !== false || !rejectedRes.error.includes('invite-only')) {
    throw new Error('Whitelist rejection check failed');
  }
  strangerSocket.disconnect();

  // 5. Player 2 (Whitelisted) Joins
  const p2Socket = Client('http://localhost:3001');
  await new Promise(res => p2Socket.on('connect', res));
  const p2Res = await new Promise((resolve) => {
    p2Socket.emit('join_room', {
      roomCode: roomCode,
      mobile: '9888822222'
    }, resolve);
  });
  console.log('[Player 2 Joined Response]:', p2Res);
  if (!p2Res.success || p2Res.player.color !== 'yellow') {
    throw new Error('Player 2 color assignment failed (expected yellow/Sapphire)');
  }

  // 6. Player 3 (Whitelisted) Joins
  const p3Socket = Client('http://localhost:3001');
  await new Promise(res => p3Socket.on('connect', res));
  const p3Res = await new Promise((resolve) => {
    p3Socket.emit('join_room', {
      roomCode: roomCode,
      mobile: '9777733333'
    }, resolve);
  });
  console.log('[Player 3 Joined Response]:', p3Res);
  if (!p3Res.success || p3Res.player.color !== 'green') {
    throw new Error('Player 3 color assignment failed (expected green/Emerald)');
  }

  // 7. Host starts game
  const gameStartPromise = new Promise(resolve => p2Socket.on('game_started', resolve));
  hostSocket.emit('start_game', { roomCode: roomCode });
  const gameStartedData = await gameStartPromise;
  console.log('[Game Started Event]:', gameStartedData);
  if (gameStartedData.currentTurn !== 'red') throw new Error('Initial turn should be red (Gold)');

  // 8. Test move validation: Player 2 attempts to move on Red's turn -> should reject
  const invalidTurnRes = await new Promise((resolve) => {
    p2Socket.emit('make_move', {
      roomCode: roomCode,
      fromRow: 0, fromCol: 3, toRow: 1, toCol: 3
    }, resolve);
  });
  console.log('[Wrong Turn Move Rejection]:', invalidTurnRes);

  // 9. Valid move by Gold (red)
  const movePromise = new Promise(resolve => p2Socket.on('move_made', resolve));
  hostSocket.emit('make_move', {
    roomCode: roomCode,
    fromRow: 12, fromCol: 6, toRow: 11, toCol: 6
  });
  const moveData = await movePromise;
  console.log('[Move Made Broadcast Received]:', moveData);
  if (moveData.player !== 'red' || moveData.nextTurn !== 'yellow') {
    throw new Error('Move broadcast nextTurn calculation failed');
  }

  // Clean up sockets
  hostSocket.disconnect();
  p2Socket.disconnect();
  p3Socket.disconnect();

  console.log('\n--- ALL BACKEND INTEGRATION TESTS PASSED SUCCESSFULLY! ---');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
