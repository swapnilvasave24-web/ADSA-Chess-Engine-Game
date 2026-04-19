import { useState } from 'react';
import './MultiplayerPanel.css';

export default function MultiplayerPanel({
  connected,
  gameId,
  playerColor,
  messages,
  onSendMessage,
  onLeave,
}) {
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);

  const submit = () => {
    if (!connected) return;
    const clean = text.trim();
    if (!clean) return;
    onSendMessage(clean);
    setText('');
  };

  const copyGameId = () => {
    navigator.clipboard.writeText(gameId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="multiplayer-panel glass">
      <div className="multiplayer-header">
        <span>🎮 Multiplayer</span>
        <button className="leave-btn" onClick={onLeave}>✕ Leave</button>
      </div>

      <div className="game-info-section">
        <div className="status-row">
          <span className={`status-badge ${connected ? 'connected' : 'disconnected'}`}>
            {connected ? '🟢 Connected' : '🔴 Disconnected'}
          </span>
        </div>

        <div className="game-id-section">
          <label className="game-id-label">Game ID:</label>
          <div className="game-id-display">
            <span className="game-id-value">{gameId || '-'}</span>
            <button 
              className="copy-icon-btn" 
              onClick={copyGameId}
              title="Copy Game ID to share with friend"
            >
              {copied ? '✓' : '📋'}
            </button>
          </div>
          <p className="game-id-hint">Share this ID with your friend to invite them</p>
        </div>

        <div className="color-info">
          <span className="label">You are:</span>
          <span className={`color-badge ${playerColor}`}>
            {playerColor === 'white' ? '⚪ White (Host)' : '⚫ Black (Guest)'}
          </span>
        </div>
      </div>

      <div className="chat-section">
        <div className="chat-header">💬 Chat</div>
        <div className="chat-list">
          {messages.length === 0 ? (
            <div className="chat-empty">No messages yet. Start chatting!</div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className="chat-item">
                <span className="msg-player">{msg.playerName || 'Player'}:</span>
                <span className="msg-text">{msg.text}</span>
              </div>
            ))
          )}
        </div>

        <div className="chat-input-row">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={connected ? 'Type message...' : 'Connect to chat...'}
            disabled={!connected}
          />
          <button onClick={submit} className="send-btn" disabled={!connected || !text.trim()}>Send</button>
        </div>
      </div>
    </div>
  );
}
