import { useState } from 'react';
import './LearnChessPage.css';

const TABS = [
  { key: 'pieces', label: 'Chess Pieces', icon: '♞' },
  { key: 'notation', label: 'Notation Guide', icon: '⌘' },
  { key: 'history', label: 'Famous Players & History', icon: '♛' },
  { key: 'rules', label: 'Chess Rules & Regulations', icon: '⚖' },
];

const PIECE_CARDS = [
  {
    id: 'piece-king',
    icon: '♔',
    title: 'King',
    value: '∞',
    bullets: [
      'Moves exactly 1 square in any direction.',
      'Cannot move into check.',
      'Special ability: castling with a rook under legal castling conditions.',
    ],
  },
  {
    id: 'piece-queen',
    icon: '♕',
    title: 'Queen',
    value: '9',
    bullets: [
      'Moves any number of squares vertically, horizontally, or diagonally.',
      'Most powerful piece due to combined rook + bishop movement.',
      'Cannot jump over pieces.',
    ],
  },
  {
    id: 'piece-rook',
    icon: '♖',
    title: 'Rook',
    value: '5',
    bullets: [
      'Moves any number of squares along files and ranks.',
      'Excels on open files and the seventh rank.',
      'Special role: castling partner with the king.',
    ],
  },
  {
    id: 'piece-bishop',
    icon: '♗',
    title: 'Bishop',
    value: '3',
    bullets: [
      'Moves any number of squares diagonally.',
      'Always stays on the same color squares.',
      'Bishop pair can dominate long diagonals.',
    ],
  },
  {
    id: 'piece-knight',
    icon: '♘',
    title: 'Knight',
    value: '3',
    bullets: [
      'Moves in an L-shape: 2 squares one way + 1 square perpendicular.',
      'Can jump over other pieces.',
      'Creates forks and tactical threats from outposts.',
    ],
  },
  {
    id: 'piece-pawn',
    icon: '♙',
    title: 'Pawn',
    value: '1',
    bullets: [
      'Moves forward 1 square; from starting square can move 2.',
      'Captures one square diagonally forward.',
      'Special rules: en passant and promotion on the final rank.',
    ],
  },
];

const NOTATION_CARDS = [
  {
    id: 'notation-piece-letters',
    symbol: 'K Q R B N',
    title: 'Piece Letters',
    detail: 'Moves start with a piece letter: K king, Q queen, R rook, B bishop, N knight. Pawns use no letter.',
  },
  {
    id: 'notation-basic-move',
    symbol: 'e4 / Nf3',
    title: 'How To Read A Move',
    detail: 'Square-only move like e4 means a pawn moved there. Nf3 means the knight moved to f3.',
  },
  {
    id: 'notation-capture',
    symbol: 'x',
    title: 'Capture Symbol',
    detail: 'The symbol x means capture. Example: Bxe6 means bishop captures on e6.',
  },
  {
    id: 'notation-check',
    symbol: '+',
    title: 'Check',
    detail: 'A plus sign means the move gives check. Example: Qh7+ checks the king.',
  },
  {
    id: 'notation-mate',
    symbol: '#',
    title: 'Checkmate',
    detail: 'A hash symbol means checkmate. Example: Qh7# ends the game immediately.',
  },
  {
    id: 'notation-castle-short',
    symbol: 'O-O',
    title: 'Kingside Castling',
    detail: 'King castles toward the h-file rook. The king moves two squares toward that rook.',
  },
  {
    id: 'notation-castle-long',
    symbol: 'O-O-O',
    title: 'Queenside Castling',
    detail: 'King castles toward the a-file rook. The king moves two squares toward that rook.',
  },
  {
    id: 'notation-promotion',
    symbol: 'e8=Q',
    title: 'Promotion',
    detail: 'A pawn reaching the final rank must promote. Example e8=Q means promotion to queen.',
  },
];

const HISTORY_CARDS = [
  {
    id: 'history-magnus',
    portrait: 'MC',
    name: 'Magnus Carlsen',
    era: 'Modern Era (2004-present)',
    peak: 'Peak Rating: 2882',
    legend: 'Known for squeezing wins from equal endgames and dominating elite events for over a decade.',
  },
  {
    id: 'history-fischer',
    portrait: 'BF',
    name: 'Bobby Fischer',
    era: 'Cold War Era (1956-1972)',
    peak: 'World Champion (1972)',
    legend: 'Famous for defeating Boris Spassky in 1972 and igniting a global chess boom.',
  },
  {
    id: 'history-kasparov',
    portrait: 'GK',
    name: 'Garry Kasparov',
    era: '1980s-2000s',
    peak: 'Peak Rating: 2851',
    legend: 'One of history’s greatest attackers; world champion for 15 years.',
  },
  {
    id: 'history-morphy',
    portrait: 'PM',
    name: 'Paul Morphy',
    era: 'Romantic Era (1850s)',
    peak: 'Unofficial World No.1',
    legend: 'Known for The Opera Game, a masterpiece of development and tactical punishment.',
  },
];

const RULE_CARDS = [
  {
    id: 'rule-50-move',
    visual: '50',
    title: '50-Move Rule',
    detail: 'If 50 consecutive moves pass with no pawn move and no capture, either player may claim a draw.',
  },
  {
    id: 'rule-threefold',
    visual: '3x',
    title: 'Threefold Repetition',
    detail: 'If the same position appears three times with the same player to move and legal options, a draw can be claimed.',
  },
  {
    id: 'rule-stalemate-checkmate',
    visual: '♚',
    title: 'Stalemate vs Checkmate',
    detail: 'Checkmate ends in a win for the attacking side. Stalemate is a draw when no legal move exists but the king is not in check.',
  },
  {
    id: 'rule-touch-move',
    visual: '✋',
    title: 'Touch-Move Rule',
    detail: 'In over-the-board chess, if you touch your own piece with intent, you must move it if legal.',
  },
  {
    id: 'rule-time-controls',
    visual: '⏱',
    title: 'Time Controls',
    detail: 'Common formats include Classical, Rapid, Blitz, and Bullet. Running out of time usually loses unless the opponent has insufficient mating material.',
  },
];

const CARD_SETS = {
  pieces: PIECE_CARDS,
  notation: NOTATION_CARDS,
  history: HISTORY_CARDS,
  rules: RULE_CARDS,
};

function Flashcard({ cardId, seen, onSeen, front, back }) {
  const [flipped, setFlipped] = useState(false);

  const handleFlip = () => {
    setFlipped((prev) => !prev);
    if (!seen) onSeen(cardId);
  };

  return (
    <button
      type="button"
      className={`flashcard ${flipped ? 'flipped' : ''} ${seen ? 'seen' : ''}`}
      onClick={handleFlip}
      aria-label="Flip learning card"
    >
      <div className="flashcard-inner">
        <div className="flashcard-face flashcard-front glass">
          {front}
        </div>
        <div className="flashcard-face flashcard-back glass">
          {back}
        </div>
      </div>
    </button>
  );
}

function SectionProgress({ activeSection, seenBySection }) {
  return (
    <div className="section-progress glass">
      {TABS.map((tab) => {
        const total = CARD_SETS[tab.key].length;
        const seenCount = seenBySection[tab.key]?.size || 0;
        return (
          <div key={tab.key} className={`section-progress-item ${activeSection === tab.key ? 'active' : ''}`}>
            <div className="progress-item-head">
              <span>{tab.label}</span>
              <strong>{seenCount}/{total}</strong>
            </div>
            <div className="progress-dots" aria-hidden="true">
              {CARD_SETS[tab.key].map((item, index) => (
                <span
                  key={item.id}
                  className={`dot ${(seenBySection[tab.key]?.has(item.id) || false) ? 'filled' : ''} ${(activeSection === tab.key && index === seenCount) ? 'current' : ''}`}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function LearnChessPage() {
  const [activeSection, setActiveSection] = useState('pieces');
  const [seenBySection, setSeenBySection] = useState({
    pieces: new Set(),
    notation: new Set(),
    history: new Set(),
    rules: new Set(),
  });

  const markSeen = (sectionKey, cardId) => {
    setSeenBySection((prev) => {
      const current = prev[sectionKey];
      if (current.has(cardId)) return prev;
      const nextSet = new Set(current);
      nextSet.add(cardId);
      return { ...prev, [sectionKey]: nextSet };
    });
  };

  return (
    <div className="learn-page">
      <nav className="learn-tabs" aria-label="Learn Chess sections">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`learn-tab ${activeSection === tab.key ? 'active' : ''}`}
            onClick={() => setActiveSection(tab.key)}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      <SectionProgress activeSection={activeSection} seenBySection={seenBySection} />

      <section className="flashcard-grid">
        {activeSection === 'pieces' && PIECE_CARDS.map((card) => (
          <Flashcard
            key={card.id}
            cardId={card.id}
            seen={seenBySection.pieces.has(card.id)}
            onSeen={(id) => markSeen('pieces', id)}
            front={(
              <div className="card-front-piece">
                <span className="front-piece-icon">{card.icon}</span>
                <h3>{card.title}</h3>
                <p>Point Value</p>
                <strong>{card.value}</strong>
              </div>
            )}
            back={(
              <div className="card-back-content">
                <h4>{card.title} Movement Rules</h4>
                <ul>
                  {card.bullets.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            )}
          />
        ))}

        {activeSection === 'notation' && NOTATION_CARDS.map((card) => (
          <Flashcard
            key={card.id}
            cardId={card.id}
            seen={seenBySection.notation.has(card.id)}
            onSeen={(id) => markSeen('notation', id)}
            front={(
              <div className="card-front-notation">
                <span className="notation-symbol">{card.symbol}</span>
                <h3>{card.title}</h3>
              </div>
            )}
            back={(
              <div className="card-back-content">
                <h4>{card.title}</h4>
                <p>{card.detail}</p>
              </div>
            )}
          />
        ))}

        {activeSection === 'history' && HISTORY_CARDS.map((card) => (
          <Flashcard
            key={card.id}
            cardId={card.id}
            seen={seenBySection.history.has(card.id)}
            onSeen={(id) => markSeen('history', id)}
            front={(
              <div className="card-front-history">
                <span className="history-portrait">{card.portrait}</span>
                <h3>{card.name}</h3>
                <p>{card.era}</p>
                <strong>{card.peak}</strong>
              </div>
            )}
            back={(
              <div className="card-back-content">
                <h4>{card.name}</h4>
                <p>{card.legend}</p>
              </div>
            )}
          />
        ))}

        {activeSection === 'rules' && RULE_CARDS.map((card) => (
          <Flashcard
            key={card.id}
            cardId={card.id}
            seen={seenBySection.rules.has(card.id)}
            onSeen={(id) => markSeen('rules', id)}
            front={(
              <div className="card-front-rule">
                <span className="rule-visual">{card.visual}</span>
                <span className="rule-chip">Rule</span>
                <h3>{card.title}</h3>
              </div>
            )}
            back={(
              <div className="card-back-content">
                <h4>{card.title}</h4>
                <p>{card.detail}</p>
              </div>
            )}
          />
        ))}
      </section>
    </div>
  );
}
