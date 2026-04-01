/*
 * CheckmateAI - Controls Component
 * Game controls: new game, undo, redo, difficulty, flip
 */

import './Controls.css';

export default function Controls({
    onNewGame,
    onUndo,
    onHint,
    onFlip,
    difficulty,
    onDifficultyChange,
    gameStatus,
    sideToMove,
    isThinking,
    hintMove,
    hintLoading
}) {
    const difficultyLevels = [
        { value: 2, label: 'Easy', desc: 'Depth 2' },
        { value: 4, label: 'Medium', desc: 'Depth 4' },
        { value: 6, label: 'Hard', desc: 'Depth 6' },
    ];

    const getStatusText = () => {
        if (isThinking) return '🤔 AI is thinking...';
        if (gameStatus === 'checkmate') {
            return sideToMove === 'white' ? '🏆 Black wins by checkmate!' : '🏆 White wins by checkmate!';
        }
        if (gameStatus === 'stalemate') return '🤝 Stalemate - Draw!';
        if (gameStatus === 'draw') return '🤝 Draw!';
        return sideToMove === 'white' ? "⬜ White's turn" : "⬛ Black's turn";
    };

    return (
        <div className="controls glass">
            {/* Status */}
            <div className={`game-status ${isThinking ? 'thinking' : ''} ${gameStatus !== 'ongoing' && gameStatus ? 'game-over' : ''}`}>
                {getStatusText()}
            </div>

            {/* Difficulty Selector */}
            <div className="control-section">
                <label className="control-label">Difficulty</label>
                <div className="difficulty-selector">
                    {difficultyLevels.map(level => (
                        <button
                            key={level.value}
                            className={`difficulty-btn ${difficulty === level.value ? 'active' : ''}`}
                            onClick={() => onDifficultyChange(level.value)}
                            title={level.desc}
                        >
                            {level.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="control-section">
                <div className="action-buttons">
                    <button className="action-btn new-game-btn" onClick={onNewGame} title="New Game">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                        </svg>
                        New Game
                    </button>

                    <button className="action-btn" onClick={onUndo} title="Undo Move" disabled={isThinking}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                        </svg>
                        Undo
                    </button>

                    <button className="action-btn hint-btn" onClick={onHint} title="Get Hint" disabled={isThinking || hintLoading || sideToMove !== 'white' || gameStatus !== 'ongoing'}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 18h6" />
                            <path d="M10 22h4" />
                            <path d="M12 2a7 7 0 0 0-4 12.7c.6.4 1 1 1.2 1.7h5.6c.2-.7.6-1.3 1.2-1.7A7 7 0 0 0 12 2z" />
                        </svg>
                        {hintLoading ? 'Hinting...' : 'Hint Move'}
                    </button>

                    <button className="action-btn" onClick={onFlip} title="Flip Board">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
                            <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
                        </svg>
                        Flip
                    </button>
                </div>
            </div>

            <div className="control-section">
                <label className="control-label">Hint</label>
                <div className="hint-output">
                    {hintMove ? `Suggested move: ${hintMove}` : 'Request a hint to see the best move.'}
                </div>
            </div>
        </div>
    );
}
