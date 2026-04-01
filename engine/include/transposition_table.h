/*
 * CheckmateAI - Advanced Chess Engine using DSA
 * transposition_table.h - Transposition Table (Hash Map with Memoization)
 *
 * DSA Concepts: Hash Table, Dynamic Programming (Memoization)
 * Previously evaluated positions are stored in a hash table keyed by
 * Zobrist hash. This avoids re-evaluating the same position multiple
 * times (memoization), dramatically reducing search time.
 */

#ifndef TRANSPOSITION_TABLE_H
#define TRANSPOSITION_TABLE_H

#include "move.h"
#include <cstdint>
#include <vector>

// Entry type flags
enum TTFlag {
  TT_EXACT = 0, // Exact score
  TT_ALPHA = 1, // Upper bound (failed low)
  TT_BETA = 2   // Lower bound (failed high)
};

/*
 * Transposition Table Entry
 * Stores memoized search results for a position.
 */
struct TTEntry {
  uint64_t hash; // Full Zobrist hash for verification
  int depth;     // Search depth when this was stored
  int score;     // Evaluation score
  TTFlag flag;   // Type of score bound
  Move bestMove; // Best move found at this position
  bool valid;    // Whether this entry is occupied

  TTEntry() : hash(0), depth(0), score(0), flag(TT_EXACT), valid(false) {}
};

/*
 * TranspositionTable class
 * DSA: Hash Table with open addressing
 * Uses Zobrist hash modulo table size as index.
 * Replacement strategy: always replace if new depth >= old depth.
 */
class TranspositionTable {
public:
  TranspositionTable(size_t sizeMB = 64);

  // Store a position evaluation (memoize)
  void store(uint64_t hash, int depth, int score, TTFlag flag,
             const Move &bestMove);

  // Probe for a stored evaluation (lookup memoized result)
  bool probe(uint64_t hash, int depth, int alpha, int beta, int &score,
             Move &bestMove);

  // Get the best move stored for this position
  bool getBestMove(uint64_t hash, Move &bestMove);

  // Clear all entries
  void clear();

  // Get usage statistics
  size_t getSize() const { return table.size(); }
  size_t getUsed() const;
  double getUsagePercent() const;

private:
  // DSA: Dynamic Array (vector) as the hash table backing store
  std::vector<TTEntry> table;
  size_t mask; // For fast modulo using bitwise AND

  // Compute index from hash
  size_t index(uint64_t hash) const { return hash & mask; }
};

#endif // TRANSPOSITION_TABLE_H
