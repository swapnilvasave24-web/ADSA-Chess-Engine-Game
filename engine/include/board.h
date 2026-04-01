/*
 * CheckmateAI - Advanced Chess Engine using DSA
 * board.h - Board representation
 *
 * DSA Concepts: 2D Array, Stack (for undo history / backtracking)
 * The board is represented as an 8x8 array of Pieces.
 * A stack of BoardState objects enables efficient undo (backtracking).
 */

#ifndef BOARD_H
#define BOARD_H

#include "move.h"
#include <cstdint>
#include <stack>
#include <string>
#include <vector>

class Board {
public:
  // 8x8 board array (DSA: 2D Array)
  Piece squares[8][8];

  // Game state
  Color sideToMove;
  bool castlingRights[2][2]; // [WHITE/BLACK][KINGSIDE/QUEENSIDE]
  int enPassantCol;          // -1 if no en passant
  int halfMoveClock;
  int fullMoveNumber;

  // King positions for quick lookup
  int kingRow[2], kingCol[2]; // [WHITE/BLACK]

  // Zobrist hash of current position
  uint64_t zobristHash;

  // Stack for undo - DSA: Stack (Backtracking)
  std::stack<BoardState> stateHistory;
  std::vector<Move> moveHistory;

  // Constructor - sets up initial position
  Board();

  // Initialize from FEN string
  void setFromFEN(const std::string &fen);

  // Get FEN string of current position
  std::string toFEN() const;

  // Make a move on the board (modifies state)
  void makeMove(const Move &move);

  // Undo the last move (DSA: Backtracking using stack)
  void undoMove(const Move &move);

  // Check if a square is attacked by a given color
  bool isSquareAttacked(int row, int col, Color byColor) const;

  // Check if current side is in check
  bool isInCheck() const;

  // Check if a move is legal (doesn't leave king in check)
  bool isMoveLegal(const Move &move);

  // Reset to initial position
  void reset();

  // Get piece at position
  Piece getPiece(int row, int col) const;

  // Check bounds
  static bool isValid(int row, int col);

  // Print board (for debugging)
  void print() const;

  // Get all pieces of a color
  std::vector<std::pair<int, int>> getPiecePositions(Color color) const;

  // Check for game-ending conditions
  bool isCheckmate();
  bool isStalemate();
  bool isDraw(); // 50-move rule, insufficient material

  // Convert board to JSON-friendly format
  std::string toJSON() const;
};

#endif // BOARD_H
