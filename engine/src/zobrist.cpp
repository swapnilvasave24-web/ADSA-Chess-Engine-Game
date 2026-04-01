/*
 * CheckmateAI - Advanced Chess Engine using DSA
 * zobrist.cpp - Zobrist Hashing Implementation
 *
 * DSA Concepts Used:
 *   - Zobrist Hashing (Universal Hashing technique)
 *   - XOR-based incremental hashing for O(1) updates
 *   - Random number generation for hash key initialization
 */

#include "zobrist.h"
#include "board.h"

// Global Zobrist hasher instance
ZobristHasher zobrist;

ZobristHasher::ZobristHasher() : seed(1070372ull) {
  // Initialize all random keys for piece-square combinations
  // DSA: Universal Hashing - random keys minimize collision probability
  for (int color = 0; color < 2; color++) {
    for (int piece = 0; piece < 7; piece++) {
      for (int row = 0; row < 8; row++) {
        for (int col = 0; col < 8; col++) {
          pieceKeys[color][piece][row][col] = random64();
        }
      }
    }
  }

  sideKey = random64();

  for (int color = 0; color < 2; color++) {
    for (int side = 0; side < 2; side++) {
      castlingKeys[color][side] = random64();
    }
  }

  for (int col = 0; col < 8; col++) {
    enPassantKeys[col] = random64();
  }
}

/*
 * 64-bit pseudo-random number generator (xorshift64)
 * DSA: PRNG for universal hash function key generation
 */
uint64_t ZobristHasher::random64() {
  seed ^= seed << 13;
  seed ^= seed >> 7;
  seed ^= seed << 17;
  return seed;
}

/*
 * Compute the full Zobrist hash of a board position from scratch.
 * Used for initialization; afterwards, incremental updates are used.
 *
 * DSA: Hash Function Computation
 * The hash is the XOR of all piece-square keys on the board,
 * plus side-to-move, castling, and en passant keys.
 */
uint64_t ZobristHasher::computeHash(const Board &board) const {
  uint64_t hash = 0;

  for (int row = 0; row < 8; row++) {
    for (int col = 0; col < 8; col++) {
      const Piece &p = board.squares[row][col];
      if (!p.isEmpty()) {
        hash ^= pieceKeys[p.color][p.type][row][col];
      }
    }
  }

  if (board.sideToMove == BLACK) {
    hash ^= sideKey;
  }

  for (int color = 0; color < 2; color++) {
    for (int side = 0; side < 2; side++) {
      if (board.castlingRights[color][side]) {
        hash ^= castlingKeys[color][side];
      }
    }
  }

  if (board.enPassantCol >= 0) {
    hash ^= enPassantKeys[board.enPassantCol];
  }

  return hash;
}

uint64_t ZobristHasher::getPieceKey(int color, int pieceType, int row,
                                    int col) const {
  return pieceKeys[color][pieceType][row][col];
}
