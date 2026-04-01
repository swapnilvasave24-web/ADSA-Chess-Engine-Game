/*
 * CheckmateAI - Advanced Chess Engine using DSA
 * minimax_engine.cpp - Minimax Search with Alpha-Beta Pruning
 *
 * DSA Concepts Used:
 *   - Minimax Algorithm: Two-player zero-sum game strategy
 *   - Alpha-Beta Pruning (Branch and Bound): O(b^(d/2)) vs O(b^d)
 *   - Iterative Deepening DFS: Progressive depth search
 *   - Dynamic Programming: Transposition table memoization
 *   - Quiescence Search: Tactical stability at leaf nodes
 *   - Priority Queue: Move ordering for better pruning
 */

#include "minimax_engine.h"
#include <algorithm>
#include <iostream>
#include <limits>

const int INF = 999999;
const int MATE_SCORE = 100000;

MinimaxEngine::MinimaxEngine()
    : tt(32), nodesExplored(0), ttHits(0), cutoffs(0) {}

void MinimaxEngine::setTableSize(size_t sizeMB) {
  tt = TranspositionTable(sizeMB);
}

void MinimaxEngine::newGame() {
  tt.clear();
  moveOrderer.clear();
}

/*
 * Find the best move using Iterative Deepening + Alpha-Beta.
 *
 * DSA: Iterative Deepening DFS (IDDFS)
 * We search to depth 1, then 2, then 3, ... up to maxDepth.
 * Each iteration uses results from the previous iteration:
 *   - Best move goes into transposition table for move ordering
 *   - This dramatically improves alpha-beta pruning efficiency
 *
 * Time complexity without pruning: O(b^d) where b=branching factor, d=depth
 * With alpha-beta pruning: O(b^(d/2)) in best case
 * With move ordering: approaches the best case consistently
 */
SearchResult MinimaxEngine::findBestMove(Board &board, int maxDepth) {
  searchStart = std::chrono::high_resolution_clock::now();
  nodesExplored = 0;
  ttHits = 0;
  cutoffs = 0;
  moveOrderer.clear();

  SearchResult result;
  result.bestMove = Move();
  result.score = 0;

  // Generate all legal moves
  std::vector<Move> moves = moveGen.generateAllMoves(board);

  if (moves.empty()) {
    result.score = board.isInCheck() ? -MATE_SCORE : 0;
    return result;
  }

  if (moves.size() == 1) {
    result.bestMove = moves[0];
    result.nodesExplored = 1;
    result.depthReached = 1;
    result.timeMs = 0;
    return result;
  }

  /*
   * DSA: Iterative Deepening - search from depth 1 to maxDepth
   * Each iteration refines the previous result and improves
   * move ordering for the next iteration.
   */
  Move bestMoveThisIteration;
  for (int depth = 1; depth <= maxDepth; depth++) {
    int alpha = -INF;
    int beta = INF;
    int bestScore = -INF;

    // Get hash move for ordering
    Move hashMove;
    tt.getBestMove(board.zobristHash, hashMove);

    // Order moves using priority queue (DSA: Heap)
    std::vector<Move> orderedMoves =
        moveOrderer.orderMoves(board, moves, hashMove, 0);

    for (auto &move : orderedMoves) {
      board.makeMove(move);

      // DSA: Minimax with negamax framework
      // Score from opponent's perspective is negated
      int score = -alphaBeta(board, depth - 1, -beta, -alpha, false, 1);

      board.undoMove(move);

      if (score > bestScore) {
        bestScore = score;
        bestMoveThisIteration = move;
      }

      if (score > alpha) {
        alpha = score;
      }
    }

    result.bestMove = bestMoveThisIteration;
    result.score = bestScore;
    result.depthReached = depth;

    // Store in transposition table (DSA: Memoization)
    tt.store(board.zobristHash, depth, bestScore, TT_EXACT,
             bestMoveThisIteration);

    // If we found a forced mate, stop searching
    if (bestScore > MATE_SCORE - 100 || bestScore < -MATE_SCORE + 100) {
      break;
    }
  }

  auto end = std::chrono::high_resolution_clock::now();
  result.timeMs =
      std::chrono::duration<double, std::milli>(end - searchStart).count();
  result.nodesExplored = nodesExplored;
  result.ttHits = ttHits;
  result.cutoffs = cutoffs;
  result.pv = getPV(board, result.depthReached);

  return result;
}

/*
 * Alpha-Beta Search (Branch and Bound)
 *
 * DSA: Minimax Algorithm with Alpha-Beta Pruning
 *
 * The Minimax algorithm evaluates game positions by assuming both
 * players play optimally. The maximizing player (white) tries to
 * maximize the score, while the minimizing player (black) minimizes it.
 *
 * Alpha-Beta Pruning (Branch and Bound):
 *   - Alpha = lower bound (best score maximizer can guarantee)
 *   - Beta = upper bound (best score minimizer can guarantee)
 *   - When alpha >= beta, remaining moves cannot affect the result,
 *     so we prune (cut off) the search branch.
 *   - This is Branch and Bound: alpha/beta are bounds, and branches
 *     that cannot improve the result are pruned.
 *
 * Complexity:
 *   - Without pruning: O(b^d) where b ≈ 35, d = search depth
 *   - With perfect ordering: O(b^(d/2)) - exponential reduction!
 */
int MinimaxEngine::alphaBeta(Board &board, int depth, int alpha, int beta,
                             bool isMaximizing, int ply) {
  nodesExplored++;

  // Check transposition table (DSA: Memoization / DP lookup)
  int ttScore;
  Move ttMove;
  if (tt.probe(board.zobristHash, depth, alpha, beta, ttScore, ttMove)) {
    ttHits++;
    return ttScore;
  }

  // Base case: leaf node or terminal position
  if (depth <= 0) {
    // Extend search for captures (quiescence search)
    return quiescence(board, alpha, beta, isMaximizing);
  }

  // Check for draws
  if (board.isDraw())
    return 0;

  // Generate all legal moves
  std::vector<Move> moves = moveGen.generateAllMoves(board);

  // Checkmate or stalemate detection
  if (moves.empty()) {
    if (board.isInCheck()) {
      return -MATE_SCORE + ply; // Checkmate (prefer shorter mates)
    }
    return 0; // Stalemate
  }

  // Order moves using priority queue for optimal pruning (DSA: Heap)
  Move hashMove;
  tt.getBestMove(board.zobristHash, hashMove);
  std::vector<Move> orderedMoves =
      moveOrderer.orderMoves(board, moves, hashMove, ply);

  Move bestMove = orderedMoves[0];
  int bestScore = -INF;
  TTFlag ttFlag = TT_ALPHA;

  for (size_t i = 0; i < orderedMoves.size(); i++) {
    const Move &move = orderedMoves[i];

    // DSA: Backtracking - make move, search, undo move
    board.makeMove(move);
    int score =
        -alphaBeta(board, depth - 1, -beta, -alpha, !isMaximizing, ply + 1);
    board.undoMove(move);

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }

    if (score > alpha) {
      alpha = score;
      ttFlag = TT_EXACT;
    }

    /*
     * DSA: Alpha-Beta Pruning (Branch and Bound cutoff)
     * If alpha >= beta, the current position is "too good" for us,
     * meaning the opponent would never allow this position.
     * We can safely prune all remaining moves in this branch.
     */
    if (alpha >= beta) {
      cutoffs++;
      ttFlag = TT_BETA;

      // Update killer moves and history (DSA: Heuristic tables)
      if (move.capturedPiece.isEmpty()) {
        moveOrderer.updateKillers(move, ply);
        moveOrderer.updateHistory(move, depth);
      }

      break; // PRUNE - don't evaluate remaining moves
    }
  }

  // Store result in transposition table (DSA: Memoize for future use)
  tt.store(board.zobristHash, depth, bestScore, ttFlag, bestMove);

  return bestScore;
}

/*
 * Quiescence Search
 *
 * DSA: Extended DFS for tactical stability
 * At leaf nodes, we continue searching capture moves only to avoid
 * the "horizon effect" - where a position looks good/bad because
 * we stop searching right before a capture sequence completes.
 *
 * Example: If we stop after QxB, it looks like we won a bishop.
 * But quiescence search continues: QxB, BxQ - actually we lost the queen!
 */
int MinimaxEngine::quiescence(Board &board, int alpha, int beta,
                              bool isMaximizing) {
  nodesExplored++;

  // Stand pat: evaluate current position
  int standPat = evaluator.evaluate(board);

  if (standPat >= beta)
    return beta;
  if (standPat > alpha)
    alpha = standPat;

  // Generate and search capture moves only
  std::vector<Move> captures = moveGen.generateCaptures(board);

  for (auto &move : captures) {
    board.makeMove(move);
    int score = -quiescence(board, -beta, -alpha, !isMaximizing);
    board.undoMove(move);

    if (score >= beta)
      return beta;
    if (score > alpha)
      alpha = score;
  }

  return alpha;
}

/*
 * Extract Principal Variation (best line of play) from transposition table.
 */
std::string MinimaxEngine::getPV(Board &board, int depth) {
  std::string pv;
  int count = 0;

  while (count < depth) {
    Move ttMove;
    if (!tt.getBestMove(board.zobristHash, ttMove))
      break;

    // Verify move is legal
    std::vector<Move> legalMoves = moveGen.generateAllMoves(board);
    bool found = false;
    for (const auto &m : legalMoves) {
      if (m == ttMove) {
        found = true;
        break;
      }
    }
    if (!found)
      break;

    if (!pv.empty())
      pv += " ";
    pv += ttMove.toAlgebraic();
    board.makeMove(ttMove);
    count++;
  }

  // Unmake all moves
  for (int i = 0; i < count; i++) {
    board.undoMove(board.moveHistory.back());
  }

  return pv;
}
