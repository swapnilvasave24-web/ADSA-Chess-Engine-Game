/*
 * CheckmateAI - Advanced Chess Engine using DSA
 * game_tree_node.cpp - Game Tree Node Implementation
 *
 * DSA Concepts Used:
 *   - N-ary Tree: Each game state has multiple children (one per legal move)
 *   - State-Space Search: The tree represents the game's state space
 *   - Recursive tree size computation
 */

#include "game_tree_node.h"

GameTreeNode::GameTreeNode() : evaluation(0), depth(0), isMaximizing(true) {}

GameTreeNode::GameTreeNode(const Move &m, int d, bool isMax)
    : move(m), evaluation(0), depth(d), isMaximizing(isMax) {}

/*
 * Add a child to this node.
 * DSA: N-ary tree insertion
 */
void GameTreeNode::addChild(std::shared_ptr<GameTreeNode> child) {
  children.push_back(child);
}

bool GameTreeNode::isLeaf() const { return children.empty(); }

/*
 * Count total nodes in subtree.
 * DSA: Recursive tree traversal (DFS post-order)
 */
int GameTreeNode::getSubtreeSize() const {
  int size = 1; // Count this node
  for (const auto &child : children) {
    size += child->getSubtreeSize();
  }
  return size;
}
