/*
 * CheckmateAI - Express.js + WebSocket API Server
 * REST API bridge for AI mode plus multiplayer realtime sync.
 */

const http = require('http');
const { randomUUID } = require('crypto');
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const EngineBridge = require('./engine-bridge');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Single-player engine instance (existing API)
const engine = new EngineBridge();
engine.start();

// Multiplayer state
const rooms = new Map(); // gameId -> { engine, state, players: Map(playerId -> player) }
const socketLookup = new Map(); // ws -> { gameId, playerId }

const makeGameId = () => Math.random().toString(36).slice(2, 8).toUpperCase();

const sendJson = (ws, message) => {
  if (ws && ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(message));
  }
};

const broadcast = (room, message) => {
  for (const player of room.players.values()) {
    sendJson(player.ws, message);
  }
};

const getPlayer = (room, playerId) => room?.players.get(playerId);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'CheckmateAI server running' });
});

app.post('/api/game/new', async (req, res) => {
  try {
    const { fen } = req.body || {};
    const result = await engine.initGame(fen);
    res.json(result);
  } catch (err) {
    console.error('Error initializing game:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.post('/api/game/move', async (req, res) => {
  try {
    const { move } = req.body;
    if (!move) return res.status(400).json({ status: 'error', message: 'Move required' });
    const result = await engine.makeMove(move);
    res.json(result);
  } catch (err) {
    console.error('Error making move:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.post('/api/game/ai-move', async (req, res) => {
  try {
    const depth = req.body?.depth || 4;
    const result = await engine.getAIMove(depth);
    res.json(result);
  } catch (err) {
    console.error('Error getting AI move:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.post('/api/game/hint', async (req, res) => {
  try {
    const depth = req.body?.depth || 4;
    const result = await engine.getHintMove(depth);
    res.json(result);
  } catch (err) {
    console.error('Error getting hint move:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.get('/api/game/legal-moves', async (req, res) => {
  try {
    const { square } = req.query;
    const result = await engine.getLegalMoves(square || '');
    res.json(result);
  } catch (err) {
    console.error('Error getting legal moves:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.post('/api/game/undo', async (req, res) => {
  try {
    const count = req.body?.count || 2;
    const result = await engine.undo(count);
    res.json(result);
  } catch (err) {
    console.error('Error undoing move:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.get('/api/game/state', async (req, res) => {
  try {
    const result = await engine.getState();
    res.json(result);
  } catch (err) {
    console.error('Error getting state:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.on('message', async (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      sendJson(ws, { type: 'error', payload: { error: 'Invalid JSON' } });
      return;
    }

    try {
      if (message.type === 'create_game') {
        const gameId = makeGameId();
        const roomEngine = new EngineBridge();
        roomEngine.start();
        const initState = await roomEngine.initGame();

        const playerId = randomUUID();
        const playerName = message.playerName || 'Host';

        rooms.set(gameId, {
          engine: roomEngine,
          state: initState,
          players: new Map([[playerId, { ws, playerId, playerName, color: 'white' }]]),
        });

        socketLookup.set(ws, { gameId, playerId });

        sendJson(ws, {
          type: 'game_created',
          payload: { gameId, playerId, playerColor: 'white', state: initState },
        });
        return;
      }

      if (message.type === 'join_game') {
        const gameId = (message.gameId || '').toUpperCase();
        const room = rooms.get(gameId);
        if (!room) {
          sendJson(ws, { type: 'error', payload: { error: 'Game not found' } });
          return;
        }

        if (room.players.size >= 2) {
          sendJson(ws, { type: 'error', payload: { error: 'Game is full' } });
          return;
        }

        const playerId = randomUUID();
        const playerName = message.playerName || 'Guest';
        room.players.set(playerId, { ws, playerId, playerName, color: 'black' });
        socketLookup.set(ws, { gameId, playerId });

        const host = Array.from(room.players.values()).find((p) => p.color === 'white');

        sendJson(ws, {
          type: 'game_joined',
          payload: {
            gameId,
            playerId,
            opponentColor: 'white',
            opponentName: host?.playerName || 'Host',
            state: room.state,
          },
        });

        broadcast(room, {
          type: 'player_joined',
          payload: { playerName },
        });
        return;
      }

      if (message.type === 'make_move') {
        const room = rooms.get((message.gameId || '').toUpperCase());
        if (!room) {
          sendJson(ws, { type: 'error', payload: { error: 'Game not found' } });
          return;
        }

        const player = getPlayer(room, message.playerId);
        if (!player) {
          sendJson(ws, { type: 'error', payload: { error: 'Player not in game' } });
          return;
        }

        if (room.state.sideToMove !== player.color) {
          sendJson(ws, { type: 'error', payload: { error: 'Not your turn' } });
          return;
        }

        const result = await room.engine.makeMove(message.move);
        if (result.status !== 'ok') {
          sendJson(ws, { type: 'error', payload: { error: result.message || 'Illegal move' } });
          return;
        }

        room.state = result;
        broadcast(room, {
          type: 'move',
          payload: { move: message.move, state: result },
        });
        return;
      }

      if (message.type === 'chat') {
        const room = rooms.get((message.gameId || '').toUpperCase());
        if (!room) return;
        const player = getPlayer(room, message.playerId);
        if (!player) return;

        broadcast(room, {
          type: 'chat',
          payload: {
            playerId: player.playerId,
            playerName: player.playerName,
            text: message.text || '',
            timestamp: Date.now(),
          },
        });
        return;
      }

      if (message.type === 'resign') {
        const room = rooms.get((message.gameId || '').toUpperCase());
        if (!room) return;
        const player = getPlayer(room, message.playerId);
        if (!player) return;

        broadcast(room, {
          type: 'chat',
          payload: {
            playerId: 'system',
            playerName: 'System',
            text: `${player.playerName} resigned.`,
            timestamp: Date.now(),
          },
        });
        return;
      }

      sendJson(ws, { type: 'error', payload: { error: 'Unknown message type' } });
    } catch (err) {
      console.error('WebSocket command failed:', err);
      sendJson(ws, { type: 'error', payload: { error: err.message } });
    }
  });

  ws.on('close', () => {
    const playerInfo = socketLookup.get(ws);
    if (!playerInfo) return;

    const room = rooms.get(playerInfo.gameId);
    if (!room) return;

    const leaving = room.players.get(playerInfo.playerId);
    room.players.delete(playerInfo.playerId);
    socketLookup.delete(ws);

    if (leaving) {
      broadcast(room, {
        type: 'player_left',
        payload: { playerName: leaving.playerName },
      });
    }

    if (room.players.size === 0) {
      room.engine.stop();
      rooms.delete(playerInfo.gameId);
    }
  });
});

const shutdown = () => {
  engine.stop();
  for (const room of rooms.values()) {
    room.engine.stop();
  }
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

server.listen(PORT, () => {
  console.log(`CheckmateAI server running on http://localhost:${PORT}`);
});
