/*
 * CheckmateAI - Advanced Chess Engine using DSA
 * board.cpp - Board Implementation
 *
 * DSA Concepts Used:
 *   - 2D Array (8x8 board representation)
 *   - Stack (state history for backtracking / undo)
 *   - Zobrist Hashing (incremental hash updates on make/undo)
 */

#include "board.h"
#include "utils.h"
#include "zobrist.h"
#include <cstring>
#include <iostream>
#include <sstream>

Board::Board() { reset(); }

/*
 * Reset board to initial chess position.
 * DSA: 2D Array initialization
 */
void Board::reset() {
  // Clear the board
  for (int r = 0; r < 8; r++)
    for (int c = 0; c < 8; c++)
      squares[r][c] = Piece();

  // Place pawns
  for (int c = 0; c < 8; c++) {
    squares[1][c] = Piece(PAWN, WHITE);
    squares[6][c] = Piece(PAWN, BLACK);
  }

  // Place pieces - rank 1 (white)
  squares[0][0] = Piece(ROOK, WHITE);
  squares[0][7] = Piece(ROOK, WHITE);
  squares[0][1] = Piece(KNIGHT, WHITE);
  squares[0][6] = Piece(KNIGHT, WHITE);
  squares[0][2] = Piece(BISHOP, WHITE);
  squares[0][5] = Piece(BISHOP, WHITE);
  squares[0][3] = Piece(QUEEN, WHITE);
  squares[0][4] = Piece(KING, WHITE);

  // Place pieces - rank 8 (black)
  squares[7][0] = Piece(ROOK, BLACK);
  squares[7][7] = Piece(ROOK, BLACK);
  squares[7][1] = Piece(KNIGHT, BLACK);
  squares[7][6] = Piece(KNIGHT, BLACK);
  squares[7][2] = Piece(BISHOP, BLACK);
  squares[7][5] = Piece(BISHOP, BLACK);
  squares[7][3] = Piece(QUEEN, BLACK);
  squares[7][4] = Piece(KING, BLACK);

  // Initialize game state
  sideToMove = WHITE;
  castlingRights[WHITE][0] = castlingRights[WHITE][1] =
      true; // Kingside, Queenside
  castlingRights[BLACK][0] = castlingRights[BLACK][1] = true;
  enPassantCol = -1;
  halfMoveClock = 0;
  fullMoveNumber = 1;

  // Track king positions
  kingRow[WHITE] = 0;
  kingCol[WHITE] = 4;
  kingRow[BLACK] = 7;
  kingCol[BLACK] = 4;

  // Compute initial Zobrist hash
  zobristHash = zobrist.computeHash(*this);

  // Clear history
  while (!stateHistory.empty())
    stateHistory.pop();
  moveHistory.clear();
}

/*
 * Initialize board from FEN (Forsyth-Edwards Notation) string.
 * Standard chess position encoding format.
 */
void Board::setFromFEN(const std::string &fen) {
  // Clear board
  for (int r = 0; r < 8; r++)
    for (int c = 0; c < 8; c++)
      squares[r][c] = Piece();

  std::istringstream ss(fen);
  std::string boardStr, sideStr, castleStr, epStr;
  int halfMove = 0, fullMove = 1;

  ss >> boardStr >> sideStr >> castleStr >> epStr >> halfMove >> fullMove;

  // Parse board position
  int row = 7, col = 0;
  for (char c : boardStr) {
    if (c == '/') {
      row--;
      col = 0;
    } else if (c >= '1' && c <= '8') {
      col += (c - '0');
    } else {
      Color color = (c >= 'A' && c <= 'Z') ? WHITE : BLACK;
      char upper = (c >= 'a') ? (c - 32) : c;
      PieceType type = EMPTY;
      switch (upper) {
      case 'P':
        type = PAWN;
        break;
      case 'N':
        type = KNIGHT;
        break;
      case 'B':
        type = BISHOP;
        break;
      case 'R':
        type = ROOK;
        break;
      case 'Q':
        type = QUEEN;
        break;
      case 'K':
        type = KING;
        break;
      }
      squares[row][col] = Piece(type, color);
      if (type == KING) {
        kingRow[color] = row;
        kingCol[color] = col;
      }
      col++;
    }
  }

  sideToMove = (sideStr == "w") ? WHITE : BLACK;

  castlingRights[WHITE][0] = castleStr.find('K') != std::string::npos;
  castlingRights[WHITE][1] = castleStr.find('Q') != std::string::npos;
  castlingRights[BLACK][0] = castleStr.find('k') != std::string::npos;
  castlingRights[BLACK][1] = castleStr.find('q') != std::string::npos;

  enPassantCol = (epStr != "-") ? (epStr[0] - 'a') : -1;
  halfMoveClock = halfMove;
  fullMoveNumber = fullMove;

  zobristHash = zobrist.computeHash(*this);
  while (!stateHistory.empty())
    stateHistory.pop();
  moveHistory.clear();
}

/*
 * Generate FEN string from current position.
 */
std::string Board::toFEN() const {
  std::string fen;

  for (int row = 7; row >= 0; row--) {
    int empty = 0;
    for (int col = 0; col < 8; col++) {
      if (squares[row][col].isEmpty()) {
        empty++;
      } else {
        if (empty > 0) {
          fen += std::to_string(empty);
          empty = 0;
        }
        fen += squares[row][col].toChar();
      }
    }
    if (empty > 0)
      fen += std::to_string(empty);
    if (row > 0)
      fen += '/';
  }

  fen += (sideToMove == WHITE) ? " w " : " b ";

  std::string castle;
  if (castlingRights[WHITE][0])
    castle += 'K';
  if (castlingRights[WHITE][1])
    castle += 'Q';
  if (castlingRights[BLACK][0])
    castle += 'k';
  if (castlingRights[BLACK][1])
    castle += 'q';
  if (castle.empty())
    castle = "-";
  fen += castle;

  if (enPassantCol >= 0) {
    fen += " ";
    fen += (char)('a' + enPassantCol);
    fen += (sideToMove == WHITE) ? "6" : "3";
  } else {
    fen += " -";
  }

  fen += " " + std::to_string(halfMoveClock);
  fen += " " + std::to_string(fullMoveNumber);

  return fen;
}

/*
 * Make a move on the board.
 *
 * DSA: Backtracking - Save state to stack before making changes.
 * The state can be fully restored by undoMove() using the stack.
 *
 * DSA: Zobrist Hashing - Hash is incrementally updated using XOR.
 * We XOR out the old piece positions and XOR in the new ones.
 * This makes hash updates O(1) instead of O(n).
 */
void Board::makeMove(const Move &move) {
  // Save current state for undo (DSA: Push onto stack for backtracking)
  BoardState state;
  std::memcpy(state.castlingRights, castlingRights, sizeof(castlingRights));
  state.enPassantCol = enPassantCol;
  state.halfMoveClock = halfMoveClock;
  state.zobristHash = zobristHash;
  state.capturedPiece = move.capturedPiece;
  state.moveFlag = move.flag;
  stateHistory.push(state);
  moveHistory.push_back(move);

  Piece piece = squares[move.fromRow][move.fromCol];
  Piece captured = squares[move.toRow][move.toCol];

  // Update Zobrist hash - remove piece from source (XOR out)
  zobristHash ^=
      zobrist.getPieceKey(piece.color, piece.type, move.fromRow, move.fromCol);

  // Remove captured piece from hash
  if (!captured.isEmpty()) {
    zobristHash ^= zobrist.getPieceKey(captured.color, captured.type,
                                       move.toRow, move.toCol);
  }

  // Remove old en passant from hash
  if (enPassantCol >= 0) {
    zobristHash ^= zobrist.enPassantKeys[enPassantCol];
  }

  // Remove old castling rights from hash
  for (int c = 0; c < 2; c++)
    for (int s = 0; s < 2; s++)
      if (castlingRights[c][s])
        zobristHash ^= zobrist.castlingKeys[c][s];

  // Move the piece
  squares[move.toRow][move.toCol] = piece;
  squares[move.fromRow][move.fromCol] = Piece();

  // Update half-move clock
  if (piece.type == PAWN || !captured.isEmpty()) {
    halfMoveClock = 0;
  } else {
    halfMoveClock++;
  }

  // Reset en passant
  enPassantCol = -1;

  // Handle special moves
  switch (move.flag) {
  case DOUBLE_PAWN_PUSH:
    enPassantCol = move.toCol;
    break;

  case EN_PASSANT: {
    // Remove the captured pawn
    int capturedRow = move.fromRow; // Same row as our pawn was on
    squares[capturedRow][move.toCol] = Piece();
    zobristHash ^=
        zobrist.getPieceKey(1 - piece.color, PAWN, capturedRow, move.toCol);
    break;
  }

  case KING_CASTLE: {
    // Move the rook
    Piece rook = squares[move.fromRow][7];
    squares[move.fromRow][5] = rook;
    squares[move.fromRow][7] = Piece();
    zobristHash ^= zobrist.getPieceKey(piece.color, ROOK, move.fromRow, 7);
    zobristHash ^= zobrist.getPieceKey(piece.color, ROOK, move.fromRow, 5);
    break;
  }

  case QUEEN_CASTLE: {
    // Move the rook
    Piece rook = squares[move.fromRow][0];
    squares[move.fromRow][3] = rook;
    squares[move.fromRow][0] = Piece();
    zobristHash ^= zobrist.getPieceKey(piece.color, ROOK, move.fromRow, 0);
    zobristHash ^= zobrist.getPieceKey(piece.color, ROOK, move.fromRow, 3);
    break;
  }

  case PROMOTE_KNIGHT:
  case PROMOTE_BISHOP:
  case PROMOTE_ROOK:
  case PROMOTE_QUEEN: {
    PieceType promoType = QUEEN;
    switch (move.flag) {
    case PROMOTE_KNIGHT:
      promoType = KNIGHT;
      break;
    case PROMOTE_BISHOP:
      promoType = BISHOP;
      break;
    case PROMOTE_ROOK:
      promoType = ROOK;
      break;
    default:
      promoType = QUEEN;
      break;
    }
    squares[move.toRow][move.toCol] = Piece(promoType, piece.color);
    // Hash: we already removed the pawn, now add promoted piece
    zobristHash ^=
        zobrist.getPieceKey(piece.color, promoType, move.toRow, move.toCol);
    // Skip the normal piece addition below
    goto skip_normal_add;
  }

  default:
    break;
  }

  // Add piece to new position in hash
  zobristHash ^=
      zobrist.getPieceKey(piece.color, piece.type, move.toRow, move.toCol);

skip_normal_add:

  // Update castling rights
  if (piece.type == KING) {
    castlingRights[piece.color][0] = false;
    castlingRights[piece.color][1] = false;
    kingRow[piece.color] = move.toRow;
    kingCol[piece.color] = move.toCol;
  }
  if (piece.type == ROOK) {
    if (move.fromCol == 7)
      castlingRights[piece.color][0] = false;
    if (move.fromCol == 0)
      castlingRights[piece.color][1] = false;
  }
  // If rook captured, remove opponent's castling rights
  if (!captured.isEmpty() && captured.type == ROOK) {
    if (move.toCol == 7)
      castlingRights[captured.color][0] = false;
    if (move.toCol == 0)
      castlingRights[captured.color][1] = false;
  }

  // Add new castling rights to hash
  for (int c = 0; c < 2; c++)
    for (int s = 0; s < 2; s++)
      if (castlingRights[c][s])
        zobristHash ^= zobrist.castlingKeys[c][s];

  // Add new en passant to hash
  if (enPassantCol >= 0) {
    zobristHash ^= zobrist.enPassantKeys[enPassantCol];
  }

  // Switch side and update hash
  sideToMove = (sideToMove == WHITE) ? BLACK : WHITE;
  zobristHash ^= zobrist.sideKey;

  if (sideToMove == WHITE)
    fullMoveNumber++;
}

/*
 * Undo the last move (Backtracking).
 *
 * DSA: Stack-based backtracking
 * Pop the saved state from the stack and restore all board state.
 * This enables the search to explore different branches of the game tree
 * without needing to copy the entire board state.
 */
void Board::undoMove(const Move &move) {
  if (stateHistory.empty())
    return;

  // DSA: Pop from stack to restore previous state
  BoardState state = stateHistory.top();
  stateHistory.pop();
  moveHistory.pop_back();

  // Switch side back
  sideToMove = (sideToMove == WHITE) ? BLACK : WHITE;
  if (sideToMove == BLACK)
    fullMoveNumber--;

  Piece piece = squares[move.toRow][move.toCol];

  // Handle promotion - restore to pawn
  if (move.flag >= PROMOTE_KNIGHT && move.flag <= PROMOTE_QUEEN) {
    piece = Piece(PAWN, sideToMove);
  }

  // Move piece back
  squares[move.fromRow][move.fromCol] = piece;
  squares[move.toRow][move.toCol] = state.capturedPiece;

  // Handle special moves
  switch (move.flag) {
  case EN_PASSANT: {
    // Restore the captured pawn
    squares[move.toRow][move.toCol] = Piece(); // EP target square was empty
    squares[move.fromRow][move.toCol] =
        Piece(PAWN, (sideToMove == WHITE) ? BLACK : WHITE);
    break;
  }

  case KING_CASTLE: {
    // Move rook back
    squares[move.fromRow][7] = squares[move.fromRow][5];
    squares[move.fromRow][5] = Piece();
    break;
  }

  case QUEEN_CASTLE: {
    // Move rook back
    squares[move.fromRow][0] = squares[move.fromRow][3];
    squares[move.fromRow][3] = Piece();
    break;
  }

  default:
    break;
  }

  // Restore king position
  if (piece.type == KING) {
    kingRow[sideToMove] = move.fromRow;
    kingCol[sideToMove] = move.fromCol;
  }

  // Restore state from stack
  std::memcpy(castlingRights, state.castlingRights, sizeof(castlingRights));
  enPassantCol = state.enPassantCol;
  halfMoveClock = state.halfMoveClock;
  zobristHash = state.zobristHash;
}

/*
 * Check if a square is attacked by a given color.
 * Used for check detection, castling legality, etc.
 */
bool Board::isSquareAttacked(int row, int col, Color byColor) const {
  // Check pawn attacks
  int pawnDir =
      (byColor == WHITE) ? -1 : 1; // Direction FROM which enemy pawn attacks
  int pawnRow = row + pawnDir;
  if (isValid(pawnRow, col - 1) && squares[pawnRow][col - 1].type == PAWN &&
      squares[pawnRow][col - 1].color == byColor)
    return true;
  if (isValid(pawnRow, col + 1) && squares[pawnRow][col + 1].type == PAWN &&
      squares[pawnRow][col + 1].color == byColor)
    return true;

  // Check knight attacks
  const int knightDr[] = {-2, -2, -1, -1, 1, 1, 2, 2};
  const int knightDc[] = {-1, 1, -2, 2, -2, 2, -1, 1};
  for (int i = 0; i < 8; i++) {
    int r = row + knightDr[i], c = col + knightDc[i];
    if (isValid(r, c) && squares[r][c].type == KNIGHT &&
        squares[r][c].color == byColor)
      return true;
  }

  // Check sliding attacks (bishop/queen diagonals, rook/queen straights)
  const int diagDr[] = {-1, -1, 1, 1};
  const int diagDc[] = {-1, 1, -1, 1};
  for (int d = 0; d < 4; d++) {
    for (int dist = 1; dist < 8; dist++) {
      int r = row + diagDr[d] * dist, c = col + diagDc[d] * dist;
      if (!isValid(r, c))
        break;
      if (!squares[r][c].isEmpty()) {
        if (squares[r][c].color == byColor &&
            (squares[r][c].type == BISHOP || squares[r][c].type == QUEEN))
          return true;
        break;
      }
    }
  }

  const int straightDr[] = {-1, 1, 0, 0};
  const int straightDc[] = {0, 0, -1, 1};
  for (int d = 0; d < 4; d++) {
    for (int dist = 1; dist < 8; dist++) {
      int r = row + straightDr[d] * dist, c = col + straightDc[d] * dist;
      if (!isValid(r, c))
        break;
      if (!squares[r][c].isEmpty()) {
        if (squares[r][c].color == byColor &&
            (squares[r][c].type == ROOK || squares[r][c].type == QUEEN))
          return true;
        break;
      }
    }
  }

  // Check king attacks (for adjacent squares)
  for (int dr = -1; dr <= 1; dr++) {
    for (int dc = -1; dc <= 1; dc++) {
      if (dr == 0 && dc == 0)
        continue;
      int r = row + dr, c = col + dc;
      if (isValid(r, c) && squares[r][c].type == KING &&
          squares[r][c].color == byColor)
        return true;
    }
  }

  return false;
}

bool Board::isInCheck() const {
  return isSquareAttacked(kingRow[sideToMove], kingCol[sideToMove],
                          (sideToMove == WHITE) ? BLACK : WHITE);
}

bool Board::isMoveLegal(const Move &move) {
  // Make the move, check if our king is in check, then undo
  // DSA: Backtracking pattern - try, validate, undo
  Color us = sideToMove;
  Board *self = this;
  self->makeMove(move);
  bool legal = !isSquareAttacked(kingRow[us], kingCol[us],
                                 (us == WHITE) ? BLACK : WHITE);
  self->undoMove(move);
  return legal;
}

bool Board::isValid(int row, int col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

Piece Board::getPiece(int row, int col) const { return squares[row][col]; }

std::vector<std::pair<int, int>> Board::getPiecePositions(Color color) const {
  std::vector<std::pair<int, int>> positions;
  for (int r = 0; r < 8; r++)
    for (int c = 0; c < 8; c++)
      if (squares[r][c].color == color)
        positions.push_back({r, c});
  return positions;
}

bool Board::isCheckmate() {
  // Stub - will be determined by move generator returning 0 moves + in check
  return false;
}

bool Board::isStalemate() { return false; }

bool Board::isDraw() {
  // 50-move rule
  if (halfMoveClock >= 100)
    return true;

  // Insufficient material
  int whitePieces = 0, blackPieces = 0;
  bool whiteMinor = false, blackMinor = false;
  for (int r = 0; r < 8; r++) {
    for (int c = 0; c < 8; c++) {
      if (squares[r][c].isEmpty())
        continue;
      if (squares[r][c].type == KING)
        continue;
      if (squares[r][c].color == WHITE) {
        whitePieces++;
        if (squares[r][c].type == KNIGHT || squares[r][c].type == BISHOP)
          whiteMinor = true;
      } else {
        blackPieces++;
        if (squares[r][c].type == KNIGHT || squares[r][c].type == BISHOP)
          blackMinor = true;
      }
    }
  }

  // King vs King
  if (whitePieces == 0 && blackPieces == 0)
    return true;
  // King+minor vs King
  if (whitePieces == 1 && whiteMinor && blackPieces == 0)
    return true;
  if (blackPieces == 1 && blackMinor && whitePieces == 0)
    return true;

  return false;
}

void Board::print() const {
  std::cout << "\n  a b c d e f g h\n";
  for (int row = 7; row >= 0; row--) {
    std::cout << (row + 1) << " ";
    for (int col = 0; col < 8; col++) {
      std::cout << squares[row][col].toChar() << " ";
    }
    std::cout << (row + 1) << "\n";
  }
  std::cout << "  a b c d e f g h\n";
  std::cout << (sideToMove == WHITE ? "White" : "Black") << " to move\n";
}

/*
 * Convert board state to JSON-friendly string for the API.
 */
std::string Board::toJSON() const {
  std::vector<std::string> fields;

  // Board array as 2D array of piece chars
  std::string boardStr = "\"board\":[";
  for (int row = 0; row < 8; row++) {
    boardStr += "[";
    for (int col = 0; col < 8; col++) {
      if (col > 0)
        boardStr += ",";
      if (squares[row][col].isEmpty()) {
        boardStr += "\"\"";
      } else {
        boardStr += "\"";
        boardStr += squares[row][col].toChar();
        boardStr += "\"";
      }
    }
    boardStr += "]";
    if (row < 7)
      boardStr += ",";
  }
  boardStr += "]";
  fields.push_back(boardStr);

  fields.push_back(
      Utils::jsonString("sideToMove", sideToMove == WHITE ? "white" : "black"));
  fields.push_back(Utils::jsonBool("inCheck", isInCheck()));
  fields.push_back(Utils::jsonString("fen", toFEN()));
  fields.push_back(Utils::jsonInt("halfMoveClock", halfMoveClock));
  fields.push_back(Utils::jsonInt("fullMoveNumber", fullMoveNumber));

  // Castling rights
  std::string castleStr = "\"castling\":{";
  castleStr += Utils::jsonBool("whiteKingside", castlingRights[WHITE][0]) + ",";
  castleStr +=
      Utils::jsonBool("whiteQueenside", castlingRights[WHITE][1]) + ",";
  castleStr += Utils::jsonBool("blackKingside", castlingRights[BLACK][0]) + ",";
  castleStr += Utils::jsonBool("blackQueenside", castlingRights[BLACK][1]);
  castleStr += "}";
  fields.push_back(castleStr);

  // Move history
  std::string histStr = "\"moveHistory\":[";
  for (size_t i = 0; i < moveHistory.size(); i++) {
    if (i > 0)
      histStr += ",";
    histStr += "\"" + moveHistory[i].toAlgebraic() + "\"";
  }
  histStr += "]";
  fields.push_back(histStr);

  return Utils::jsonObject(fields);
}
