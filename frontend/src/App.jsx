import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Chessboard from './components/Chessboard';
import MoveHistory from './components/MoveHistory';
import ScoreBar from './components/ScoreBar';
import Controls from './components/Controls';
import PerformanceMetrics from './components/PerformanceMetrics';
import MultiplayerModal from './components/MultiplayerModal';
import MultiplayerPanel from './components/MultiplayerPanel';
import CapturedPieces from './components/CapturedPieces';
import AuthScreen from './components/AuthScreen';
import LearnChessPage from './components/LearnChessPage';
import {
  newGame,
  makeMove,
  getAIMove,
  getHintMove,
  getLegalMoves,
  undoMove,
} from './utils/api';
import { clearSession, loadSession } from './utils/auth';
import soundManager from './utils/soundManager';
import MultiplayerClient from './utils/multiplayerClient';
import './App.css';

const LESSON_PROGRESS_KEY = 'checkmateai.lessonProgress';

const INITIAL_BOARD = [
  ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
  ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
  ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
];

const squareToCoords = (square) => ({
  row: Number.parseInt(square[1], 10) - 1,
  col: square.charCodeAt(0) - 97,
});

const coordsToSquare = (row, col) => String.fromCharCode(97 + col) + (row + 1);

const isWhitePiece = (piece) => typeof piece === 'string' && piece >= 'A' && piece <= 'Z';
const isBlackPiece = (piece) => typeof piece === 'string' && piece >= 'a' && piece <= 'z';

// Calculate captured pieces by comparing initial board with current board
const calculateCapturedPieces = (initialBoard, currentBoard) => {
  const whiteCaptured = [];
  const blackCaptured = [];

  // Count pieces in initial board
  const initialPieces = {};
  initialBoard.forEach((row) => {
    row.forEach((piece) => {
      if (piece) {
        initialPieces[piece] = (initialPieces[piece] || 0) + 1;
      }
    });
  });

  // Count pieces in current board
  const currentPieces = {};
  currentBoard.forEach((row) => {
    row.forEach((piece) => {
      if (piece) {
        currentPieces[piece] = (currentPieces[piece] || 0) + 1;
      }
    });
  });

  // Find missing pieces (captured)
  Object.keys(initialPieces).forEach((piece) => {
    const missing = initialPieces[piece] - (currentPieces[piece] || 0);
    if (missing > 0) {
      for (let i = 0; i < missing; i++) {
        if (piece.toUpperCase() === piece) {
          // White piece captured by black
          whiteCaptured.push(piece);
        } else {
          // Black piece captured by white
          blackCaptured.push(piece);
        }
      }
    }
  });

  return { whiteCaptured, blackCaptured };
};

export default function App() {
  const [authUser, setAuthUser] = useState(() => loadSession());
  const [currentView, setCurrentView] = useState('play');
  const [completedLessons, setCompletedLessons] = useState(() => {
    try {
      const raw = window.localStorage.getItem(LESSON_PROGRESS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set();
    }
  });
  const [board, setBoard] = useState(INITIAL_BOARD);
  const [sideToMove, setSideToMove] = useState('white');
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [hoverLegalMoves, setHoverLegalMoves] = useState([]);
  const [moveHistory, setMoveHistory] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [inCheck, setInCheck] = useState(false);
  const [gameStatus, setGameStatus] = useState('ongoing');
  const [evaluation, setEvaluation] = useState(0);
  const [isThinking, setIsThinking] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [difficulty, setDifficulty] = useState(4);
  const [metrics, setMetrics] = useState(null);
  const [theme, setTheme] = useState('dark');
  const [connectionError, setConnectionError] = useState(false);
  const [hintMove, setHintMove] = useState('');
  const [hintLoading, setHintLoading] = useState(false);
  const [keyboardCursor, setKeyboardCursor] = useState('e2');
  const [algebraicInput, setAlgebraicInput] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [moveAnimation, setMoveAnimation] = useState(null);

  const [showMultiplayerModal, setShowMultiplayerModal] = useState(false);
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [multiplayerConnected, setMultiplayerConnected] = useState(false);
  const [multiplayerGameId, setMultiplayerGameId] = useState('');
  const [multiplayerColor, setMultiplayerColor] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [createdGameId, setCreatedGameId] = useState('');
  const [multiplayerError, setMultiplayerError] = useState('');

  const multiplayerRef = useRef(null);
  const multiplayerActionTimeoutRef = useRef(null);

  const currentPlayerColor = isMultiplayer ? multiplayerColor : 'white';

  const updateStateFromResponse = useCallback((data) => {
    if (data.board) setBoard(data.board);
    if (data.sideToMove) setSideToMove(data.sideToMove);
    if (typeof data.inCheck === 'boolean') setInCheck(data.inCheck);
    if (data.gameStatus) setGameStatus(data.gameStatus);
    if (typeof data.evaluation === 'number') setEvaluation(data.evaluation);
    if (Array.isArray(data.moveHistory)) setMoveHistory(data.moveHistory);
  }, []);

  const playMoveSounds = useCallback((capture, state) => {
    if (!soundEnabled) return;
    if (capture) soundManager.captureSound();
    else soundManager.moveSound();

    if (state?.gameStatus === 'checkmate') {
      setTimeout(() => soundManager.checkmateSound(), 200);
    } else if (state?.inCheck) {
      setTimeout(() => soundManager.checkSound(), 200);
    }
  }, [soundEnabled]);

  const runMoveAnimation = useCallback((moveStr, piece, isCapture) => {
    if (!moveStr || moveStr.length < 4 || !piece) return;
    const from = squareToCoords(moveStr.slice(0, 2));
    const to = squareToCoords(moveStr.slice(2, 4));
    setMoveAnimation({
      fromRow: from.row,
      fromCol: from.col,
      toRow: to.row,
      toCol: to.col,
      piece,
      isCapture,
    });
    setTimeout(() => setMoveAnimation(null), 320);
  }, []);

  const persistLessonProgress = useCallback((nextSet) => {
    window.localStorage.setItem(LESSON_PROGRESS_KEY, JSON.stringify([...nextSet]));
  }, []);

  const clearMultiplayerActionTimeout = useCallback(() => {
    if (multiplayerActionTimeoutRef.current) {
      clearTimeout(multiplayerActionTimeoutRef.current);
      multiplayerActionTimeoutRef.current = null;
    }
  }, []);

  const startMultiplayerActionTimeout = useCallback((actionLabel, resetState) => {
    clearMultiplayerActionTimeout();
    multiplayerActionTimeoutRef.current = setTimeout(() => {
      resetState?.();
      setMultiplayerError(
        `${actionLabel} timed out. Check that VITE_WS_URL or VITE_API_BASE_URL points to your deployed backend.`,
      );
      setIsCreating(false);
      setIsJoining(false);
    }, 45000);
  }, [clearMultiplayerActionTimeout]);

  const toggleLessonComplete = useCallback((lessonId) => {
    setCompletedLessons((prev) => {
      const next = new Set(prev);
      if (next.has(lessonId)) next.delete(lessonId);
      else next.add(lessonId);
      persistLessonProgress(next);
      return next;
    });
  }, [persistLessonProgress]);

  const handleViewChange = useCallback((nextView) => {
    setCurrentView(nextView);
    setShowMultiplayerModal(false);
  }, []);

  const handleBackToPlay = useCallback(() => {
    setCurrentView('play');
    setShowMultiplayerModal(false);
  }, []);

  const initGame = useCallback(async (fen = null) => {
    try {
      const result = await newGame(fen);
      if (result.status !== 'ok') {
        setConnectionError(true);
        return;
      }
      setConnectionError(false);
      updateStateFromResponse(result);
      setSelectedSquare(null);
      setLegalMoves([]);
      setHoverLegalMoves([]);
      setLastMove(null);
      setHintMove('');
      setMetrics(null);
      setAlgebraicInput('');
      setKeyboardCursor('e2');
    } catch (err) {
      console.error('Failed to initialize game:', err);
      setConnectionError(true);
    }
  }, [updateStateFromResponse]);

  useEffect(() => {
    if (authUser) initGame();
  }, [authUser, initGame]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    soundManager.setTheme?.(theme);
  }, [theme]);

  const clearHoverMoves = () => {
    if (!selectedSquare) setHoverLegalMoves([]);
  };

  const handleSquareHover = async (square) => {
    if (disabledActions) return;
    if (selectedSquare) return;
    if (isMultiplayer && sideToMove !== multiplayerColor) return;

    const { row, col } = squareToCoords(square);
    const piece = board[row]?.[col];
    const isOwnPiece = currentPlayerColor === 'white' ? isWhitePiece(piece) : isBlackPiece(piece);
    if (!piece || !isOwnPiece) {
      setHoverLegalMoves([]);
      return;
    }

    try {
      const result = await getLegalMoves(square);
      if (result.status === 'ok') {
        setHoverLegalMoves(result.moves || []);
      }
    } catch {
      setHoverLegalMoves([]);
    }
  };

  const requestSquareMoves = async (square) => {
    const result = await getLegalMoves(square);
    if (result.status === 'ok') setLegalMoves(result.moves || []);
  };

  const disabledActions = isThinking || gameStatus !== 'ongoing';

  const applyMoveResponse = useCallback((moveStr, response, movedPiece, capture) => {
    runMoveAnimation(moveStr, movedPiece, capture);
    updateStateFromResponse(response);
    setLastMove(moveStr);
    setSelectedSquare(null);
    setLegalMoves([]);
    setHoverLegalMoves([]);
    setHintMove('');
    playMoveSounds(capture, response);
  }, [playMoveSounds, runMoveAnimation, updateStateFromResponse]);

  const handlePlayerMove = useCallback(async (from, to) => {
    if (disabledActions) return;
    if (isMultiplayer && sideToMove !== multiplayerColor) return;

    const fromCoords = squareToCoords(from);
    const toCoords = squareToCoords(to);
    const movedPiece = board[fromCoords.row]?.[fromCoords.col];
    const capturedPiece = board[toCoords.row]?.[toCoords.col];

    const ownPiece = currentPlayerColor === 'white' ? isWhitePiece(movedPiece) : isBlackPiece(movedPiece);
    if (!ownPiece) return;

    const exactLegalMove = legalMoves.find((m) => m.from === from && m.to === to)?.algebraic;

    let moveStr = exactLegalMove || (from + to);
    if (!exactLegalMove) {
      const isWhitePromotion = movedPiece === 'P' && toCoords.row === 7;
      const isBlackPromotion = movedPiece === 'p' && toCoords.row === 0;
      if (isWhitePromotion || isBlackPromotion) moveStr += 'q';
    }

    if (isMultiplayer && multiplayerRef.current?.isConnected()) {
      multiplayerRef.current.makeMove(moveStr);
      return;
    }

    try {
      const result = await makeMove(moveStr);
      if (result.status !== 'ok') {
        soundManager.illegalMoveSound();
        return;
      }

      applyMoveResponse(moveStr, result, movedPiece, Boolean(capturedPiece));

      if (result.gameStatus === 'ongoing') {
        setIsThinking(true);
        try {
          const aiResult = await getAIMove(difficulty);
          if (aiResult.status === 'ok' && aiResult.aiMove) {
            const aiFrom = squareToCoords(aiResult.aiMove.slice(0, 2));
            const aiTo = squareToCoords(aiResult.aiMove.slice(2, 4));
            const aiPiece = result.board?.[aiFrom.row]?.[aiFrom.col];
            const aiCapture = Boolean(result.board?.[aiTo.row]?.[aiTo.col]);
            applyMoveResponse(aiResult.aiMove, aiResult, aiPiece, aiCapture);
            setMetrics({
              nodesExplored: aiResult.nodesExplored,
              depthReached: aiResult.depthReached,
              timeMs: aiResult.timeMs,
              ttHits: aiResult.ttHits,
              cutoffs: aiResult.cutoffs,
              pv: aiResult.pv,
            });
          }
        } finally {
          setIsThinking(false);
        }
      }
    } catch (err) {
      console.error('Error making move:', err);
      soundManager.illegalMoveSound();
    }
  }, [
    applyMoveResponse,
    board,
    currentPlayerColor,
    difficulty,
    disabledActions,
    isMultiplayer,
    legalMoves,
    multiplayerColor,
    sideToMove,
  ]);

  const handleSquareClick = useCallback(async (square) => {
    if (disabledActions) return;

    if (selectedSquare === square) {
      setSelectedSquare(null);
      setLegalMoves([]);
      setHoverLegalMoves([]);
      return;
    }

    if (selectedSquare && legalMoves.some((m) => m.to === square)) {
      await handlePlayerMove(selectedSquare, square);
      return;
    }

    const { row, col } = squareToCoords(square);
    const piece = board[row]?.[col];

    const isOwnPiece = currentPlayerColor === 'white' ? isWhitePiece(piece) : isBlackPiece(piece);
    const isPlayersTurn = sideToMove === currentPlayerColor;

    if (piece && isPlayersTurn && isOwnPiece) {
      setSelectedSquare(square);
      setHoverLegalMoves([]);
      await requestSquareMoves(square);
    } else {
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  }, [disabledActions, selectedSquare, legalMoves, board, sideToMove, currentPlayerColor, handlePlayerMove]);

  const handlePieceDrop = useCallback(async (from, to) => {
    await handlePlayerMove(from, to);
  }, [handlePlayerMove]);

  const handleUndo = async () => {
    if (disabledActions || moveHistory.length === 0 || isMultiplayer) return;
    try {
      const result = await undoMove(2);
      if (result.status === 'ok') {
        updateStateFromResponse(result);
        setSelectedSquare(null);
        setLegalMoves([]);
        setHoverLegalMoves([]);
        setLastMove(null);
      }
    } catch (err) {
      console.error('Error undoing move:', err);
    }
  };

  const handleHint = async () => {
    if (disabledActions || sideToMove !== 'white') return;
    setHintLoading(true);
    try {
      const result = await getHintMove(difficulty);
      if (result.status === 'ok') setHintMove(result.hintMove || 'No hint available');
    } finally {
      setHintLoading(false);
    }
  };

  const canMoveForMultiplayer = useMemo(() => {
    if (!isMultiplayer) return true;
    return sideToMove === multiplayerColor;
  }, [isMultiplayer, sideToMove, multiplayerColor]);

  const { whiteCaptured, blackCaptured } = useMemo(() => {
    return calculateCapturedPieces(INITIAL_BOARD, board);
  }, [board]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.target?.tagName === 'INPUT' || e.target?.tagName === 'TEXTAREA') return;

      if (e.key === ' ') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
        return;
      }

      if (/^[a-h1-8]$/i.test(e.key) && algebraicInput.length < 4) {
        const next = (algebraicInput + e.key.toLowerCase());
        setAlgebraicInput(next);
        if (next.length === 4) {
          const from = next.slice(0, 2);
          const to = next.slice(2, 4);
          setAlgebraicInput('');
          if (canMoveForMultiplayer) handlePlayerMove(from, to);
        }
        return;
      }

      if (e.key === 'Backspace') {
        setAlgebraicInput((prev) => prev.slice(0, -1));
        return;
      }

      if (e.key === 'Escape') {
        setAlgebraicInput('');
        setSelectedSquare(null);
        setLegalMoves([]);
        setHoverLegalMoves([]);
        return;
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const { row, col } = squareToCoords(keyboardCursor);
        let nr = row;
        let nc = col;
        if (e.key === 'ArrowUp') nr = Math.min(7, row + 1);
        if (e.key === 'ArrowDown') nr = Math.max(0, row - 1);
        if (e.key === 'ArrowLeft') nc = Math.max(0, col - 1);
        if (e.key === 'ArrowRight') nc = Math.min(7, col + 1);
        setKeyboardCursor(coordsToSquare(nr, nc));
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        handleSquareClick(keyboardCursor);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [algebraicInput, keyboardCursor, handleSquareClick, handlePlayerMove, canMoveForMultiplayer]);

  const ensureMultiplayerConnection = async () => {
    if (multiplayerRef.current?.isConnected()) return;

    const client = new MultiplayerClient(
      (event) => {
        if (event.type === 'game_created') {
          clearMultiplayerActionTimeout();
          setMultiplayerConnected(true);
          setMultiplayerGameId(event.gameId || '');
          setCreatedGameId(event.gameId || '');
          setMultiplayerColor(event.playerColor || 'white');
          setIsMultiplayer(true);
          setShowMultiplayerModal(false);
          setMultiplayerError('');
          setChatMessages([
            {
              playerId: 'system',
              playerName: 'System',
              text: `Game created. You are White. Share code ${event.gameId}.`,
              timestamp: Date.now(),
            },
          ]);
          if (event.state) updateStateFromResponse(event.state);
          setIsCreating(false);
          return;
        }

        if (event.type === 'game_joined') {
          clearMultiplayerActionTimeout();
          setMultiplayerConnected(true);
          setMultiplayerGameId(event.gameId || '');
          setMultiplayerColor(event.playerColor || 'black');
          setIsMultiplayer(true);
          setShowMultiplayerModal(false);
          setMultiplayerError('');
          setChatMessages([
            {
              playerId: 'system',
              playerName: 'System',
              text: 'Joined game. You are Black.',
              timestamp: Date.now(),
            },
          ]);
          if (event.state) updateStateFromResponse(event.state);
          setIsJoining(false);
          return;
        }

        if (event.type === 'move') {
          const move = event.move;
          const from = squareToCoords(move.slice(0, 2));
          const piece = board[from.row]?.[from.col] || 'P';
          runMoveAnimation(move, piece, false);
          updateStateFromResponse(event.state);
          setLastMove(move);
          return;
        }
      },
      (msg) => setChatMessages((prev) => [...prev, msg]),
      (payload) => setChatMessages((prev) => [...prev, {
        playerId: 'system',
        playerName: 'System',
        text: `${payload.playerName || 'Opponent'} joined the game.`,
        timestamp: Date.now(),
      }]),
      (payload) => setChatMessages((prev) => [...prev, {
        playerId: 'system',
        playerName: 'System',
        text: `${payload.playerName || 'Opponent'} left the game.`,
        timestamp: Date.now(),
      }]),
      (errorMessage) => {
        setMultiplayerError(errorMessage || 'Multiplayer error');
        setIsCreating(false);
        setIsJoining(false);
      }
    );

    await client.connect();
    multiplayerRef.current = client;
  };

  const createMultiplayerGame = async (playerName) => {
    try {
      setIsCreating(true);
      setMultiplayerError('');
      await ensureMultiplayerConnection();
      startMultiplayerActionTimeout('Creating game', () => {
        setCreatedGameId('');
      });
      multiplayerRef.current.createGame(playerName);
    } catch (err) {
      console.error('Failed to create game:', err);
      setMultiplayerError(err.message || 'Could not start multiplayer. Check the server connection.');
      setIsCreating(false);
    }
  };

  const joinMultiplayerGame = async (gameId, playerName) => {
    try {
      setIsJoining(true);
      setMultiplayerError('');
      await ensureMultiplayerConnection();
      startMultiplayerActionTimeout('Joining game');
      multiplayerRef.current.joinGame(gameId, playerName);
    } catch (err) {
      console.error('Failed to join game:', err);
      setMultiplayerError(err.message || 'Could not join multiplayer. Check the game ID and server connection.');
      setIsJoining(false);
    }
  };

  const leaveMultiplayer = () => {
    clearMultiplayerActionTimeout();
    multiplayerRef.current?.disconnect();
    multiplayerRef.current = null;
    setIsMultiplayer(false);
    setMultiplayerConnected(false);
    setMultiplayerGameId('');
    setMultiplayerColor('');
    setChatMessages([]);
    setIsCreating(false);
    setIsJoining(false);
    setCreatedGameId('');
    setMultiplayerError('');
    initGame();
  };

  useEffect(() => {
    return () => clearMultiplayerActionTimeout();
  }, [clearMultiplayerActionTimeout]);

  const handleLogout = () => {
    clearSession();
    window.location.reload();
  };

  if (!authUser?.user) {
    return <AuthScreen onAuthenticated={setAuthUser} />;
  }

  const signedInUser = authUser.user;

  if (connectionError) {
    return (
      <div className="app">
        <div className="connection-error glass">
          <div className="error-icon">♚</div>
          <h2>Engine Not Connected</h2>
          <p>Make sure the CheckmateAI server is running:</p>
          <code>cd server && node server.js</code>
          <button className="retry-btn" onClick={initGame}>Retry Connection</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-icon">♛</span>
            <h1>CheckmateAI</h1>
          </div>
        </div>

        <div className="header-right">
          <div className="account-chip glass">
            <div className="account-avatar">
              {signedInUser.picture ? (
                <img src={signedInUser.picture} alt={signedInUser.name} />
              ) : (
                <span>{(signedInUser.name || signedInUser.email || 'U').slice(0, 1).toUpperCase()}</span>
              )}
            </div>
            <div className="account-meta">
              <strong>{signedInUser.name}</strong>
              <span>{signedInUser.email}</span>
            </div>
          </div>
          <button className="theme-toggle" onClick={() => setTheme((prev) => prev === 'dark' ? 'light' : 'dark')} title="Toggle Theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button
            className="sound-toggle"
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              soundManager.setEnabled(next);
            }}
            title="Toggle Sound"
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
          <button
            className={`learn-toggle ${currentView === 'learn' ? 'active' : ''}`}
            onClick={() => handleViewChange('learn')}
          >
            🎓 Learn Chess
          </button>
          <button className="multi-toggle" onClick={() => setShowMultiplayerModal(true)}>
            Multiplayer
          </button>
          <button className="logout-button" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      <main className={`app-main ${currentView === 'learn' ? 'learn-mode' : ''}`}>
        {currentView === 'learn' ? (
          <LearnChessPage
            completedLessons={completedLessons}
            onToggleLessonComplete={toggleLessonComplete}
            onBackToPlay={handleBackToPlay}
          />
        ) : (
          <>
            <div className="panel panel-left">
              <Controls
                onNewGame={initGame}
                onUndo={handleUndo}
                onHint={handleHint}
                onFlip={() => setIsFlipped((prev) => !prev)}
                difficulty={difficulty}
                onDifficultyChange={setDifficulty}
                gameStatus={gameStatus}
                sideToMove={sideToMove}
                isThinking={isThinking}
                hintMove={hintMove}
                hintLoading={hintLoading}
              />
              <PerformanceMetrics metrics={metrics} />
            </div>

            <div className="board-area">
              <div className="player-tag opponent">
                <span className="player-dot black-dot" />
                <span>{isMultiplayer ? 'Opponent (Black)' : 'CheckmateAI (Black)'}</span>
                {isThinking && <span className="thinking-indicator">Thinking...</span>}
              </div>

              <div className="board-with-eval">
                <ScoreBar evaluation={evaluation} gameStatus={gameStatus} />
                <Chessboard
                  board={board}
                  legalMoves={legalMoves}
                  hoverLegalMoves={hoverLegalMoves}
                  selectedSquare={selectedSquare}
                  keyboardCursor={keyboardCursor}
                  lastMove={lastMove}
                  inCheck={inCheck}
                  sideToMove={sideToMove}
                  isFlipped={isFlipped}
                  onSquareClick={handleSquareClick}
                  onSquareHover={handleSquareHover}
                  onSquareLeave={clearHoverMoves}
                  onPieceDrop={handlePieceDrop}
                  disabled={disabledActions || !canMoveForMultiplayer}
                  moveAnimation={moveAnimation}
                />
              </div>

              <div className="player-tag player">
                <span className="player-dot white-dot" />
                <span>{isMultiplayer ? 'You' : 'You (White)'}</span>
              </div>

              <div className="kbd-hint">Input: {algebraicInput || '-'} | Keys: arrows navigate, Enter select, Space flip</div>
            </div>

            <div className="panel panel-right">
              <MoveHistory moves={moveHistory} />
              <CapturedPieces
                whiteCaptured={whiteCaptured}
                blackCaptured={blackCaptured}
                isFlipped={isFlipped}
              />
              {isMultiplayer && (
                <MultiplayerPanel
                  connected={multiplayerConnected}
                  gameId={multiplayerGameId}
                  playerColor={multiplayerColor}
                  messages={chatMessages}
                  onSendMessage={(text) => multiplayerRef.current?.sendMessage(text)}
                  onLeave={leaveMultiplayer}
                />
              )}
            </div>
          </>
        )}
      </main>

      <footer className="app-footer">
        <span>Built with C++ Engine and React UI</span>
      </footer>

      {showMultiplayerModal && (
        <MultiplayerModal
          onClose={() => setShowMultiplayerModal(false)}
          onCreateGame={createMultiplayerGame}
          onJoinGame={joinMultiplayerGame}
          createdGameId={createdGameId}
          isCreating={isCreating}
          isJoining={isJoining}
          errorMessage={multiplayerError}
        />
      )}
    </div>
  );
}
