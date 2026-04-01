/*
 * CheckmateAI - Advanced Chess Engine using DSA
 * transposition_table.cpp - Transposition Table Implementation
 *
 * DSA Concepts Used:
 *   - Hash Table: Array-based hash map with Zobrist key indexing
 *   - Dynamic Programming (Memoization): Store and reuse evaluated positions
 *   - Collision handling via depth-based replacement strategy
 */

#include "transposition_table.h"
#include <cmath>

/*
 * Constructor: Initialize hash table with given size in MB.
 *
 * DSA: Hash Table initialization
 * Table size is rounded to power of 2 for efficient modulo via bitwise AND.
 * This is a standard technique for hash table implementations.
 */
TranspositionTable::TranspositionTable(size_t sizeMB) {
  size_t numEntries = (sizeMB * 1024 * 1024) / sizeof(TTEntry);

  // Round down to power of 2 for fast modulo using bitwise AND
  size_t size = 1;
  while (size * 2 <= numEntries)
    size *= 2;

  table.resize(size);
  mask = size - 1;
  clear();
}

/*
 * Store a position evaluation in the transposition table.
 *
 * DSA: Memoization - store computed result for future lookup
 * If a position is already stored, we use a depth-based replacement
 * strategy: newer, deeper searches replace shallower ones.
 */
void TranspositionTable::store(uint64_t hash, int depth, int score, TTFlag flag,
                               const Move &bestMove) {
  size_t idx = index(hash);
  TTEntry &entry = table[idx];

  // Replacement strategy: always replace if new depth >= stored depth
  // DSA: This ensures we keep the most valuable (deepest) analysis
  if (!entry.valid || depth >= entry.depth || hash == entry.hash) {
    entry.hash = hash;
    entry.depth = depth;
    entry.score = score;
    entry.flag = flag;
    entry.bestMove = bestMove;
    entry.valid = true;
  }
}

/*
 * Probe the transposition table for a stored evaluation.
 *
 * DSA: Memoization lookup
 * Returns true if a usable entry was found. The entry is usable if:
 *   1. The hash matches (same position)
 *   2. The stored depth >= requested depth (deep enough analysis)
 *   3. The score bound is compatible with current alpha-beta window
 */
bool TranspositionTable::probe(uint64_t hash, int depth, int alpha, int beta,
                               int &score, Move &bestMove) {
  size_t idx = index(hash);
  const TTEntry &entry = table[idx];

  if (!entry.valid || entry.hash != hash)
    return false;

  bestMove = entry.bestMove;

  if (entry.depth >= depth) {
    score = entry.score;

    switch (entry.flag) {
    case TT_EXACT:
      return true;
    case TT_ALPHA:
      if (score <= alpha)
        return true;
      break;
    case TT_BETA:
      if (score >= beta)
        return true;
      break;
    }
  }

  return false;
}

/*
 * Get the best move stored for a position.
 * Used for move ordering even when the score is not deep enough.
 */
bool TranspositionTable::getBestMove(uint64_t hash, Move &bestMove) {
  size_t idx = index(hash);
  const TTEntry &entry = table[idx];

  if (entry.valid && entry.hash == hash) {
    bestMove = entry.bestMove;
    return true;
  }
  return false;
}

void TranspositionTable::clear() {
  for (auto &entry : table) {
    entry.valid = false;
  }
}

size_t TranspositionTable::getUsed() const {
  size_t count = 0;
  for (const auto &entry : table) {
    if (entry.valid)
      count++;
  }
  return count;
}

double TranspositionTable::getUsagePercent() const {
  if (table.empty())
    return 0.0;
  return (100.0 * getUsed()) / table.size();
}
