/*
 * CheckmateAI - Advanced Chess Engine using DSA
 * evaluation.h - Heuristic Evaluation Function
 *
 * DSA Concepts: Heuristic Evaluation, Weighted Scoring, Lookup Tables
 * Evaluates board positions using material counting and positional tables.
 * Piece-square tables provide O(1) positional bonus lookups.
 */

#ifndef EVALUATION_H
#define EVALUATION_H

#include "board.h"

class EvaluationFunction {
public:
  /*
   * Evaluate the board position from white's perspective.
   * Positive = white advantage, negative = black advantage.
   * Returns score in centipawns (1 pawn = 100).
   *
   * Components:
   *   1. Material evaluation (piece values)
   *   2. Positional evaluation (piece-square tables)
   *   3. Pawn structure (doubled, isolated, passed pawns)
   *   4. King safety
   *   5. Mobility (number of legal moves)
   */
  int evaluate(const Board &board);

  // Material value of pieces
  static int pieceValue(PieceType type);

  // Get total material for a color
  int getMaterial(const Board &board, Color color);

private:
  // Positional evaluation using piece-square tables (DSA: Lookup Tables)
  int evaluatePositional(const Board &board);

  // Pawn structure analysis
  int evaluatePawnStructure(const Board &board);

  // King safety evaluation
  int evaluateKingSafety(const Board &board);

  // Piece-square tables (positional bonuses per square)
  // DSA: 2D Lookup Tables for O(1) positional evaluation
  static const int PAWN_TABLE[8][8];
  static const int KNIGHT_TABLE[8][8];
  static const int BISHOP_TABLE[8][8];
  static const int ROOK_TABLE[8][8];
  static const int QUEEN_TABLE[8][8];
  static const int KING_MIDDLE_TABLE[8][8];
  static const int KING_END_TABLE[8][8];
};

#endif // EVALUATION_H
