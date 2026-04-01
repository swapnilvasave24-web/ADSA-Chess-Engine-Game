/*
 * CheckmateAI - Chessboard Component
 * Interactive board with drag-and-drop, hover highlights, and move animations.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import './Chessboard.css';

const PIECE_SYMBOLS = {
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
};

const squareToCoords = (square) => ({
  row: Number.parseInt(square[1], 10) - 1,
  col: square.charCodeAt(0) - 97,
});

const coordsToSquare = (row, col) => String.fromCharCode(97 + col) + (row + 1);

export default function Chessboard({
  board,
  legalMoves,
  hoverLegalMoves,
  selectedSquare,
  keyboardCursor,
  lastMove,
  inCheck,
  sideToMove,
  isFlipped,
  onSquareClick,
  onSquareHover,
  onSquareLeave,
  onPieceDrop,
  disabled,
  moveAnimation,
}) {
  const [draggedPiece, setDraggedPiece] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [cellSize, setCellSize] = useState(72);
  const boardRef = useRef(null);

  useEffect(() => {
    if (!boardRef.current) return;

    const updateSize = () => {
      const width = boardRef.current?.getBoundingClientRect().width || 576;
      setCellSize(width / 8);
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(boardRef.current);
    window.addEventListener('resize', updateSize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  const activeLegalMoves = legalMoves?.length ? legalMoves : (hoverLegalMoves || []);

  const lastMoveCoords = useMemo(() => {
    if (!lastMove || lastMove.length < 4) return null;
    return {
      from: squareToCoords(lastMove.slice(0, 2)),
      to: squareToCoords(lastMove.slice(2, 4)),
    };
  }, [lastMove]);

  const cursorCoords = useMemo(() => {
    if (!keyboardCursor) return null;
    return squareToCoords(keyboardCursor);
  }, [keyboardCursor]);

  const animationStyle = useMemo(() => {
    if (!moveAnimation) return null;

    const fromDisplayRow = isFlipped ? moveAnimation.fromRow : 7 - moveAnimation.fromRow;
    const fromDisplayCol = isFlipped ? 7 - moveAnimation.fromCol : moveAnimation.fromCol;
    const toDisplayRow = isFlipped ? moveAnimation.toRow : 7 - moveAnimation.toRow;
    const toDisplayCol = isFlipped ? 7 - moveAnimation.toCol : moveAnimation.toCol;

    const cell = cellSize;
    const dx = (toDisplayCol - fromDisplayCol) * cell;
    const dy = (toDisplayRow - fromDisplayRow) * cell;

    return {
      left: fromDisplayCol * cell,
      top: fromDisplayRow * cell,
      transform: `translate(${dx}px, ${dy}px)`,
    };
  }, [moveAnimation, isFlipped, cellSize]);

  const getSquareColor = (row, col) => ((row + col) % 2 === 0 ? 'dark' : 'light');

  const isLegalTarget = (row, col) =>
    activeLegalMoves.some((m) => {
      const to = squareToCoords(m.to);
      return to.row === row && to.col === col;
    });

  const isCaptureTarget = (row, col) =>
    activeLegalMoves.some((m) => {
      const to = squareToCoords(m.to);
      return to.row === row && to.col === col && m.isCapture;
    });

  const isSelected = (row, col) => {
    if (!selectedSquare) return false;
    const sel = squareToCoords(selectedSquare);
    return sel.row === row && sel.col === col;
  };

  const isLastMoveSquare = (row, col) => {
    if (!lastMoveCoords) return false;
    return (
      (lastMoveCoords.from.row === row && lastMoveCoords.from.col === col) ||
      (lastMoveCoords.to.row === row && lastMoveCoords.to.col === col)
    );
  };

  const isCursorSquare = (row, col) => {
    if (!cursorCoords) return false;
    return cursorCoords.row === row && cursorCoords.col === col;
  };

  const isKingInCheck = (row, col) => {
    if (!inCheck || !board) return false;
    const piece = board[row]?.[col];
    if (!piece) return false;
    return sideToMove === 'white' ? piece === 'K' : piece === 'k';
  };

  const isAnimatingFromSquare = (row, col) =>
    !!moveAnimation && moveAnimation.fromRow === row && moveAnimation.fromCol === col;

  const isAnimationCaptureSquare = (row, col) =>
    !!moveAnimation && moveAnimation.isCapture && moveAnimation.toRow === row && moveAnimation.toCol === col;

  const handleDragStart = (e, row, col) => {
    if (disabled) return;
    const piece = board[row]?.[col];
    if (!piece) return;
    setDraggedPiece({ row, col, piece });
    e.dataTransfer.effectAllowed = 'move';
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
    onSquareClick(coordsToSquare(row, col));
  };

  const handleDrop = (e, row, col) => {
    e.preventDefault();
    setDragOver(null);
    if (!draggedPiece || !onPieceDrop) return;
    onPieceDrop(coordsToSquare(draggedPiece.row, draggedPiece.col), coordsToSquare(row, col));
    setDraggedPiece(null);
  };

  const renderSquare = (viewRow, viewCol) => {
    const actualRow = isFlipped ? viewRow : 7 - viewRow;
    const actualCol = isFlipped ? 7 - viewCol : viewCol;
    const piece = board?.[actualRow]?.[actualCol] || '';

    let className = `square ${getSquareColor(actualRow, actualCol)}`;
    if (isSelected(actualRow, actualCol)) className += ' selected';
    if (isLastMoveSquare(actualRow, actualCol)) className += ' last-move';
    if (isKingInCheck(actualRow, actualCol)) className += ' in-check';
    if (dragOver && dragOver.row === viewRow && dragOver.col === viewCol) className += ' drag-over';
    if (isCursorSquare(actualRow, actualCol)) className += ' keyboard-cursor';
    if (isAnimationCaptureSquare(actualRow, actualCol)) className += ' capture-burst';

    const showFile = viewRow === 7;
    const showRank = viewCol === 0;

    return (
      <div
        key={`${viewRow}-${viewCol}`}
        className={className}
        onClick={() => onSquareClick(coordsToSquare(actualRow, actualCol))}
        onMouseEnter={() => onSquareHover?.(coordsToSquare(actualRow, actualCol))}
        onMouseLeave={() => onSquareLeave?.()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver({ row: viewRow, col: viewCol });
        }}
        onDrop={(e) => handleDrop(e, actualRow, actualCol)}
      >
        {showRank && <span className="rank-label">{actualRow + 1}</span>}
        {showFile && <span className="file-label">{String.fromCharCode(97 + actualCol)}</span>}

        {isLegalTarget(actualRow, actualCol) && !piece && <div className="legal-move-dot" />}
        {isLegalTarget(actualRow, actualCol) && piece && isCaptureTarget(actualRow, actualCol) && (
          <div className="capture-ring" />
        )}

        {piece && !isAnimatingFromSquare(actualRow, actualCol) && (
          <div
            className={`piece ${draggedPiece?.row === actualRow && draggedPiece?.col === actualCol ? 'dragging' : ''}`}
            draggable={!disabled}
            onDragStart={(e) => handleDragStart(e, actualRow, actualCol)}
            onDragEnd={() => {
              setDraggedPiece(null);
              setDragOver(null);
            }}
          >
            {PIECE_SYMBOLS[piece]}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="chessboard-container">
      <div className="chessboard" ref={boardRef}>
        {Array.from({ length: 8 }, (_, viewRow) => (
          <div key={viewRow} className="board-row">
            {Array.from({ length: 8 }, (_, viewCol) => renderSquare(viewRow, viewCol))}
          </div>
        ))}

        {moveAnimation && animationStyle && (
          <div className="animated-piece" style={animationStyle}>
            {PIECE_SYMBOLS[moveAnimation.piece]}
          </div>
        )}
      </div>
    </div>
  );
}
