/*
 * CheckmateAI - Advanced Chess Engine using DSA
 * move_ordering.cpp - Move Ordering with Priority Queue (Heap)
 *
 * DSA Concepts Used:
 *   - Max-Heap (Priority Queue): Moves are scored and sorted so the
 *     most promising moves are evaluated first
 *   - MVV-LVA (Most Valuable Victim - Least Valuable Attacker):
 *     Heuristic for ordering capture moves
 *   - Killer Move Heuristic: Remembers quiet moves that caused cutoffs
 *   - History Heuristic: Statistical frequency table for good moves
 */

#include "move_ordering.h"
#include "evaluation.h"
#include <algorithm>
#include <cstring>
#include <queue>

/*
 * Order moves using a max-heap (priority queue).
 *
 * DSA: Priority Queue / Heap
 * Each move is scored based on multiple heuristics, then
 * sorted using a comparison that implements a max-heap property.
 * This ensures the most promising moves are tried first,
 * maximizing alpha-beta pruning efficiency.
 */
std::vector<Move> MoveOrderer::orderMoves(const Board &board,
                                          std::vector<Move> &moves,
                                          const Move &hashMove, int ply) {
  // Score each move
  for (auto &move : moves) {
    move.score = scoreMove(board, move, hashMove, ply);
  }

  /*
   * DSA: Max-Heap via Priority Queue
   * We use std::priority_queue (backed by a binary heap) to
   * extract moves in order of their scores. The highest-scored
   * move is extracted first.
   */
  std::priority_queue<Move> pq;
  for (const auto &move : moves) {
    pq.push(move);
  }

  std::vector<Move> ordered;
  ordered.reserve(moves.size());
  while (!pq.empty()) {
    ordered.push_back(pq.top());
    pq.pop();
  }

  return ordered;
}

/*
 * Score a move for ordering.
 * Higher score = more likely to be a good move = evaluated earlier.
 */
int MoveOrderer::scoreMove(const Board &board, const Move &move,
                           const Move &hashMove, int ply) {
  // Highest priority: hash move from transposition table
  if (move == hashMove)
    return 100000;

  // Capture moves scored by MVV-LVA
  if (!move.capturedPiece.isEmpty()) {
    return 50000 + mvvLvaScore(move);
  }

  // Promotion
  if (move.flag >= PROMOTE_KNIGHT && move.flag <= PROMOTE_QUEEN) {
    return 45000 + (move.flag - PROMOTE_KNIGHT) * 100;
  }

  // Killer moves (quiet moves that caused cutoffs at the same ply)
  if (ply < 64) {
    if (move == killerMoves[ply][0])
      return 40000;
    if (move == killerMoves[ply][1])
      return 39000;
  }

  // History heuristic (statistical move frequency)
  int fromSq = squareIndex(move.fromRow, move.fromCol);
  int toSq = squareIndex(move.toRow, move.toCol);
  return historyTable[fromSq][toSq];
}

/*
 * MVV-LVA (Most Valuable Victim - Least Valuable Attacker)
 *
 * DSA: Heuristic scoring
 * Captures are scored by: 10 * victimValue - attackerValue
 * This prioritizes capturing valuable pieces with less valuable ones.
 * E.g., PxQ (pawn takes queen) scores higher than QxQ.
 */
int MoveOrderer::mvvLvaScore(const Move &move) {
  int victimValue = EvaluationFunction::pieceValue(move.capturedPiece.type);
  int attackerValue = EvaluationFunction::pieceValue(move.piece.type);
  return 10 * victimValue - attackerValue;
}

/*
 * Update killer moves table.
 *
 * DSA: Sliding window in a 2-element array
 * When a quiet move causes a beta cutoff, it's stored as a killer.
 * We keep 2 killers per ply in a sliding window fashion.
 */
void MoveOrderer::updateKillers(const Move &move, int ply) {
  if (ply >= 64)
    return;
  if (!(move == killerMoves[ply][0])) {
    killerMoves[ply][1] = killerMoves[ply][0];
    killerMoves[ply][0] = move;
  }
}

/*
 * Update history heuristic table.
 *
 * DSA: Frequency table (2D array)
 * Increment the from-to square combination score by depth^2.
 * Deeper cutoffs are weighted more heavily.
 */
void MoveOrderer::updateHistory(const Move &move, int depth) {
  int fromSq = squareIndex(move.fromRow, move.fromCol);
  int toSq = squareIndex(move.toRow, move.toCol);
  historyTable[fromSq][toSq] += depth * depth;

  // Prevent overflow by scaling down if values get too large
  if (historyTable[fromSq][toSq] > 30000) {
    for (int i = 0; i < 64; i++)
      for (int j = 0; j < 64; j++)
        historyTable[i][j] /= 2;
  }
}

void MoveOrderer::clear() {
  std::memset(killerMoves, 0, sizeof(killerMoves));
  std::memset(historyTable, 0, sizeof(historyTable));
}
