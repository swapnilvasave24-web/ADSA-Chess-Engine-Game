/*
 * CheckmateAI - Advanced Chess Engine using DSA
 * move_ordering.h - Move Ordering using Priority Queue (Heap)
 *
 * DSA Concepts: Heap / Priority Queue
 * Moves are scored and inserted into a max-heap so that the most
 * promising moves are evaluated first. This dramatically improves
 * alpha-beta pruning efficiency by increasing the likelihood of
 * early cutoffs.
 */

#ifndef MOVE_ORDERING_H
#define MOVE_ORDERING_H

#include "board.h"
#include "move.h"
#include <queue>
#include <vector>

class MoveOrderer {
public:
  /*
   * Order moves using a max-heap (priority queue).
   * Scoring heuristics:
   *   1. Hash move (from transposition table) - highest priority
   *   2. Captures scored by MVV-LVA (Most Valuable Victim - Least Valuable
   * Attacker)
   *   3. Killer moves (quiet moves that caused cutoffs at this depth)
   *   4. History heuristic (moves that frequently caused cutoffs)
   */
  std::vector<Move> orderMoves(const Board &board, std::vector<Move> &moves,
                               const Move &hashMove, int ply);

  // Update killer moves when a quiet move causes a beta cutoff
  void updateKillers(const Move &move, int ply);

  // Update history table when a move causes a cutoff
  void updateHistory(const Move &move, int depth);

  // Clear killer and history tables for new search
  void clear();

private:
  // Score a single move for ordering
  int scoreMove(const Board &board, const Move &move, const Move &hashMove,
                int ply);

  // MVV-LVA scoring for capture moves
  int mvvLvaScore(const Move &move);

  /*
   * Killer moves table - DSA: 2D Array
   * Stores two killer moves per ply (search depth level).
   * Killer moves are quiet moves that caused beta cutoffs.
   */
  Move killerMoves[64][2]; // [ply][slot]

  /*
   * History heuristic table - DSA: 2D Array
   * Tracks how often each from-to square combination causes cutoffs.
   * Higher values = more likely to be a good move.
   */
  int historyTable[64][64]; // [fromSquare][toSquare]

  // Convert row,col to single square index
  static int squareIndex(int row, int col) { return row * 8 + col; }
};

#endif // MOVE_ORDERING_H
