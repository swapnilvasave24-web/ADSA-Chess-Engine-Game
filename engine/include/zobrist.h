/*
 * CheckmateAI - Advanced Chess Engine using DSA
 * zobrist.h - Zobrist Hashing
 *
 * DSA Concepts: Zobrist Hashing (Universal Hashing)
 * Random 64-bit numbers are assigned to each piece-square combination.
 * The board hash is computed by XOR-ing the relevant random numbers.
 * Incremental updates make hash computation O(1) per move.
 */

#ifndef ZOBRIST_H
#define ZOBRIST_H

#include <cstdint>

class ZobristHasher {
public:
  // Random numbers for each piece type, color, and square
  // DSA: Universal Hashing - random keys ensure uniform distribution
  uint64_t pieceKeys[2][7][8][8]; // [color][pieceType][row][col]
  uint64_t sideKey;               // XOR when it's black's turn
  uint64_t castlingKeys[2][2];    // [color][kingside/queenside]
  uint64_t enPassantKeys[8];      // One per column

  // Initialize random keys
  ZobristHasher();

  // Compute full hash from scratch
  uint64_t computeHash(const class Board &board) const;

  // Get the key for a specific piece on a square
  uint64_t getPieceKey(int color, int pieceType, int row, int col) const;

private:
  // 64-bit pseudo-random number generator
  uint64_t random64();
  uint64_t seed;
};

// Global Zobrist hasher instance
extern ZobristHasher zobrist;

#endif // ZOBRIST_H
