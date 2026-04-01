/*
 * CheckmateAI - Captured Pieces Component
 * Displays the pieces captured by each player during the game.
 */

import './CapturedPieces.css';

const PIECE_SYMBOLS = {
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
};

const PIECE_VALUES = {
  P: 1, p: 1,
  N: 3, n: 3,
  B: 3, b: 3,
  R: 5, r: 5,
  Q: 9, q: 9,
  K: 0, k: 0,
};

const PIECE_ORDER = ['q', 'r', 'b', 'n', 'p'];

export default function CapturedPieces({ whiteCaptured, blackCaptured, isFlipped }) {
  const renderPieces = (pieces, isWhiteCaptures) => {
    // Sort pieces by value (descending) for better visual hierarchy
    const sortedPieces = [...pieces].sort((a, b) => {
      const valA = PIECE_VALUES[b];
      const valB = PIECE_VALUES[a];
      if (valA !== valB) return valA - valB;
      return PIECE_ORDER.indexOf(b) - PIECE_ORDER.indexOf(a);
    });

    // Calculate total value
    const totalValue = sortedPieces.reduce((sum, p) => sum + PIECE_VALUES[p], 0);

    return (
      <div className={`captured-section ${isWhiteCaptures ? 'white-captures' : 'black-captures'}`}>
        <div className="captured-pieces">
          {sortedPieces.length > 0 ? (
            sortedPieces.map((piece, idx) => (
              <span key={idx} className="captured-piece">
                {PIECE_SYMBOLS[piece]}
              </span>
            ))
          ) : (
            <span className="no-captures">-</span>
          )}
        </div>
        <div className="material-value">
          +{totalValue} {totalValue === 1 ? 'pt' : 'pts'}
        </div>
      </div>
    );
  };

  return (
    <div className="captured-pieces-container">
      {/* Black pieces captured by white (shown at bottom by default, or top if flipped) */}
      <div className={`captures-area ${isFlipped ? 'flipped' : ''}`}>
        <div className="captures-label white-label">♟ Captured by White</div>
        {renderPieces(blackCaptured, true)}
      </div>

      {/* White pieces captured by black (shown at top by default, or bottom if flipped) */}
      <div className={`captures-area ${isFlipped ? 'flipped' : ''}`}>
        <div className="captures-label black-label">♙ Captured by Black</div>
        {renderPieces(whiteCaptured, false)}
      </div>
    </div>
  );
}
