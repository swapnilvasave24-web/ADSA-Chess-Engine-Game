/*
 * Multiplayer WebSocket Client
 * Real-time game synchronization and chat
 */

class MultiplayerClient {
  constructor(onGameStateChange, onMessageReceived, onPlayerJoined, onPlayerLeft, onError) {
    this.ws = null;
    this.connected = false;
    this.gameId = null;
    this.playerId = null;
    this.playerColor = null; // 'white' or 'black'
    this.onGameStateChange = onGameStateChange;
    this.onMessageReceived = onMessageReceived;
    this.onPlayerJoined = onPlayerJoined;
    this.onPlayerLeft = onPlayerLeft;
    this.onError = onError;
  }

  connect(serverUrl) {
    const candidates = this.getWebSocketCandidates(serverUrl);

    const connectOnce = (url) => new Promise((resolve, reject) => {
      let settled = false;
      const ws = new WebSocket(url);

      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        try { ws.close(); } catch {}
        reject(new Error(`WebSocket connection timed out for ${url}`));
      }, 7000);

      const cleanup = () => {
        clearTimeout(timeout);
        ws.onopen = null;
        ws.onerror = null;
      };

      ws.onopen = () => {
        if (settled) return;
        settled = true;
        cleanup();

        this.ws = ws;
        this.connected = true;
        console.log('Connected to multiplayer server');

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (err) {
            console.error('Failed to parse message:', err);
          }
        };

        this.ws.onclose = () => {
          this.connected = false;
          console.log('Disconnected from multiplayer server');
        };

        resolve();
      };

      ws.onerror = () => {
        if (settled) return;
        settled = true;
        cleanup();
        try { ws.close(); } catch {}
        reject(new Error(`WebSocket connection failed for ${url}`));
      };
    });

    return new Promise((resolve, reject) => {
      let attempt = 0;
      const maxAttempts = Math.max(6, candidates.length * 3);
      let lastError = null;

      const tryNext = () => {
        if (attempt >= maxAttempts) {
          reject(lastError || new Error('Unable to connect to multiplayer server'));
          return;
        }

        const url = candidates[attempt % candidates.length];
        attempt++;

        connectOnce(url)
          .then(resolve)
          .catch((err) => {
            lastError = err;
            setTimeout(tryNext, 1200);
          });
      };

      tryNext();
    });
  }

  getWebSocketCandidates(serverUrl) {
    const candidates = [];

    if (serverUrl) {
      candidates.push(serverUrl);
    }

    const isLocalHost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      import.meta.env.DEV;

    if (isLocalHost) {
      candidates.push('ws://localhost:3001', 'ws://127.0.0.1:3001');
    }

    const wsBase = import.meta.env.VITE_WS_URL;
    const apiBase = import.meta.env.VITE_API_BASE_URL;

    if (wsBase) {
      candidates.push(wsBase);
    }

    if (apiBase && /^https?:\/\//.test(apiBase)) {
      candidates.push(
        apiBase
          .replace(/^http:/, 'ws:')
          .replace(/^https:/, 'wss:')
          .replace(/\/api\/?$/, ''),
      );
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    candidates.push(`${protocol}//${window.location.host}`);

    return [...new Set(candidates.filter(Boolean))];
  }

  getDefaultWebSocketUrl() {
    const apiBase = import.meta.env.VITE_API_BASE_URL;
    const wsBase = import.meta.env.VITE_WS_URL;

    if (wsBase) {
      return wsBase;
    }

    if (apiBase && /^https?:\/\//.test(apiBase)) {
      return apiBase
        .replace(/^http:/, 'ws:')
        .replace(/^https:/, 'wss:')
        .replace(/\/api\/?$/, '');
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  }

  handleMessage(message) {
    const { type, payload } = message;

    switch (type) {
      case 'game_created':
        this.gameId = payload.gameId;
        this.playerId = payload.playerId;
        this.playerColor = payload.playerColor;
        this.onGameStateChange?.({
          type: 'game_created',
          gameId: this.gameId,
          playerColor: this.playerColor,
          state: payload.state,
        });
        break;

      case 'game_joined':
        this.gameId = payload.gameId;
        this.playerId = payload.playerId;
        this.playerColor = payload.playerColor || (payload.opponentColor === 'white' ? 'black' : 'white');
        this.onGameStateChange?.({
          type: 'game_joined',
          gameId: this.gameId,
          playerColor: this.playerColor,
          opponent: payload.opponentName,
          state: payload.state,
        });
        break;

      case 'move':
        this.onGameStateChange?.({
          type: 'move',
          move: payload.move,
          state: payload.state
        });
        break;

      case 'chat':
        this.onMessageReceived?.(payload);
        break;

      case 'player_joined':
        this.onPlayerJoined?.(payload);
        break;

      case 'player_left':
        this.onPlayerLeft?.(payload);
        break;

      case 'error':
        console.error('Server error:', payload.error);
        this.onError?.(payload.error || 'Multiplayer server error');
        break;

      default:
        console.warn('Unknown message type:', type);
    }
  }

  // Game Commands
  createGame(playerName) {
    this.send({
      type: 'create_game',
      playerName: playerName
    });
  }

  joinGame(gameId, playerName) {
    this.send({
      type: 'join_game',
      gameId: gameId,
      playerName: playerName
    });
  }

  makeMove(move) {
    this.send({
      type: 'make_move',
      gameId: this.gameId,
      playerId: this.playerId,
      move: move
    });
  }

  resign() {
    this.send({
      type: 'resign',
      gameId: this.gameId,
      playerId: this.playerId
    });
  }

  offerDraw() {
    this.send({
      type: 'offer_draw',
      gameId: this.gameId,
      playerId: this.playerId
    });
  }

  // Chat
  sendMessage(text) {
    this.send({
      type: 'chat',
      gameId: this.gameId,
      playerId: this.playerId,
      text: text
    });
  }

  // Helpers
  send(message) {
    if (this.connected && this.ws) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected');
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }

  isConnected() {
    return this.connected;
  }

  getGameId() {
    return this.gameId;
  }

  getPlayerColor() {
    return this.playerColor;
  }
}

export default MultiplayerClient;
