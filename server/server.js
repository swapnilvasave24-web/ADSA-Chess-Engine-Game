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
const PORT = process.env.PORT || 3001;

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

const ALLOWED_PIECES = new Set(['', 'P', 'N', 'B', 'R', 'Q', 'K', 'p', 'n', 'b', 'r', 'q', 'k']);
const ALLOWED_GAME_STATUS = new Set(['ongoing', 'checkmate', 'stalemate', 'draw']);

const normalizeAndValidateMove = (rawMove) => {
  if (typeof rawMove !== 'string') {
    return { ok: false, error: 'Move must be a string' };
  }

  const move = rawMove.trim().toLowerCase();
  if (!/^[a-h][1-8][a-h][1-8][nbrq]?$/.test(move)) {
    return { ok: false, error: 'Invalid move format' };
  }

  const fromRank = move[1];
  const toRank = move[3];
  const hasPromotionSuffix = move.length === 5;
  const isPromotionTravel =
    (fromRank === '7' && toRank === '8') ||
    (fromRank === '2' && toRank === '1');

  if (hasPromotionSuffix && !isPromotionTravel) {
    return { ok: false, error: 'Invalid promotion move' };
  }

  if (!hasPromotionSuffix && isPromotionTravel) {
    return { ok: false, error: 'Promotion piece is required' };
  }

  return { ok: true, move };
};

const normalizeAndValidateGameState = (rawState, context) => {
  if (!rawState || typeof rawState !== 'object') {
    return { ok: false, error: `${context}: state payload is not an object` };
  }

  const state = { ...rawState };

  if (!Array.isArray(state.board) || state.board.length !== 8) {
    return { ok: false, error: `${context}: board must be an 8x8 array` };
  }

  let whiteKingCount = 0;
  let blackKingCount = 0;
  let whitePieceCount = 0;
  let blackPieceCount = 0;

  const normalizedBoard = state.board.map((row, rowIndex) => {
    if (!Array.isArray(row) || row.length !== 8) {
      throw new Error(`${context}: board row ${rowIndex} is not length 8`);
    }

    return row.map((cell, colIndex) => {
      const value = cell == null ? '' : String(cell).trim();

      if (!ALLOWED_PIECES.has(value)) {
        throw new Error(`${context}: invalid piece '${value}' at [${rowIndex},${colIndex}]`);
      }

      if (value === 'K') whiteKingCount++;
      if (value === 'k') blackKingCount++;

      if (value >= 'A' && value <= 'Z') whitePieceCount++;
      if (value >= 'a' && value <= 'z') blackPieceCount++;

      if ((rowIndex === 0 || rowIndex === 7) && (value === 'P' || value === 'p')) {
        throw new Error(`${context}: pawn on promotion rank at [${rowIndex},${colIndex}]`);
      }

      return value;
    });
  });

  state.board = normalizedBoard;

  if (whiteKingCount !== 1 || blackKingCount !== 1) {
    return {
      ok: false,
      error: `${context}: invalid king count (white=${whiteKingCount}, black=${blackKingCount})`,
    };
  }

  if (whitePieceCount > 16 || blackPieceCount > 16) {
    return {
      ok: false,
      error: `${context}: too many pieces (white=${whitePieceCount}, black=${blackPieceCount})`,
    };
  }

  if (typeof state.sideToMove === 'string') {
    const normalized = state.sideToMove.trim().toLowerCase();
    if (normalized === 'w') state.sideToMove = 'white';
    else if (normalized === 'b') state.sideToMove = 'black';
    else state.sideToMove = normalized;
  }

  if (state.sideToMove !== 'white' && state.sideToMove !== 'black') {
    return { ok: false, error: `${context}: invalid sideToMove '${state.sideToMove}'` };
  }

  if (state.gameStatus != null && !ALLOWED_GAME_STATUS.has(state.gameStatus)) {
    state.gameStatus = 'ongoing';
  }

  if (state.inCheck != null) {
    state.inCheck = Boolean(state.inCheck);
  }

  if (state.moveHistory != null && !Array.isArray(state.moveHistory)) {
    return { ok: false, error: `${context}: moveHistory must be an array` };
  }

  if (Array.isArray(state.moveHistory)) {
    state.moveHistory = state.moveHistory
      .filter((entry) => typeof entry === 'string')
      .map((entry) => entry.trim().toLowerCase());
  }

  return { ok: true, state };
};

const enforceValidState = (rawState, context) => {
  try {
    const checked = normalizeAndValidateGameState(rawState, context);
    if (!checked.ok) {
      throw new Error(checked.error);
    }
    return checked.state;
  } catch (err) {
    throw new Error(`State integrity check failed: ${err.message}`);
  }
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'CheckmateAI server running' });
});

app.post('/api/game/new', async (req, res) => {
  try {
    const { fen } = req.body || {};
    const result = await engine.initGame(fen);
    const safeState = enforceValidState(result, 'api/game/new');
    res.json(safeState);
  } catch (err) {
    console.error('Error initializing game:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.post('/api/game/move', async (req, res) => {
  try {
    const { move } = req.body;
    if (!move) return res.status(400).json({ status: 'error', message: 'Move required' });

    const validated = normalizeAndValidateMove(move);
    if (!validated.ok) {
      return res.status(400).json({ status: 'error', message: validated.error });
    }

    const result = await engine.makeMove(validated.move);
    const safeState = enforceValidState(result, 'api/game/move');
    res.json(safeState);
  } catch (err) {
    console.error('Error making move:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.post('/api/game/ai-move', async (req, res) => {
  try {
    const depth = req.body?.depth || 4;
    const result = await engine.getAIMove(depth);
    const safeState = enforceValidState(result, 'api/game/ai-move');
    res.json(safeState);
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
    const safeState = enforceValidState(result, 'api/game/undo');
    res.json(safeState);
  } catch (err) {
    console.error('Error undoing move:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.get('/api/game/state', async (req, res) => {
  try {
    const result = await engine.getState();
    const safeState = enforceValidState(result, 'api/game/state');
    res.json(safeState);
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
        const initState = enforceValidState(await roomEngine.initGame(), 'ws/create_game');

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
            playerColor: 'black',
            opponentColor: 'white',
            opponentName: host?.playerName || 'Host',
            state: room.state,
          },
        });

        broadcast(room, {
          type: 'player_joined',
          payload: { playerName, playerId, playerColor: 'black' },
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

        const validated = normalizeAndValidateMove(message.move);
        if (!validated.ok) {
          sendJson(ws, { type: 'error', payload: { error: validated.error } });
          return;
        }

        const result = enforceValidState(await room.engine.makeMove(validated.move), 'ws/make_move');
        if (result.status !== 'ok') {
          sendJson(ws, { type: 'error', payload: { error: result.message || 'Illegal move' } });
          return;
        }

        room.state = result;
        broadcast(room, {
          type: 'move',
          payload: { move: validated.move, state: result },
        });
        return;
      }

      if (message.type === 'get_legal_moves') {
        const room = rooms.get((message.gameId || '').toUpperCase());
        if (!room) {
          sendJson(ws, { type: 'error', payload: { error: 'Game not found', requestId: message.requestId || null } });
          return;
        }

        const player = getPlayer(room, message.playerId);
        if (!player) {
          sendJson(ws, { type: 'error', payload: { error: 'Player not in game', requestId: message.requestId || null } });
          return;
        }

        const square = typeof message.square === 'string' ? message.square : '';
        const result = await room.engine.getLegalMoves(square);
        if (result.status !== 'ok') {
          sendJson(ws, {
            type: 'error',
            payload: { error: result.message || 'Failed to get legal moves', requestId: message.requestId || null },
          });
          return;
        }

        sendJson(ws, {
          type: 'legal_moves',
          payload: {
            requestId: message.requestId || null,
            square,
            moves: result.moves || [],
          },
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
