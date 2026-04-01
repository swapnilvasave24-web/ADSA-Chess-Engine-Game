/*
 * CheckmateAI - Advanced Chess Engine using DSA
 * move.h - Move representation
 * 
 * DSA Concepts: Struct-based data encoding, bitwise flags
 * Each move is compactly represented with source/destination squares,
 * piece information, and special move flags.
 */

#ifndef MOVE_H
#define MOVE_H

#include <string>
#include <cstdint>

// Piece types
enum PieceType {
    EMPTY = 0,
    PAWN = 1,
    KNIGHT = 2,
    BISHOP = 3,
    ROOK = 4,
    QUEEN = 5,
    KING = 6
};

// Colors
enum Color {
    WHITE = 0,
    BLACK = 1,
    NONE = 2
};

// Combined piece (color + type)
struct Piece {
    PieceType type;
    Color color;
    
    Piece() : type(EMPTY), color(NONE) {}
    Piece(PieceType t, Color c) : type(t), color(c) {}
    
    bool isEmpty() const { return type == EMPTY; }
    bool operator==(const Piece& other) const {
        return type == other.type && color == other.color;
    }
    bool operator!=(const Piece& other) const {
        return !(*this == other);
    }
    
    char toChar() const {
        char c = ' ';
        switch(type) {
            case PAWN: c = 'P'; break;
            case KNIGHT: c = 'N'; break;
            case BISHOP: c = 'B'; break;
            case ROOK: c = 'R'; break;
            case QUEEN: c = 'Q'; break;
            case KING: c = 'K'; break;
            default: return '.';
        }
        return (color == BLACK) ? (c + 32) : c; // lowercase for black
    }
};

// Move flags for special moves
enum MoveFlag {
    NORMAL = 0,
    DOUBLE_PAWN_PUSH = 1,
    KING_CASTLE = 2,
    QUEEN_CASTLE = 3,
    EN_PASSANT = 4,
    PROMOTE_KNIGHT = 5,
    PROMOTE_BISHOP = 6,
    PROMOTE_ROOK = 7,
    PROMOTE_QUEEN = 8
};

/*
 * Move struct - Represents a chess move
 * Stores all information needed to make and unmake a move (backtracking)
 */
struct Move {
    int fromRow, fromCol;
    int toRow, toCol;
    Piece piece;
    Piece capturedPiece;
    MoveFlag flag;
    int score; // For move ordering (Priority Queue)
    
    Move() : fromRow(0), fromCol(0), toRow(0), toCol(0), 
             flag(NORMAL), score(0) {}
    
    Move(int fr, int fc, int tr, int tc, Piece p, Piece cap = Piece(), 
         MoveFlag f = NORMAL)
        : fromRow(fr), fromCol(fc), toRow(tr), toCol(tc),
          piece(p), capturedPiece(cap), flag(f), score(0) {}
    
    bool operator==(const Move& other) const {
        return fromRow == other.fromRow && fromCol == other.fromCol &&
               toRow == other.toRow && toCol == other.toCol &&
               flag == other.flag;
    }
    
    // Convert to algebraic notation (e.g., "e2e4")
    std::string toAlgebraic() const {
        std::string s;
        s += (char)('a' + fromCol);
        s += (char)('1' + fromRow);
        s += (char)('a' + toCol);
        s += (char)('1' + toRow);
        if (flag >= PROMOTE_KNIGHT && flag <= PROMOTE_QUEEN) {
            const char promos[] = "  nbrq";
            s += promos[flag - PROMOTE_KNIGHT + 2];
        }
        return s;
    }
    
    // Parse from algebraic notation
    static Move fromAlgebraic(const std::string& s) {
        Move m;
        if (s.length() >= 4) {
            m.fromCol = s[0] - 'a';
            m.fromRow = s[1] - '1';
            m.toCol = s[2] - 'a';
            m.toRow = s[3] - '1';
            if (s.length() == 5) {
                switch(s[4]) {
                    case 'n': m.flag = PROMOTE_KNIGHT; break;
                    case 'b': m.flag = PROMOTE_BISHOP; break;
                    case 'r': m.flag = PROMOTE_ROOK; break;
                    case 'q': m.flag = PROMOTE_QUEEN; break;
                }
            }
        }
        return m;
    }
    
    // For priority queue comparison (move ordering)
    bool operator<(const Move& other) const {
        return score < other.score; // Max-heap: higher score = higher priority
    }
};

// State information for undo (backtracking)
struct BoardState {
    bool castlingRights[2][2]; // [color][kingside/queenside]
    int enPassantCol;
    int halfMoveClock;
    uint64_t zobristHash;
    Piece capturedPiece;
    MoveFlag moveFlag;
};

#endif // MOVE_H
