/*
 * CheckmateAI - API Utility
 * Communicates with the Node.js backend
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: { 'Content-Type': 'application/json' },
            ...options,
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`API Error [${endpoint}]:`, error);
        return { status: 'error', message: error.message };
    }
}

export async function newGame(fen = null) {
    return apiCall('/game/new', {
        method: 'POST',
        body: JSON.stringify(fen ? { fen } : {}),
    });
}

export async function makeMove(move) {
    return apiCall('/game/move', {
        method: 'POST',
        body: JSON.stringify({ move }),
    });
}

export async function getAIMove(depth = 4) {
    return apiCall('/game/ai-move', {
        method: 'POST',
        body: JSON.stringify({ depth }),
    });
}

export async function getHintMove(depth = 4) {
    return apiCall('/game/hint', {
        method: 'POST',
        body: JSON.stringify({ depth }),
    });
}

export async function getLegalMoves(square) {
    const query = square ? `?square=${square}` : '';
    return apiCall(`/game/legal-moves${query}`);
}

export async function undoMove(count = 2) {
    return apiCall('/game/undo', {
        method: 'POST',
        body: JSON.stringify({ count }),
    });
}

export async function getGameState() {
    return apiCall('/game/state');
}

export async function healthCheck() {
    return apiCall('/health');
}
