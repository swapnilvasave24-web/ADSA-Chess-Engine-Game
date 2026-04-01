/*
 * CheckmateAI - Advanced Chess Engine using DSA
 * move_generator.cpp - Legal Move Generation
 *
 * DSA Concepts Used:
 *   - DFS (Depth-First Search): Sliding pieces explore each ray direction
 * depth-first
 *   - Recursion: Ray-casting along diagonals/straights uses recursive-style
 * iteration
 *   - Backtracking: Legal move validation uses make/unmake pattern
 *   - Array traversal: Direction arrays define piece movement patterns
 */

#include "move_generator.h"
#include <algorithm>

/*
 * Generate all legal moves for the current side.
 *
 * DSA: Backtracking
 * For each pseudo-legal move, we make the move, check legality
 * (king not in check), then unmake. This try-validate-undo pattern
 * is classic backtracking.
 */
std::vector<Move> MoveGenerator::generateAllMoves(Board &board) {
  std::vector<Move> pseudoLegal = generatePseudoLegalMoves(board);
  std::vector<Move> legal;

  for (auto &move : pseudoLegal) {
    // DSA: Backtracking - try move, validate, undo if illegal
    if (board.isMoveLegal(move)) {
      legal.push_back(move);
    }
  }

  return legal;
}

/*
 * Generate all pseudo-legal moves (may leave own king in check).
 *
 * DSA: DFS over piece positions
 * We iterate through all squares (DFS over the board),
 * and for each piece of the current side, generate its moves.
 */
std::vector<Move> MoveGenerator::generatePseudoLegalMoves(const Board &board) {
  std::vector<Move> moves;
  moves.reserve(256); // Average position has ~30-40 legal moves

  Color side = board.sideToMove;

  for (int row = 0; row < 8; row++) {
    for (int col = 0; col < 8; col++) {
      const Piece &piece = board.squares[row][col];
      if (piece.isEmpty() || piece.color != side)
        continue;

      switch (piece.type) {
      case PAWN:
        generatePawnMoves(board, row, col, moves);
        break;
      case KNIGHT:
        generateKnightMoves(board, row, col, moves);
        break;
      case BISHOP:
        generateBishopMoves(board, row, col, moves);
        break;
      case ROOK:
        generateRookMoves(board, row, col, moves);
        break;
      case QUEEN:
        generateQueenMoves(board, row, col, moves);
        break;
      case KING:
        generateKingMoves(board, row, col, moves);
        break;
      default:
        break;
      }
    }
  }

  return moves;
}

std::vector<Move> MoveGenerator::generateMovesForSquare(Board &board, int row,
                                                        int col) {
  std::vector<Move> allMoves = generateAllMoves(board);
  std::vector<Move> squareMoves;

  for (auto &move : allMoves) {
    if (move.fromRow == row && move.fromCol == col) {
      squareMoves.push_back(move);
    }
  }

  return squareMoves;
}

/*
 * Generate only capture moves (for quiescence search).
 */
std::vector<Move> MoveGenerator::generateCaptures(Board &board) {
  std::vector<Move> allMoves = generateAllMoves(board);
  std::vector<Move> captures;

  for (auto &move : allMoves) {
    if (!move.capturedPiece.isEmpty() || move.flag == EN_PASSANT) {
      captures.push_back(move);
    }
  }

  return captures;
}

/*
 * Generate pawn moves including:
 * - Single push, double push
 * - Diagonal captures
 * - En passant
 * - Promotion (all 4 piece types)
 */
void MoveGenerator::generatePawnMoves(const Board &board, int row, int col,
                                      std::vector<Move> &moves) {
  Color side = board.sideToMove;
  Piece pawn = board.squares[row][col];
  int dir = (side == WHITE) ? 1 : -1;
  int startRow = (side == WHITE) ? 1 : 6;
  int promoRow = (side == WHITE) ? 7 : 0;

  // Single push
  int newRow = row + dir;
  if (Board::isValid(newRow, col) && board.squares[newRow][col].isEmpty()) {
    if (newRow == promoRow) {
      addPromotionMoves(row, col, newRow, col, pawn, Piece(), moves);
    } else {
      moves.push_back(Move(row, col, newRow, col, pawn));
    }

    // Double push from starting position
    if (row == startRow) {
      int doubleRow = row + 2 * dir;
      if (board.squares[doubleRow][col].isEmpty()) {
        moves.push_back(
            Move(row, col, doubleRow, col, pawn, Piece(), DOUBLE_PAWN_PUSH));
      }
    }
  }

  // Captures (diagonal)
  for (int dc : {-1, 1}) {
    int nc = col + dc;
    if (!Board::isValid(newRow, nc))
      continue;

    Piece target = board.squares[newRow][nc];
    if (!target.isEmpty() && target.color != side) {
      if (newRow == promoRow) {
        addPromotionMoves(row, col, newRow, nc, pawn, target, moves);
      } else {
        moves.push_back(Move(row, col, newRow, nc, pawn, target));
      }
    }

    // En passant
    if (nc == board.enPassantCol &&
        ((side == WHITE && row == 4) || (side == BLACK && row == 3))) {
      Color opp = (side == WHITE) ? BLACK : WHITE;
      Piece epCapture(PAWN, opp);
      moves.push_back(Move(row, col, newRow, nc, pawn, epCapture, EN_PASSANT));
    }
  }
}

/*
 * Generate knight moves.
 * Knights move in L-shapes (2+1 or 1+2 in any direction).
 */
void MoveGenerator::generateKnightMoves(const Board &board, int row, int col,
                                        std::vector<Move> &moves) {
  Piece knight = board.squares[row][col];
  const int dr[] = {-2, -2, -1, -1, 1, 1, 2, 2};
  const int dc[] = {-1, 1, -2, 2, -2, 2, -1, 1};

  for (int i = 0; i < 8; i++) {
    int nr = row + dr[i], nc = col + dc[i];
    if (!Board::isValid(nr, nc))
      continue;

    Piece target = board.squares[nr][nc];
    if (target.isEmpty()) {
      moves.push_back(Move(row, col, nr, nc, knight));
    } else if (target.color != knight.color) {
      moves.push_back(Move(row, col, nr, nc, knight, target));
    }
  }
}

/*
 * DSA: DFS Ray-Casting for sliding pieces.
 * Explores each direction depth-first until hitting the board edge
 * or another piece. If the piece is an enemy, it can be captured.
 * This is depth-first because we go as deep as possible along one
 * direction before trying the next direction.
 */
void MoveGenerator::generateSlidingMoves(const Board &board, int row, int col,
                                         int dRow, int dCol,
                                         std::vector<Move> &moves) {
  Piece slider = board.squares[row][col];

  // DFS: Explore this direction as deep as possible
  for (int dist = 1; dist < 8; dist++) {
    int nr = row + dRow * dist;
    int nc = col + dCol * dist;

    if (!Board::isValid(nr, nc))
      break; // Hit board edge

    Piece target = board.squares[nr][nc];
    if (target.isEmpty()) {
      moves.push_back(Move(row, col, nr, nc, slider));
    } else {
      if (target.color != slider.color) {
        moves.push_back(Move(row, col, nr, nc, slider, target));
      }
      break; // Hit a piece - stop exploring this direction
    }
  }
}

void MoveGenerator::generateBishopMoves(const Board &board, int row, int col,
                                        std::vector<Move> &moves) {
  // DSA: DFS along 4 diagonal directions
  generateSlidingMoves(board, row, col, -1, -1, moves);
  generateSlidingMoves(board, row, col, -1, 1, moves);
  generateSlidingMoves(board, row, col, 1, -1, moves);
  generateSlidingMoves(board, row, col, 1, 1, moves);
}

void MoveGenerator::generateRookMoves(const Board &board, int row, int col,
                                      std::vector<Move> &moves) {
  // DSA: DFS along 4 straight directions
  generateSlidingMoves(board, row, col, -1, 0, moves);
  generateSlidingMoves(board, row, col, 1, 0, moves);
  generateSlidingMoves(board, row, col, 0, -1, moves);
  generateSlidingMoves(board, row, col, 0, 1, moves);
}

void MoveGenerator::generateQueenMoves(const Board &board, int row, int col,
                                       std::vector<Move> &moves) {
  // Queen = Bishop + Rook (all 8 directions)
  generateBishopMoves(board, row, col, moves);
  generateRookMoves(board, row, col, moves);
}

void MoveGenerator::generateKingMoves(const Board &board, int row, int col,
                                      std::vector<Move> &moves) {
  Piece king = board.squares[row][col];

  // Normal king moves (1 square in any direction)
  for (int dr = -1; dr <= 1; dr++) {
    for (int dc = -1; dc <= 1; dc++) {
      if (dr == 0 && dc == 0)
        continue;
      int nr = row + dr, nc = col + dc;
      if (!Board::isValid(nr, nc))
        continue;

      Piece target = board.squares[nr][nc];
      if (target.isEmpty()) {
        moves.push_back(Move(row, col, nr, nc, king));
      } else if (target.color != king.color) {
        moves.push_back(Move(row, col, nr, nc, king, target));
      }
    }
  }

  // Castling
  generateCastlingMoves(board, row, col, moves);
}

void MoveGenerator::generateCastlingMoves(const Board &board, int row, int col,
                                          std::vector<Move> &moves) {
  Color side = board.sideToMove;
  Color opp = (side == WHITE) ? BLACK : WHITE;
  Piece king = board.squares[row][col];

  // Can't castle while in check
  if (board.isSquareAttacked(row, col, opp))
    return;

  // Kingside castling
  if (board.castlingRights[side][0]) {
    if (board.squares[row][5].isEmpty() && board.squares[row][6].isEmpty() &&
        !board.isSquareAttacked(row, 5, opp) &&
        !board.isSquareAttacked(row, 6, opp)) {
      moves.push_back(Move(row, col, row, 6, king, Piece(), KING_CASTLE));
    }
  }

  // Queenside castling
  if (board.castlingRights[side][1]) {
    if (board.squares[row][3].isEmpty() && board.squares[row][2].isEmpty() &&
        board.squares[row][1].isEmpty() &&
        !board.isSquareAttacked(row, 3, opp) &&
        !board.isSquareAttacked(row, 2, opp)) {
      moves.push_back(Move(row, col, row, 2, king, Piece(), QUEEN_CASTLE));
    }
  }
}

void MoveGenerator::addPromotionMoves(int fromRow, int fromCol, int toRow,
                                      int toCol, Piece piece, Piece captured,
                                      std::vector<Move> &moves) {
  moves.push_back(
      Move(fromRow, fromCol, toRow, toCol, piece, captured, PROMOTE_QUEEN));
  moves.push_back(
      Move(fromRow, fromCol, toRow, toCol, piece, captured, PROMOTE_ROOK));
  moves.push_back(
      Move(fromRow, fromCol, toRow, toCol, piece, captured, PROMOTE_BISHOP));
  moves.push_back(
      Move(fromRow, fromCol, toRow, toCol, piece, captured, PROMOTE_KNIGHT));
}
