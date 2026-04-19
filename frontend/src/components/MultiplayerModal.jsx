/*
 * Multiplayer Modal Component
 * Create/Join multiplayer games
 */

import { useState } from 'react';
import './MultiplayerModal.css';

export default function MultiplayerModal({ 
  onClose, 
  onCreateGame, 
  onJoinGame,
  createdGameId = null,
  isCreating = false,
  isJoining = false,
  errorMessage = '',
}) {
  const [mode, setMode] = useState(null); // 'create', 'join', 'waiting', or null
  const [playerName, setPlayerName] = useState('');
  const [gameId, setGameId] = useState('');
  const [copied, setCopied] = useState(false);

  const openCreateMode = () => {
    setMode('create');
  };

  const openJoinMode = () => {
    setMode('join');
  };

  const handleCreateGame = () => {
    if (playerName.trim()) {
      onCreateGame(playerName);
    }
  };

  const handleJoinGame = () => {
    if (playerName.trim() && gameId.trim()) {
      onJoinGame(gameId.toUpperCase(), playerName);
    }
  };

  const copyGameId = () => {
    navigator.clipboard.writeText(createdGameId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (mode === null) {
    return (
      <div className="modal-overlay">
        <div className="modal-content glass">
          <div className="modal-header">
            <h2>Multiplayer Chess</h2>
          </div>
          <div className="modal-body">
            <p>Play against another human opponent in real-time.</p>
            <div className="modal-buttons">
              <button className="modal-btn create-btn" onClick={openCreateMode}>
                ➕ Create Game
              </button>
              <button className="modal-btn join-btn" onClick={openJoinMode}>
                🔗 Join Game
              </button>
              <button className="modal-btn cancel-btn" onClick={onClose}>
                ✕ Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div className="modal-overlay">
        <div className="modal-content glass">
          <div className="modal-header">
            <h2>Create New Game</h2>
          </div>
          <div className="modal-body">
            {!createdGameId ? (
              <>
                <label className="modal-label">Your Name</label>
                <input
                  type="text"
                  className="modal-input"
                  placeholder="Enter your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateGame()}
                  autoFocus
                  disabled={isCreating}
                />
                <div className="modal-buttons">
                  <button className="modal-btn confirm-btn" onClick={handleCreateGame} disabled={!playerName.trim() || isCreating}>
                    {isCreating ? 'Creating...' : 'Create Game'}
                  </button>
                  <button className="modal-btn cancel-btn" onClick={() => setMode(null)} disabled={isCreating}>
                    Back
                  </button>
                </div>
                {errorMessage && <div className="modal-error">{errorMessage}</div>}
              </>
            ) : (
              <>
                <div className="game-created-content">
                  <div className="success-icon">✅</div>
                  <p className="created-text">Game Created! Share the Game ID with your friend:</p>
                  
                  <div className="game-id-box">
                    <input
                      type="text"
                      className="game-id-input"
                      value={createdGameId}
                      readOnly
                    />
                    <button className="copy-btn" onClick={copyGameId} title="Copy Game ID">
                      {copied ? '✓ Copied!' : '📋 Copy'}
                    </button>
                  </div>

                  <p className="waiting-text">Waiting for opponent to join...</p>
                  <div className="spinner"></div>

                  <div className="share-hint">
                    <strong>Share this:</strong> Game ID: <code>{createdGameId}</code>
                  </div>

                  <button className="modal-btn cancel-btn" onClick={onClose}>
                    Cancel & Go Back
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'join') {
    return (
      <div className="modal-overlay">
        <div className="modal-content glass">
          <div className="modal-header">
            <h2>Join Game</h2>
          </div>
          <div className="modal-body">
            <label className="modal-label">Your Name</label>
            <input
              type="text"
              className="modal-input"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              autoFocus
              disabled={isJoining}
            />
            <label className="modal-label">Game ID</label>
            <input
              type="text"
              className="modal-input game-id-large"
              placeholder="Enter or paste the Game ID"
              value={gameId}
              onChange={(e) => setGameId(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && handleJoinGame()}
              disabled={isJoining}
            />
            <p className="join-hint">Your friend will give you a Game ID to paste here.</p>
            {errorMessage && <div className="modal-error">{errorMessage}</div>}
            <div className="modal-buttons">
              <button className="modal-btn confirm-btn" onClick={handleJoinGame} disabled={!playerName.trim() || !gameId.trim() || isJoining}>
                {isJoining ? 'Joining...' : 'Join Game'}
              </button>
              <button className="modal-btn cancel-btn" onClick={() => setMode(null)} disabled={isJoining}>
                Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
