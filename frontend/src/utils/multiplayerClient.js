/*
 * Multiplayer WebSocket Client
 * Real-time game synchronization and chat
 */

class MultiplayerClient {
  constructor(onGameStateChange, onMessageReceived, onPlayerJoined, onPlayerLeft) {
    this.ws = null;
    this.connected = false;
    this.gameId = null;
    this.playerId = null;
    this.playerColor = null; // 'white' or 'black'
    this.onGameStateChange = onGameStateChange;
    this.onMessageReceived = onMessageReceived;
    this.onPlayerJoined = onPlayerJoined;
    this.onPlayerLeft = onPlayerLeft;
  }

  connect(serverUrl = 'ws://localhost:3001') {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(serverUrl);

        this.ws.onopen = () => {
          this.connected = true;
          console.log('Connected to multiplayer server');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (err) {
            console.error('Failed to parse message:', err);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          this.connected = false;
          console.log('Disconnected from multiplayer server');
        };
      } catch (err) {
        reject(err);
      }
    });
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
        this.playerColor = payload.opponentColor === 'white' ? 'black' : 'white';
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
