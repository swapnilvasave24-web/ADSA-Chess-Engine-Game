/*
 * CheckmateAI - Advanced Chess Engine using DSA
 * game_tree_node.h - Game Tree Node
 *
 * DSA Concepts: Game Tree (N-ary Tree), State-Space Search
 * Each node represents a board state. Children are reached via legal moves.
 * The game tree is the search space explored by Minimax/Alpha-Beta.
 */

#ifndef GAME_TREE_NODE_H
#define GAME_TREE_NODE_H

#include "board.h"
#include "move.h"
#include <memory>
#include <vector>

/*
 * GameTreeNode represents a single node in the chess game tree.
 *
 * In the state-space model:
 *   - Each node is a board state
 *   - Each edge is a legal move
 *   - Leaf nodes are evaluated by the heuristic function
 *   - Internal nodes propagate values via Minimax
 */
class GameTreeNode {
public:
  Move move;         // The move that led to this state
  int evaluation;    // Evaluation score at this node
  int depth;         // Depth in the tree
  bool isMaximizing; // True if this is a maximizing node (white's turn)

  // Children nodes (DSA: N-ary Tree - each node has multiple children)
  std::vector<std::shared_ptr<GameTreeNode>> children;

  GameTreeNode();
  GameTreeNode(const Move &m, int d, bool isMax);

  // Add a child node
  void addChild(std::shared_ptr<GameTreeNode> child);

  // Check if this is a leaf node
  bool isLeaf() const;

  // Get number of nodes in subtree (for performance metrics)
  int getSubtreeSize() const;
};

#endif // GAME_TREE_NODE_H
