/*
 * CheckmateAI - Move History Component
 * Displays moves in algebraic notation
 */

import { useEffect, useRef } from 'react';
import './MoveHistory.css';

export default function MoveHistory({ moves }) {
    const listRef = useRef(null);

    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [moves]);

    // Group moves into pairs (white and black)
    const movePairs = [];
    if (moves && moves.length > 0) {
        for (let i = 0; i < moves.length; i += 2) {
            movePairs.push({
                number: Math.floor(i / 2) + 1,
                white: moves[i],
                black: i + 1 < moves.length ? moves[i + 1] : null,
            });
        }
    }

    return (
        <div className="move-history glass">
            <div className="move-history-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                </svg>
                <span>Move History</span>
            </div>
            <div className="move-list" ref={listRef}>
                {movePairs.length === 0 ? (
                    <div className="no-moves">No moves yet. Make your first move!</div>
                ) : (
                    movePairs.map((pair, idx) => (
                        <div
                            key={idx}
                            className={`move-pair ${idx === movePairs.length - 1 ? 'latest' : ''}`}
                        >
                            <span className="move-number">{pair.number}.</span>
                            <span className="move white-move">{pair.white}</span>
                            <span className="move black-move">{pair.black || ''}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
