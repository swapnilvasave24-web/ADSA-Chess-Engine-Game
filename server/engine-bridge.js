/*
 * CheckmateAI - Engine Bridge
 * Communicates with the C++ chess engine via stdin/stdout JSON protocol.
 */

const { spawn } = require('child_process');
const path = require('path');

class EngineBridge {
  constructor() {
    this.engine = null;
    this.responseCallback = null;
    this.buffer = '';
  }

  /**
   * Start the C++ engine process
   */
  start() {
    const enginePath = path.join(__dirname, '..', 'engine', 'build', 'checkmate_engine');
    
    this.engine = spawn(enginePath, [], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.engine.stdout.on('data', (data) => {
      this.buffer += data.toString();
      
      // Process complete lines
      const lines = this.buffer.split('\n');
      this.buffer = lines.pop(); // Keep incomplete line in buffer
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && this.responseCallback) {
          try {
            const response = JSON.parse(trimmed);
            const cb = this.responseCallback;
            this.responseCallback = null;
            cb(null, response);
          } catch (err) {
            console.error('Failed to parse engine response:', trimmed);
          }
        }
      }
    });

    this.engine.stderr.on('data', (data) => {
      console.error('Engine stderr:', data.toString());
    });

    this.engine.on('close', (code) => {
      console.log(`Engine process exited with code ${code}`);
      this.engine = null;
    });

    this.engine.on('error', (err) => {
      console.error('Engine process error:', err);
      if (this.responseCallback) {
        const cb = this.responseCallback;
        this.responseCallback = null;
        cb(err, null);
      }
    });
  }

  /**
   * Send a command to the engine and wait for response
   */
  sendCommand(command) {
    return new Promise((resolve, reject) => {
      if (!this.engine) {
        reject(new Error('Engine not started'));
        return;
      }

      this.responseCallback = (err, response) => {
        if (err) reject(err);
        else resolve(response);
      };

      const json = JSON.stringify(command);
      this.engine.stdin.write(json + '\n');
    });
  }

  /**
   * Initialize a new game
   */
  async initGame(fen = null) {
    const cmd = { command: 'init' };
    if (fen) cmd.fen = fen;
    return this.sendCommand(cmd);
  }

  /**
   * Make a player move
   */
  async makeMove(moveStr) {
    return this.sendCommand({ command: 'move', move: moveStr });
  }

  /**
   * Get the AI's best move
   */
  async getAIMove(depth = 4) {
    return this.sendCommand({ command: 'get_ai_move', depth: depth });
  }

  /**
   * Get a hint move without modifying board state
   */
  async getHintMove(depth = 4) {
    return this.sendCommand({ command: 'get_hint_move', depth: depth });
  }

  /**
   * Get legal moves for a square
   */
  async getLegalMoves(square = '') {
    const cmd = { command: 'get_legal_moves' };
    if (square) cmd.square = square;
    return this.sendCommand(cmd);
  }

  /**
   * Undo moves
   */
  async undo(count = 2) {
    return this.sendCommand({ command: 'undo', count: count });
  }

  /**
   * Get current game state
   */
  async getState() {
    return this.sendCommand({ command: 'get_state' });
  }

  /**
   * Stop the engine
   */
  stop() {
    if (this.engine) {
      this.engine.stdin.write(JSON.stringify({ command: 'quit' }) + '\n');
      this.engine.kill();
      this.engine = null;
    }
  }
}

module.exports = EngineBridge;
