/*
 * CheckmateAI - Advanced Chess Engine using DSA
 * evaluation.cpp - Heuristic Evaluation Function
 *
 * DSA Concepts Used:
 *   - Lookup Tables (Piece-Square Tables): O(1) positional evaluation
 *   - Weighted heuristic scoring
 *   - Array traversal for material and structure analysis
 */

#include "evaluation.h"
#include <cmath>

/*
 * Piece-Square Tables (PST)
 * DSA: 2D Lookup Tables for O(1) positional evaluation
 *
 * Each table assigns a bonus/penalty for a piece being on a
 * particular square. Values are from white's perspective.
 * For black, the table is mirrored vertically.
 */

// Pawn PST - encourages center control and advancement
const int EvaluationFunction::PAWN_TABLE[8][8] = {
    {0, 0, 0, 0, 0, 0, 0, 0},         {5, 10, 10, -20, -20, 10, 10, 5},
    {5, -5, -10, 0, 0, -10, -5, 5},   {0, 0, 0, 20, 20, 0, 0, 0},
    {5, 5, 10, 25, 25, 10, 5, 5},     {10, 10, 20, 30, 30, 20, 10, 10},
    {50, 50, 50, 50, 50, 50, 50, 50}, {0, 0, 0, 0, 0, 0, 0, 0}};

// Knight PST - encourages central positioning
const int EvaluationFunction::KNIGHT_TABLE[8][8] = {
    {-50, -40, -30, -30, -30, -30, -40, -50},
    {-40, -20, 0, 5, 5, 0, -20, -40},
    {-30, 5, 10, 15, 15, 10, 5, -30},
    {-30, 0, 15, 20, 20, 15, 0, -30},
    {-30, 5, 15, 20, 20, 15, 5, -30},
    {-30, 0, 10, 15, 15, 10, 0, -30},
    {-40, -20, 0, 0, 0, 0, -20, -40},
    {-50, -40, -30, -30, -30, -30, -40, -50}};

// Bishop PST - encourages long diagonals
const int EvaluationFunction::BISHOP_TABLE[8][8] = {
    {-20, -10, -10, -10, -10, -10, -10, -20},
    {-10, 5, 0, 0, 0, 0, 5, -10},
    {-10, 10, 10, 10, 10, 10, 10, -10},
    {-10, 0, 10, 10, 10, 10, 0, -10},
    {-10, 5, 5, 10, 10, 5, 5, -10},
    {-10, 0, 5, 10, 10, 5, 0, -10},
    {-10, 0, 0, 0, 0, 0, 0, -10},
    {-20, -10, -10, -10, -10, -10, -10, -20}};

// Rook PST - encourages 7th rank and open files
const int EvaluationFunction::ROOK_TABLE[8][8] = {
    {0, 0, 0, 5, 5, 0, 0, 0},       {-5, 0, 0, 0, 0, 0, 0, -5},
    {-5, 0, 0, 0, 0, 0, 0, -5},     {-5, 0, 0, 0, 0, 0, 0, -5},
    {-5, 0, 0, 0, 0, 0, 0, -5},     {-5, 0, 0, 0, 0, 0, 0, -5},
    {5, 10, 10, 10, 10, 10, 10, 5}, {0, 0, 0, 0, 0, 0, 0, 0}};

// Queen PST - discourages early queen development
const int EvaluationFunction::QUEEN_TABLE[8][8] = {
    {-20, -10, -10, -5, -5, -10, -10, -20},
    {-10, 0, 5, 0, 0, 0, 0, -10},
    {-10, 5, 5, 5, 5, 5, 0, -10},
    {0, 0, 5, 5, 5, 5, 0, -5},
    {-5, 0, 5, 5, 5, 5, 0, -5},
    {-10, 0, 5, 5, 5, 5, 0, -10},
    {-10, 0, 0, 0, 0, 0, 0, -10},
    {-20, -10, -10, -5, -5, -10, -10, -20}};

// King middle game - encourages castled king, discourages center
const int EvaluationFunction::KING_MIDDLE_TABLE[8][8] = {
    {20, 30, 10, 0, 0, 10, 30, 20},
    {20, 20, 0, 0, 0, 0, 20, 20},
    {-10, -20, -20, -20, -20, -20, -20, -10},
    {-20, -30, -30, -40, -40, -30, -30, -20},
    {-30, -40, -40, -50, -50, -40, -40, -30},
    {-30, -40, -40, -50, -50, -40, -40, -30},
    {-30, -40, -40, -50, -50, -40, -40, -30},
    {-30, -40, -40, -50, -50, -40, -40, -30}};

// King endgame - encourages central king
const int EvaluationFunction::KING_END_TABLE[8][8] = {
    {-50, -30, -30, -30, -30, -30, -30, -50},
    {-30, -30, 0, 0, 0, 0, -30, -30},
    {-30, -10, 20, 30, 30, 20, -10, -30},
    {-30, -10, 30, 40, 40, 30, -10, -30},
    {-30, -10, 30, 40, 40, 30, -10, -30},
    {-30, -10, 20, 30, 30, 20, -10, -30},
    {-30, -20, -10, 0, 0, -10, -20, -30},
    {-50, -40, -30, -20, -20, -30, -40, -50}};

/*
 * Material values in centipawns
 * Based on standard piece valuation with minor adjustments
 */
int EvaluationFunction::pieceValue(PieceType type) {
  switch (type) {
  case PAWN:
    return 100;
  case KNIGHT:
    return 320;
  case BISHOP:
    return 330;
  case ROOK:
    return 500;
  case QUEEN:
    return 900;
  case KING:
    return 20000;
  default:
    return 0;
  }
}

int EvaluationFunction::getMaterial(const Board &board, Color color) {
  int material = 0;
  for (int r = 0; r < 8; r++)
    for (int c = 0; c < 8; c++)
      if (board.squares[r][c].color == color)
        material += pieceValue(board.squares[r][c].type);
  return material;
}

/*
 * Main evaluation function
 *
 * DSA: Heuristic Evaluation with weighted components
 * Combines multiple evaluation features with appropriate weights.
 * Returns score in centipawns from white's perspective.
 */
int EvaluationFunction::evaluate(const Board &board) {
  int score = 0;

  // 1. Material evaluation (most important factor)
  score += getMaterial(board, WHITE) - getMaterial(board, BLACK);

  // 2. Positional evaluation using piece-square tables
  score += evaluatePositional(board);

  // 3. Pawn structure
  score += evaluatePawnStructure(board);

  // 4. King safety
  score += evaluateKingSafety(board);

  // Return from perspective of side to move
  return (board.sideToMove == WHITE) ? score : -score;
}

/*
 * Positional evaluation using Piece-Square Tables
 * DSA: O(1) lookup per piece using 2D array tables
 */
int EvaluationFunction::evaluatePositional(const Board &board) {
  int score = 0;

  // Determine game phase for king table selection
  int totalMaterial = getMaterial(board, WHITE) + getMaterial(board, BLACK);
  bool isEndgame = (totalMaterial < 3200); // Roughly when queens are off

  for (int row = 0; row < 8; row++) {
    for (int col = 0; col < 8; col++) {
      const Piece &piece = board.squares[row][col];
      if (piece.isEmpty())
        continue;

      // For black, mirror the row (table is from white's perspective)
      int tableRow = (piece.color == WHITE) ? row : (7 - row);
      int bonus = 0;

      switch (piece.type) {
      case PAWN:
        bonus = PAWN_TABLE[tableRow][col];
        break;
      case KNIGHT:
        bonus = KNIGHT_TABLE[tableRow][col];
        break;
      case BISHOP:
        bonus = BISHOP_TABLE[tableRow][col];
        break;
      case ROOK:
        bonus = ROOK_TABLE[tableRow][col];
        break;
      case QUEEN:
        bonus = QUEEN_TABLE[tableRow][col];
        break;
      case KING:
        bonus = isEndgame ? KING_END_TABLE[tableRow][col]
                          : KING_MIDDLE_TABLE[tableRow][col];
        break;
      default:
        break;
      }

      score += (piece.color == WHITE) ? bonus : -bonus;
    }
  }

  return score;
}

/*
 * Pawn structure evaluation
 * Penalizes doubled pawns and isolated pawns
 * Rewards passed pawns
 */
int EvaluationFunction::evaluatePawnStructure(const Board &board) {
  int score = 0;

  for (int color = 0; color < 2; color++) {
    int sign = (color == WHITE) ? 1 : -1;

    for (int col = 0; col < 8; col++) {
      int pawnCount = 0;
      bool hasPawn = false;
      bool hasNeighborPawn = false;

      // Count pawns in this column (doubled pawns check)
      for (int row = 0; row < 8; row++) {
        if (board.squares[row][col].type == PAWN &&
            board.squares[row][col].color == (Color)color) {
          pawnCount++;
          hasPawn = true;
        }
      }

      // Check adjacent columns for isolated pawn detection
      if (hasPawn) {
        for (int adjCol : {col - 1, col + 1}) {
          if (adjCol < 0 || adjCol > 7)
            continue;
          for (int row = 0; row < 8; row++) {
            if (board.squares[row][col].type == PAWN &&
                board.squares[row][adjCol].color == (Color)color) {
              hasNeighborPawn = true;
            }
          }
        }

        // Penalty for doubled pawns
        if (pawnCount > 1)
          score -= sign * 10 * (pawnCount - 1);

        // Penalty for isolated pawns
        if (!hasNeighborPawn)
          score -= sign * 15;
      }
    }
  }

  return score;
}

/*
 * King safety evaluation
 * Evaluates pawn shield in front of the king
 */
int EvaluationFunction::evaluateKingSafety(const Board &board) {
  int score = 0;

  for (int color = 0; color < 2; color++) {
    int sign = (color == WHITE) ? 1 : -1;
    int kr = board.kingRow[color];
    int kc = board.kingCol[color];
    int dir = (color == WHITE) ? 1 : -1;

    // Pawn shield bonus
    int shieldBonus = 0;
    for (int dc = -1; dc <= 1; dc++) {
      int sc = kc + dc;
      if (sc < 0 || sc > 7)
        continue;
      int sr = kr + dir;
      if (sr >= 0 && sr < 8) {
        if (board.squares[sr][sc].type == PAWN &&
            board.squares[sr][sc].color == (Color)color) {
          shieldBonus += 10;
        }
      }
    }
    score += sign * shieldBonus;
  }

  return score;
}
