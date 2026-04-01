/*
 * CheckmateAI - Advanced Chess Engine using DSA
 * move_generator.h - Legal Move Generation
 *
 * DSA Concepts: DFS (Depth-First Search), Recursion, Backtracking
 * Move generation explores all possible piece movements using DFS.
 * Each piece's move pattern is recursively explored along its direction
 * vectors. Sliding pieces (bishop, rook, queen) use recursive ray-casting.
 */

#ifndef MOVE_GENERATOR_H
#define MOVE_GENERATOR_H

#include "board.h"
#include "move.h"
#include <vector>

class MoveGenerator {
public:
  /*
   * Generate all legal moves for the current position.
   * Uses DFS to explore all piece movements.
   * Validates legality via backtracking (make/unmake move).
   */
  std::vector<Move> generateAllMoves(Board &board);

  /*
   * Generate all pseudo-legal moves (may leave king in check).
   * Faster than full legal move generation.
   */
  std::vector<Move> generatePseudoLegalMoves(const Board &board);

  /*
   * Generate moves for a specific square.
   * Used by the UI to highlight legal moves.
   */
  std::vector<Move> generateMovesForSquare(Board &board, int row, int col);

  /*
   * Generate only capture moves (for quiescence search).
   */
  std::vector<Move> generateCaptures(Board &board);

private:
  // Piece-specific move generators using DFS patterns
  void generatePawnMoves(const Board &board, int row, int col,
                         std::vector<Move> &moves);
  void generateKnightMoves(const Board &board, int row, int col,
                           std::vector<Move> &moves);

  /*
   * DSA: DFS with Recursion - Sliding pieces explore each direction
   * recursively until blocked. This is a depth-first exploration of
   * ray directions from the piece's position.
   */
  void generateBishopMoves(const Board &board, int row, int col,
                           std::vector<Move> &moves);
  void generateRookMoves(const Board &board, int row, int col,
                         std::vector<Move> &moves);
  void generateQueenMoves(const Board &board, int row, int col,
                          std::vector<Move> &moves);
  void generateKingMoves(const Board &board, int row, int col,
                         std::vector<Move> &moves);

  // Generate sliding moves along a direction (DFS ray-casting)
  void generateSlidingMoves(const Board &board, int row, int col, int dRow,
                            int dCol, std::vector<Move> &moves);

  // Generate castling moves
  void generateCastlingMoves(const Board &board, int row, int col,
                             std::vector<Move> &moves);

  // Add pawn promotion moves
  void addPromotionMoves(int fromRow, int fromCol, int toRow, int toCol,
                         Piece piece, Piece captured, std::vector<Move> &moves);
};

#endif // MOVE_GENERATOR_H
