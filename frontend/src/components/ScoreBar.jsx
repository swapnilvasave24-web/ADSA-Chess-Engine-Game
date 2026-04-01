/*
 * CheckmateAI - Score Bar Component
 * Visual evaluation bar showing advantage
 */

import './ScoreBar.css';

export default function ScoreBar({ evaluation, gameStatus }) {
    // Convert centipawn evaluation to percentage (sigmoid-like)
    const clampedEval = Math.max(-1500, Math.min(1500, evaluation || 0));
    const whitePercent = 50 + (clampedEval / 30); // ~50% ± advantage
    const clampedPercent = Math.max(5, Math.min(95, whitePercent));

    const getEvalText = () => {
        if (gameStatus === 'checkmate') return '# ';
        if (gameStatus === 'stalemate' || gameStatus === 'draw') return '½-½';

        const absEval = Math.abs(evaluation || 0);
        if (absEval > 9000) {
            return evaluation > 0 ? 'M' : '-M';
        }
        const pawns = (evaluation / 100).toFixed(1);
        return evaluation >= 0 ? `+${pawns}` : pawns;
    };

    const advantage = (evaluation || 0) >= 0 ? 'white' : 'black';

    return (
        <div className="score-bar-container">
            <div className="score-bar">
                <div
                    className="score-bar-white"
                    style={{ height: `${clampedPercent}%` }}
                >
                    {advantage === 'white' && (
                        <span className="eval-text white-eval">{getEvalText()}</span>
                    )}
                </div>
                <div
                    className="score-bar-black"
                    style={{ height: `${100 - clampedPercent}%` }}
                >
                    {advantage === 'black' && (
                        <span className="eval-text black-eval">{getEvalText()}</span>
                    )}
                </div>
            </div>
        </div>
    );
}
