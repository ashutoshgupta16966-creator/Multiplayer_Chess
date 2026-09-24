/**
 * RajaChess — Online Multiplayer Client Module
 * Manages Socket.io connection, room lobbies, and real-time game sync.
 */

(function () {
  'use strict';

  // Configurable Socket Server URL:
  // 1. Checks window.VITE_SOCKET_SERVER_URL or process.env
  // 2. Checks localStorage('VITE_SOCKET_SERVER_URL') or localStorage('SOCKET_SERVER_URL')
  // 3. Fallbacks: localhost:3001 if developing locally, or Render production server
  var SOCKET_SERVER_URL =
    (typeof window !== 'undefined' && window.VITE_SOCKET_SERVER_URL) ||
    (typeof window !== 'undefined' && window.SOCKET_SERVER_URL) ||
    (typeof localStorage !== 'undefined' && (localStorage.getItem('VITE_SOCKET_SERVER_URL') || localStorage.getItem('SOCKET_SERVER_URL'))) ||
    ((typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
      ? 'http://localhost:3001'
      : 'https://multiplayer-chess-backend.onrender.com');

  var socket = null;

  var Online = {
    roomCode: null,
    isHost: false,
    myColor: null, // 'red' | 'yellow' | 'green' | 'blue'
    myMobile: null,
    players: [],
    playerCount: 2,
    activeTab: 'create',

    /**
     * Connect or ensure connection to the Socket.io backend
     */
    connect: function (onConnected) {
      if (socket && socket.connected) {
        if (onConnected) onConnected();
        return;
      }

      if (typeof io === 'undefined') {
        console.error('[Online] Socket.io client library not loaded.');
        return;
      }

      if (!socket) {
        console.log('[Online] Connecting to:', SOCKET_SERVER_URL);
        socket = io(SOCKET_SERVER_URL, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 1500
        });

        // ── Socket Events ──
        socket.on('connect', function () {
          console.log('[Online] Connected with socket ID:', socket.id);
          Online.clearErrors();
          if (onConnected) onConnected();
        });

        socket.on('connect_error', function (err) {
          console.warn('[Online] Connection error:', err.message);
        });

        socket.on('player_joined', function (data) {
          console.log('[Online] player_joined:', data);
          Online.players = data.players || [];
          Online.renderLobbyRoster();
        });

        socket.on('player_reconnected', function (data) {
          console.log('[Online] player_reconnected:', data);
          Online.players = data.players || [];
          Online.renderLobbyRoster();
          Online.showBanner('✅ ' + (data.player ? data.player.name : 'Player') + ' reconnected!', 3500);
        });

        socket.on('room_ready', function (data) {
          console.log('[Online] room_ready:', data);
          Online.players = data.players || [];
          Online.renderLobbyRoster();
          var btn = document.getElementById('btn-host-start');
          if (btn && Online.isHost) {
            btn.disabled = false;
            var txt = btn.querySelector('.start-btn-text');
            if (txt) txt.textContent = 'Launch Match (All Ready!)';
          }
          var status = document.getElementById('create-lobby-status');
          if (status) {
            status.textContent = '🎉 All players connected! Host can start the match.';
            status.style.color = '#4ade80';
          }
        });

        socket.on('game_started', function (data) {
          console.log('[Online] game_started:', data);
          Online.handleGameStarted(data);
        });

        socket.on('move_made', function (data) {
          console.log('[Online] Remote move_made received:', data);
          if (typeof executeMove === 'function') {
            executeMove(data.fromRow, data.fromCol, data.toRow, data.toCol, true, data.promotion);
          }
          Online.updateTurnUI();
        });

        socket.on('player_disconnected', function (data) {
          console.log('[Online] player_disconnected:', data);
          Online.showBanner('⚠️ ' + (data.name || 'Opponent') + ' disconnected. Waiting to reconnect...', 0);
        });

        socket.on('error_message', function (data) {
          console.warn('[Online] Server error message:', data);
          var msg = data && (data.error || data.message) ? (data.error || data.message) : 'Server error occurred.';
          Online.showError(msg);
        });
      } else if (!socket.connected) {
        socket.connect();
      }
    },

    disconnect: function () {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
      Online.roomCode = null;
      Online.isHost = false;
      Online.myColor = null;
      Online.myMobile = null;
      Online.players = [];
    },

    /**
     * Show Online Screen & configure based on selectedPlayerCount
     */
    openLobby: function () {
      Online.playerCount = typeof selectedPlayerCount === 'number' ? selectedPlayerCount : 2;
      Online.switchTab('create');
      Online.renderInviteInputs();
      Online.clearErrors();

      // Reset Create Form state
      var createForm = document.getElementById('create-room-form');
      var createLobby = document.getElementById('create-room-lobby');
      if (createForm) createForm.classList.remove('hidden');
      if (createLobby) createLobby.classList.add('hidden');

      // Reset Join Form state
      var joinForm = document.getElementById('join-room-form');
      var joinLobby = document.getElementById('join-room-lobby');
      if (joinForm) joinForm.classList.remove('hidden');
      if (joinLobby) joinLobby.classList.add('hidden');

      var codeInput = document.getElementById('join-room-code');
      if (codeInput) codeInput.value = '';

      var countBadge = document.getElementById('online-badge-count');
      if (countBadge) {
        countBadge.textContent = '🎮 ' + Online.playerCount + ' Players Match';
      }

      showScreen('online-screen');
      Online.connect();
    },

    switchTab: function (tab) {
      Online.activeTab = tab;
      var tabCreate = document.getElementById('tab-create-room');
      var tabJoin = document.getElementById('tab-join-room');
      var panelCreate = document.getElementById('panel-create-room');
      var panelJoin = document.getElementById('panel-join-room');

      if (tab === 'create') {
        if (tabCreate) tabCreate.classList.add('active');
        if (tabJoin) tabJoin.classList.remove('active');
        if (panelCreate) panelCreate.classList.remove('hidden');
        if (panelJoin) panelJoin.classList.add('hidden');
      } else {
        if (tabJoin) tabJoin.classList.add('active');
        if (tabCreate) tabCreate.classList.remove('active');
        if (panelJoin) panelJoin.classList.remove('hidden');
        if (panelCreate) panelCreate.classList.add('hidden');
      }
      Online.clearErrors();
    },

    /**
     * Render friend inputs: (playerCount - 1)
     */
    renderInviteInputs: function () {
      var container = document.getElementById('create-friends-container');
      if (!container) return;
      container.innerHTML = '';

      var friendColors = [
        { name: 'Sapphire', seat: 'Top', dot: '#0F52BA', emoji: '🔵' },
        { name: 'Emerald', seat: 'Left', dot: '#50C878', emoji: '🟢' },
        { name: 'Ruby', seat: 'Right', dot: '#E0115F', emoji: '🔴' }
      ];

      var needed = Online.playerCount - 1;
      for (var i = 0; i < needed; i++) {
        var fc = friendColors[i];
        var grp = document.createElement('div');
        grp.className = 'form-group';
        grp.innerHTML =
          '<label for="friend-phone-' + i + '">' +
            '<span style="color:' + fc.dot + '">●</span> Friend ' + (i + 1) + ' Mobile (' + fc.name + ' ' + fc.emoji + ' — ' + fc.seat + '):' +
          '</label>' +
          '<input type="tel" id="friend-phone-' + i + '" class="online-input friend-phone-input" placeholder="Enter 10-digit mobile number" maxlength="10" />';
        container.appendChild(grp);
      }
    },

    /**
     * Submit Create Room form
     */
    createRoom: function () {
      Online.clearErrors();
      var hostPhoneInput = document.getElementById('create-host-phone');
      var hostMobile = hostPhoneInput ? hostPhoneInput.value.trim().replace(/\D/g, '') : '';

      if (!hostMobile || hostMobile.length < 10) {
        Online.showError('Please enter a valid 10-digit mobile number for yourself.');
        return;
      }

      var friendInputs = document.querySelectorAll('.friend-phone-input');
      var friendMobiles = [];
      for (var i = 0; i < friendInputs.length; i++) {
        var num = friendInputs[i].value.trim().replace(/\D/g, '');
        if (!num || num.length < 10) {
          Online.showError('Please enter a valid 10-digit mobile number for Friend ' + (i + 1) + '.');
          return;
        }
        friendMobiles.push(num);
      }

      // Check unique
      var allNums = [hostMobile].concat(friendMobiles);
      var set = new Set(allNums);
      if (set.size !== allNums.length) {
        Online.showError('Each player mobile number must be unique.');
        return;
      }

      var createBtn = document.getElementById('btn-create-room');
      if (createBtn) createBtn.disabled = true;

      Online.connect(function () {
        socket.emit('create_room', {
          playerCount: Online.playerCount,
          hostMobile: hostMobile,
          invitedMobiles: friendMobiles,
          boardStyle: boardStyleMode || 'ordinary'
        }, function (res) {
          if (createBtn) createBtn.disabled = false;
          if (!res || !res.success) {
            Online.showError(res && res.error ? res.error : 'Failed to create room.');
            return;
          }

          Online.roomCode = res.roomCode;
          Online.isHost = true;
          Online.myColor = 'red';
          Online.myMobile = hostMobile;
          Online.players = res.players || [res.player];

          // Show Lobby View
          var form = document.getElementById('create-room-form');
          var lobby = document.getElementById('create-room-lobby');
          if (form) form.classList.add('hidden');
          if (lobby) lobby.classList.remove('hidden');

          var codeDisplay = document.getElementById('display-room-code');
          if (codeDisplay) codeDisplay.textContent = res.roomCode;

          Online.renderLobbyRoster();
        });
      });
    },

    /**
     * Submit Join Room form
     */
    joinRoom: function () {
      Online.clearErrors();
      var codeInput = document.getElementById('join-room-code');
      var phoneInput = document.getElementById('join-player-phone');

      var roomCode = codeInput ? codeInput.value.trim().toUpperCase() : '';
      var mobile = phoneInput ? phoneInput.value.trim().replace(/\D/g, '') : '';

      if (!roomCode || roomCode.length < 6) {
        Online.showError('Please enter a valid 6-character room code.');
        return;
      }

      if (!mobile || mobile.length < 10) {
        Online.showError('Please enter your 10-digit mobile number.');
        return;
      }

      var joinBtn = document.getElementById('btn-join-room');
      if (joinBtn) joinBtn.disabled = true;

      Online.connect(function () {
        socket.emit('join_room', {
          roomCode: roomCode,
          mobile: mobile
        }, function (res) {
          if (joinBtn) joinBtn.disabled = false;
          if (!res || !res.success) {
            Online.showError(res && res.error ? res.error : 'Failed to join room.');
            return;
          }

          Online.roomCode = res.roomCode;
          Online.isHost = false;
          Online.myColor = res.player.color;
          Online.myMobile = mobile;
          Online.players = res.players || [];
          Online.playerCount = res.playerCount || 2;
          selectedPlayerCount = Online.playerCount;
          boardStyleMode = res.boardStyle || 'ordinary';

          // Switch to Join Lobby View
          var form = document.getElementById('join-room-form');
          var lobby = document.getElementById('join-room-lobby');
          if (form) form.classList.add('hidden');
          if (lobby) lobby.classList.remove('hidden');

          var badge = document.getElementById('joined-player-badge');
          if (badge) {
            badge.textContent = 'Joined as ' + res.player.name + ' (' + res.player.color.toUpperCase() + ')';
            badge.style.color = res.player.color === 'yellow' ? '#60a5fa' : (res.player.color === 'green' ? '#4ade80' : '#f87171');
          }

          var codeBox = document.getElementById('join-display-room-code');
          if (codeBox) codeBox.textContent = res.roomCode;

          Online.renderLobbyRoster();
        });
      });
    },

    /**
     * Start match (called by Host)
     */
    startMatch: function () {
      if (!Online.isHost || !Online.roomCode) return;
      var btn = document.getElementById('btn-host-start');
      if (btn) btn.disabled = true;

      socket.emit('start_game', { roomCode: Online.roomCode }, function (res) {
        if (!res || !res.success) {
          Online.showError(res && res.error ? res.error : 'Could not start match.');
          if (btn) btn.disabled = false;
        }
      });
    },

    /**
     * Handle game_started broadcast from server
     */
    handleGameStarted: function (data) {
      selectedMode = 'online';
      selectedPlayerCount = data.playerCount || Online.playerCount || 2;
      boardStyleMode = data.boardStyle || 'ordinary';

      if (typeof startGame === 'function') {
        startGame();
      }

      // In online mode, disable undo
      var undoBtn = document.getElementById('undo-btn');
      if (undoBtn) undoBtn.style.display = 'none';

      Online.updateTurnUI();
    },

    /**
     * Broadcast local move
     */
    sendMove: function (fromRow, fromCol, toRow, toCol, promotion) {
      if (!socket || !Online.roomCode) return;
      socket.emit('make_move', {
        roomCode: Online.roomCode,
        fromRow: fromRow,
        fromCol: fromCol,
        toRow: toRow,
        toCol: toCol,
        promotion: promotion || null
      });
    },

    /**
     * Render player cards in lobby roster
     */
    renderLobbyRoster: function () {
      var slotsContainer = Online.activeTab === 'create'
        ? document.getElementById('create-players-slots')
        : document.getElementById('join-players-slots');

      if (!slotsContainer) return;
      slotsContainer.innerHTML = '';

      var allSlots = [
        { id: 'red', name: 'Gold', dot: '#FFD700', role: 'Host' },
        { id: 'yellow', name: 'Sapphire', dot: '#0F52BA', role: 'Friend 1' },
        { id: 'green', name: 'Emerald', dot: '#50C878', role: 'Friend 2' },
        { id: 'blue', name: 'Ruby', dot: '#E0115F', role: 'Friend 3' }
      ].slice(0, Online.playerCount);

      allSlots.forEach(function (slot) {
        var joined = Online.players.find(function (p) { return p.color === slot.id; });
        var card = document.createElement('div');
        card.className = 'player-slot-card';

        var statusClass = joined ? 'joined' : 'waiting';
        var statusText = joined ? '✓ Joined' : 'Waiting...';
        var isMe = (joined && joined.color === Online.myColor) ? ' (You)' : '';

        card.innerHTML =
          '<div class="player-slot-info">' +
            '<span class="player-color-dot" style="background:' + slot.dot + '"></span>' +
            '<div>' +
              '<span class="player-slot-name">' + slot.name + isMe + '</span> ' +
              '<span class="player-slot-role">(' + slot.role + ')</span>' +
            '</div>' +
          '</div>' +
          '<span class="player-slot-status ' + statusClass + '">' + statusText + '</span>';

        slotsContainer.appendChild(card);
      });
    },

    /**
     * Update HUD turn text with online awareness
     */
    updateTurnUI: function () {
      if (selectedMode !== 'online' || !Online.myColor) return;
      var nameEl = document.getElementById('turn-name');
      if (!nameEl) return;

      var cp = typeof currentPlayer === 'function' ? currentPlayer() : null;
      if (!cp) return;

      if (cp.id === Online.myColor) {
        nameEl.textContent = cp.name + ' (Your Turn!)';
      } else {
        nameEl.textContent = cp.name + ' (Opponent turn)';
      }
    },

    copyCode: function () {
      if (!Online.roomCode) return;
      navigator.clipboard.writeText(Online.roomCode).then(function () {
        var textSpan = document.getElementById('copy-btn-text');
        var iconSpan = document.getElementById('copy-btn-icon');
        if (textSpan) textSpan.textContent = 'Copied!';
        if (iconSpan) iconSpan.textContent = '✅';
        setTimeout(function () {
          if (textSpan) textSpan.textContent = 'Copy Code';
          if (iconSpan) iconSpan.textContent = '📋';
        }, 2200);
      }).catch(function () {
        // Fallback for older browsers
        var dummy = document.createElement('input');
        dummy.value = Online.roomCode;
        document.body.appendChild(dummy);
        dummy.select();
        document.execCommand('copy');
        document.body.removeChild(dummy);
        var textSpan = document.getElementById('copy-btn-text');
        if (textSpan) textSpan.textContent = 'Copied!';
        setTimeout(function () {
          if (textSpan) textSpan.textContent = 'Copy Code';
        }, 2200);
      });
    },

    showError: function (msg) {
      var errEl = Online.activeTab === 'create'
        ? document.getElementById('create-error-msg')
        : document.getElementById('join-error-msg');
      if (errEl) {
        errEl.textContent = msg;
        errEl.classList.remove('hidden');
      } else {
        alert(msg);
      }
    },

    clearErrors: function () {
      var err1 = document.getElementById('create-error-msg');
      var err2 = document.getElementById('join-error-msg');
      if (err1) err1.classList.add('hidden');
      if (err2) err2.classList.add('hidden');
    },

    showBanner: function (msg, duration) {
      var banner = document.getElementById('online-status-banner');
      var text = document.getElementById('online-banner-text');
      if (!banner || !text) return;

      text.textContent = msg;
      banner.classList.remove('hidden');
      banner.setAttribute('aria-hidden', 'false');

      if (duration && duration > 0) {
        setTimeout(function () {
          banner.classList.add('hidden');
          banner.setAttribute('aria-hidden', 'true');
        }, duration);
      }
    }
  };

  // Expose to window for inline onclick handlers & script.js integration
  window.Online = Online;
  window.showOnlineLobbyScreen = Online.openLobby;
  window.switchOnlineTab = Online.switchTab;
  window.submitCreateRoom = Online.createRoom;
  window.submitJoinRoom = Online.joinRoom;
  window.submitStartOnlineGame = Online.startMatch;
  window.copyRoomCode = Online.copyCode;
})();
