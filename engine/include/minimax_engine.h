/*
 * CheckmateAI - Advanced Chess Engine using DSA
 * minimax_engine.h - Search Engine with Minimax & Alpha-Beta Pruning
 *
 * DSA Concepts:
 *   - Minimax Algorithm (Game Theory)
 *   - Alpha-Beta Pruning (Branch and Bound optimization)
 *   - Iterative Deepening DFS
 *   - Quiescence Search (tactical stability)
 *   - Dynamic Programming via Transposition Table
 */

#ifndef MINIMAX_ENGINE_H
#define MINIMAX_ENGINE_H

#include "board.h"
#include "evaluation.h"
#include "game_tree_node.h"
#include "move.h"
#include "move_generator.h"
#include "move_ordering.h"
#include "transposition_table.h"
#include <chrono>
#include <string>

// Search result with metrics
struct SearchResult {
  Move bestMove;
  int score;
  int nodesExplored;
  int depthReached;
  double timeMs;
  int ttHits;     // Transposition table hits
  int cutoffs;    // Alpha-beta cutoffs
  std::string pv; // Principal variation (best line)
};

class MinimaxEngine {
public:
  MinimaxEngine();

  /*
   * Find the best move using Iterative Deepening + Alpha-Beta.
   *
   * DSA: Iterative Deepening DFS
   * Searches to increasing depths (1, 2, 3, ... maxDepth).
   * Each iteration uses the previous iteration's best move for
   * move ordering, improving alpha-beta pruning efficiency.
   */
  SearchResult findBestMove(Board &board, int maxDepth);

  // Set the transposition table size
  void setTableSize(size_t sizeMB);

  // Clear search state for new game
  void newGame();

  // Get the transposition table for stats
  const TranspositionTable &getTranspositionTable() const { return tt; }

private:
  MoveGenerator moveGen;
  EvaluationFunction evaluator;
  TranspositionTable tt;
  MoveOrderer moveOrderer;

  // Search statistics
  int nodesExplored;
  int ttHits;
  int cutoffs;

  /*
   * Alpha-Beta search (Branch and Bound)
   *
   * DSA: Minimax with Alpha-Beta Pruning
   * Alpha = best score white can guarantee (lower bound)
   * Beta = best score black can guarantee (upper bound)
   * When alpha >= beta, we prune the remaining branches (cutoff).
   * This is a Branch and Bound optimization that reduces the
   * effective branching factor from ~35 to ~6.
   */
  int alphaBeta(Board &board, int depth, int alpha, int beta, bool isMaximizing,
                int ply);

  /*
   * Quiescence Search
   *
   * At leaf nodes of the main search, we continue searching
   * capture moves only to avoid the "horizon effect" where
   * the evaluation is inaccurate due to pending captures.
   */
  int quiescence(Board &board, int alpha, int beta, bool isMaximizing);

  // Build principal variation string
  std::string getPV(Board &board, int depth);

  // Time management
  std::chrono::high_resolution_clock::time_point searchStart;
};

#endif // MINIMAX_ENGINE_H
