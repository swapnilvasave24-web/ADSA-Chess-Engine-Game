/*
 * CheckmateAI - Advanced Chess Engine using DSA
 * main.cpp - JSON stdin/stdout Interface
 *
 * This is the communication layer between the C++ engine and the
 * Node.js API bridge. It reads JSON commands from stdin and writes
 * JSON responses to stdout.
 *
 * Supported commands:
 *   - init:           Initialize a new game
 *   - move:           Make a player move
 *   - get_ai_move:    Get the engine's best move
 *   - get_hint_move:  Get the engine's suggested move without applying it
 *   - get_legal_moves: Get legal moves for a square or all squares
 *   - undo:           Undo the last move
 *   - get_state:      Get current board state
 */

#include "board.h"
#include "evaluation.h"
#include "minimax_engine.h"
#include "move.h"
#include "move_generator.h"
#include "utils.h"
#include <iostream>
#include <string>

// Global game state
Board gameBoard;
MinimaxEngine engine;
MoveGenerator moveGen;
EvaluationFunction evaluator;

/*
 * Handle "init" command - start a new game
 */
std::string handleInit(const std::string &json) {
  std::string fen = Utils::extractJsonString(json, "fen");

  if (!fen.empty()) {
    gameBoard.setFromFEN(fen);
  } else {
    gameBoard.reset();
  }
  engine.newGame();

  return Utils::jsonObject({
      Utils::jsonString("status", "ok"),
      Utils::jsonString("message", "Game initialized"),
      gameBoard.toJSON().substr(1, gameBoard.toJSON().size() -
                                       2) // merge board fields
  });
}

/*
 * Handle "move" command - make a player move
 */
std::string handleMove(const std::string &json) {
  std::string moveStr = Utils::extractJsonString(json, "move");

  if (moveStr.empty()) {
    return Utils::jsonObject(
        {Utils::jsonString("status", "error"),
         Utils::jsonString("message", "No move provided")});
  }

  Move parsedMove = Move::fromAlgebraic(moveStr);

  // Find the matching legal move (to get proper flags)
  std::vector<Move> legalMoves = moveGen.generateAllMoves(gameBoard);
  bool found = false;

  for (auto &m : legalMoves) {
    if (m.fromRow == parsedMove.fromRow && m.fromCol == parsedMove.fromCol &&
        m.toRow == parsedMove.toRow && m.toCol == parsedMove.toCol) {
      // Handle promotion flag
      if (parsedMove.flag >= PROMOTE_KNIGHT &&
          parsedMove.flag <= PROMOTE_QUEEN) {
        if (m.flag == parsedMove.flag) {
          gameBoard.makeMove(m);
          found = true;
          break;
        }
      } else if (m.flag < PROMOTE_KNIGHT || m.flag > PROMOTE_QUEEN) {
        gameBoard.makeMove(m);
        found = true;
        break;
      }
    }
  }

  if (!found) {
    return Utils::jsonObject(
        {Utils::jsonString("status", "error"),
         Utils::jsonString("message", "Illegal move: " + moveStr)});
  }

  // Check game-ending conditions
  std::vector<Move> nextMoves = moveGen.generateAllMoves(gameBoard);
  std::string gameStatus = "ongoing";
  if (nextMoves.empty()) {
    gameStatus = gameBoard.isInCheck() ? "checkmate" : "stalemate";
  } else if (gameBoard.isDraw()) {
    gameStatus = "draw";
  }

  int eval = evaluator.evaluate(gameBoard);
  // Convert to white's perspective for display
  if (gameBoard.sideToMove == BLACK)
    eval = -eval;

  std::string stateJson = gameBoard.toJSON();

  return Utils::jsonObject({Utils::jsonString("status", "ok"),
                            Utils::jsonString("gameStatus", gameStatus),
                            Utils::jsonInt("evaluation", eval),
                            stateJson.substr(1, stateJson.size() - 2)});
}

/*
 * Handle "get_ai_move" command - compute and make the engine's best move
 */
std::string handleGetAIMove(const std::string &json) {
  int depth = Utils::extractJsonInt(json, "depth");
  if (depth <= 0 || depth > 10)
    depth = 4; // Default depth

  // Find best move using Minimax + Alpha-Beta (DSA: our core algorithms)
  SearchResult result = engine.findBestMove(gameBoard, depth);

  if (result.bestMove.toAlgebraic() == "a1a1") {
    // No valid move found
    std::string gameStatus = gameBoard.isInCheck() ? "checkmate" : "stalemate";
    return Utils::jsonObject(
        {Utils::jsonString("status", "ok"),
         Utils::jsonString("gameStatus", gameStatus),
         Utils::jsonString("aiMove", ""),
         gameBoard.toJSON().substr(1, gameBoard.toJSON().size() - 2)});
  }

  // Make the AI's move
  gameBoard.makeMove(result.bestMove);

  // Check game status after AI move
  std::vector<Move> nextMoves = moveGen.generateAllMoves(gameBoard);
  std::string gameStatus = "ongoing";
  if (nextMoves.empty()) {
    gameStatus = gameBoard.isInCheck() ? "checkmate" : "stalemate";
  } else if (gameBoard.isDraw()) {
    gameStatus = "draw";
  }

  int eval = evaluator.evaluate(gameBoard);
  if (gameBoard.sideToMove == BLACK)
    eval = -eval;

  std::string stateJson = gameBoard.toJSON();

  // Include performance metrics (DSA concepts in action)
  return Utils::jsonObject(
      {Utils::jsonString("status", "ok"),
       Utils::jsonString("gameStatus", gameStatus),
       Utils::jsonString("aiMove", result.bestMove.toAlgebraic()),
       Utils::jsonInt("evaluation", eval),
       Utils::jsonInt("nodesExplored", result.nodesExplored),
       Utils::jsonInt("depthReached", result.depthReached),
       Utils::jsonDouble("timeMs", result.timeMs),
       Utils::jsonInt("ttHits", result.ttHits),
       Utils::jsonInt("cutoffs", result.cutoffs),
       Utils::jsonString("pv", result.pv),
       stateJson.substr(1, stateJson.size() - 2)});
}

/*
 * Handle "get_hint_move" command - compute best move without applying it
 */
std::string handleGetHintMove(const std::string &json) {
  int depth = Utils::extractJsonInt(json, "depth");
  if (depth <= 0 || depth > 10)
    depth = 4;

  SearchResult result = engine.findBestMove(gameBoard, depth);
  std::string hintMove = result.bestMove.toAlgebraic();
  if (hintMove == "a1a1")
    hintMove = "";

  return Utils::jsonObject({Utils::jsonString("status", "ok"),
                            Utils::jsonString("hintMove", hintMove),
                            Utils::jsonInt("nodesExplored", result.nodesExplored),
                            Utils::jsonInt("depthReached", result.depthReached),
                            Utils::jsonDouble("timeMs", result.timeMs),
                            Utils::jsonInt("ttHits", result.ttHits),
                            Utils::jsonInt("cutoffs", result.cutoffs),
                            Utils::jsonString("pv", result.pv)});
}

/*
 * Handle "get_legal_moves" command - get legal moves for a square
 */
std::string handleGetLegalMoves(const std::string &json) {
  std::string square = Utils::extractJsonString(json, "square");

  std::vector<Move> moves;

  if (!square.empty() && square.length() >= 2) {
    int col = square[0] - 'a';
    int row = square[1] - '1';
    moves = moveGen.generateMovesForSquare(gameBoard, row, col);
  } else {
    moves = moveGen.generateAllMoves(gameBoard);
  }

  std::vector<std::string> moveStrings;
  for (const auto &m : moves) {
    std::string moveObj = Utils::jsonObject(
        {Utils::jsonString("from", std::string(1, 'a' + m.fromCol) +
                                       std::string(1, '1' + m.fromRow)),
         Utils::jsonString("to", std::string(1, 'a' + m.toCol) +
                                     std::string(1, '1' + m.toRow)),
         Utils::jsonString("algebraic", m.toAlgebraic()),
         Utils::jsonBool("isCapture", !m.capturedPiece.isEmpty()),
         Utils::jsonBool("isCastle",
                         m.flag == KING_CASTLE || m.flag == QUEEN_CASTLE),
         Utils::jsonBool("isPromotion",
                         m.flag >= PROMOTE_KNIGHT && m.flag <= PROMOTE_QUEEN)});
    moveStrings.push_back(moveObj);
  }

  return Utils::jsonObject({Utils::jsonString("status", "ok"),
                            Utils::jsonInt("count", (int)moves.size()),
                            Utils::jsonArray("moves", moveStrings)});
}

/*
 * Handle "undo" command - undo the last move(s)
 */
std::string handleUndo(const std::string &json) {
  int count = Utils::extractJsonInt(json, "count");
  if (count <= 0)
    count = 1;

  int undone = 0;
  for (int i = 0; i < count && !gameBoard.moveHistory.empty(); i++) {
    Move lastMove = gameBoard.moveHistory.back();
    gameBoard.undoMove(lastMove);
    undone++;
  }

  int eval = evaluator.evaluate(gameBoard);
  if (gameBoard.sideToMove == BLACK)
    eval = -eval;

  std::string stateJson = gameBoard.toJSON();

  return Utils::jsonObject({Utils::jsonString("status", "ok"),
                            Utils::jsonInt("movesUndone", undone),
                            Utils::jsonInt("evaluation", eval),
                            stateJson.substr(1, stateJson.size() - 2)});
}

/*
 * Handle "get_state" command - return current board state
 */
std::string handleGetState(const std::string &json) {
  std::vector<Move> legalMoves = moveGen.generateAllMoves(gameBoard);
  std::string gameStatus = "ongoing";
  if (legalMoves.empty()) {
    gameStatus = gameBoard.isInCheck() ? "checkmate" : "stalemate";
  } else if (gameBoard.isDraw()) {
    gameStatus = "draw";
  }

  int eval = evaluator.evaluate(gameBoard);
  if (gameBoard.sideToMove == BLACK)
    eval = -eval;

  std::string stateJson = gameBoard.toJSON();

  return Utils::jsonObject(
      {Utils::jsonString("status", "ok"),
       Utils::jsonString("gameStatus", gameStatus),
       Utils::jsonInt("evaluation", eval),
       Utils::jsonInt("legalMoveCount", (int)legalMoves.size()),
       stateJson.substr(1, stateJson.size() - 2)});
}

/*
 * Main loop: Read JSON commands from stdin, process, and respond via stdout.
 * This is the bridge interface for the Node.js API server.
 */
int main() {
  // Disable sync for faster I/O
  std::ios_base::sync_with_stdio(false);
  std::cin.tie(nullptr);

  std::string line;
  while (std::getline(std::cin, line)) {
    line = Utils::trim(line);
    if (line.empty())
      continue;

    std::string command = Utils::extractJsonString(line, "command");
    std::string response;

    if (command == "init") {
      response = handleInit(line);
    } else if (command == "move") {
      response = handleMove(line);
    } else if (command == "get_ai_move") {
      response = handleGetAIMove(line);
    } else if (command == "get_hint_move") {
      response = handleGetHintMove(line);
    } else if (command == "get_legal_moves") {
      response = handleGetLegalMoves(line);
    } else if (command == "undo") {
      response = handleUndo(line);
    } else if (command == "get_state") {
      response = handleGetState(line);
    } else if (command == "quit") {
      break;
    } else {
      response = Utils::jsonObject(
          {Utils::jsonString("status", "error"),
           Utils::jsonString("message", "Unknown command: " + command)});
    }

    std::cout << response << std::endl;
    std::cout.flush();
  }

  return 0;
}
