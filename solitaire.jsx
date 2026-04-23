import { useState, useCallback, useEffect } from "react";

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const RED_SUITS = ["♥", "♦"];

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, faceUp: false, id: `${rank}${suit}` });
    }
  }
  return deck;
}

function shuffle(deck) {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function rankValue(rank) {
  return RANKS.indexOf(rank);
}

function isRed(suit) {
  return RED_SUITS.includes(suit);
}

function canPlaceOnTableau(card, targetCard) {
  if (!targetCard) return card.rank === "K";
  return (
    isRed(card.suit) !== isRed(targetCard.suit) &&
    rankValue(card.rank) === rankValue(targetCard.rank) - 1
  );
}

function canPlaceOnFoundation(card, topCard, suit) {
  if (card.suit !== suit) return false;
  if (!topCard) return card.rank === "A";
  return rankValue(card.rank) === rankValue(topCard.rank) + 1;
}

function initGame() {
  const deck = shuffle(createDeck());
  const tableau = Array.from({ length: 7 }, () => []);
  let idx = 0;
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row <= col; row++) {
      tableau[col].push({ ...deck[idx++], faceUp: row === col });
    }
  }
  const stock = deck.slice(idx).map(c => ({ ...c, faceUp: false }));
  return {
    tableau,
    foundation: [[], [], [], []],
    stock,
    waste: [],
    moves: 0,
    won: false,
  };
}

const SUIT_ORDER = ["♠", "♥", "♦", "♣"];

function Card({ card, style, onClick, onDragStart, draggable, small }) {
  const red = isRed(card.suit);
  const size = small ? { width: 44, height: 62, fontSize: 13 } : { width: 64, height: 90, fontSize: 16 };
  
  if (!card.faceUp) {
    return (
      <div
        style={{
          ...size,
          borderRadius: 6,
          background: "linear-gradient(135deg, #1a3a6b 0%, #0d2244 100%)",
          border: "2px solid #2a5298",
          cursor: "default",
          flexShrink: 0,
          boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.03) 4px, rgba(255,255,255,0.03) 8px)`,
          ...style,
        }}
      />
    );
  }

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onClick}
      style={{
        ...size,
        borderRadius: 6,
        background: "linear-gradient(160deg, #fffef8 0%, #f0ede0 100%)",
        border: "1.5px solid #c8bfa0",
        cursor: draggable ? "grab" : onClick ? "pointer" : "default",
        flexShrink: 0,
        boxShadow: "0 3px 10px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.8)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "3px 4px",
        userSelect: "none",
        color: red ? "#c0392b" : "#1a1a2e",
        position: "relative",
        ...style,
      }}
    >
      <div style={{ fontSize: size.fontSize, fontWeight: 700, lineHeight: 1, fontFamily: "'Georgia', serif" }}>
        {card.rank}
        <span style={{ fontSize: size.fontSize - 2 }}>{card.suit}</span>
      </div>
      <div style={{ fontSize: size.fontSize + 4, textAlign: "center", lineHeight: 1 }}>{card.suit}</div>
      <div style={{ fontSize: size.fontSize, fontWeight: 700, lineHeight: 1, transform: "rotate(180deg)", fontFamily: "'Georgia', serif" }}>
        {card.rank}
        <span style={{ fontSize: size.fontSize - 2 }}>{card.suit}</span>
      </div>
    </div>
  );
}

function EmptySlot({ label, onClick, onDrop, onDragOver, children, style }) {
  return (
    <div
      onClick={onClick}
      onDrop={onDrop}
      onDragOver={onDragOver}
      style={{
        width: 64, height: 90,
        borderRadius: 6,
        border: "2px dashed rgba(255,255,255,0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "rgba(255,255,255,0.3)",
        fontSize: 11,
        fontFamily: "'Georgia', serif",
        cursor: onClick ? "pointer" : "default",
        flexShrink: 0,
        background: "rgba(0,0,0,0.15)",
        ...style,
      }}
    >
      {children || label}
    </div>
  );
}

export default function Solitaire() {
  const [game, setGame] = useState(() => initGame());
  const [drag, setDrag] = useState(null); // { from, cards }
  const [hintCard, setHintCard] = useState(null);

  const { tableau, foundation, stock, waste, moves, won } = game;

  function update(fn) {
    setGame(g => {
      const next = fn(JSON.parse(JSON.stringify(g)));
      // check win
      if (next.foundation.every(f => f.length === 13)) next.won = true;
      return next;
    });
  }

  function drawCard() {
    update(g => {
      if (g.stock.length === 0) {
        g.stock = g.waste.reverse().map(c => ({ ...c, faceUp: false }));
        g.waste = [];
      } else {
        const card = g.stock.pop();
        card.faceUp = true;
        g.waste.push(card);
        g.moves++;
      }
      return g;
    });
  }

  function autoFoundation(card, fromCol, fromIdx) {
    const fi = SUIT_ORDER.indexOf(card.suit);
    update(g => {
      const top = g.foundation[fi].slice(-1)[0];
      if (canPlaceOnFoundation(card, top, card.suit)) {
        if (fromCol === "waste") {
          g.waste.pop();
        } else {
          g.tableau[fromCol].splice(fromIdx, 1);
          if (g.tableau[fromCol].length > 0) g.tableau[fromCol].slice(-1)[0].faceUp = true;
        }
        g.foundation[fi].push({ ...card, faceUp: true });
        g.moves++;
      }
      return g;
    });
  }

  function handleWasteClick() {
    if (waste.length === 0) return;
    const card = waste[waste.length - 1];
    // try foundation first on double click - handled separately, just select
    autoFoundation(card, "waste", -1);
  }

  function handleTableauClick(col, idx) {
    const col_cards = tableau[col];
    const card = col_cards[idx];
    if (!card || !card.faceUp) return;
    if (idx === col_cards.length - 1) {
      autoFoundation(card, col, idx);
    }
  }

  function startDrag(e, cards, from) {
    setDrag({ from, cards });
    e.dataTransfer.effectAllowed = "move";
  }

  function dropOnTableau(e, col) {
    e.preventDefault();
    if (!drag) return;
    const { from, cards } = drag;
    const targetCol = tableau[col];
    const targetTop = targetCol.slice(-1)[0];
    if (!canPlaceOnTableau(cards[0], targetTop)) { setDrag(null); return; }
    update(g => {
      if (from.type === "waste") {
        g.waste.pop();
      } else if (from.type === "tableau") {
        g.tableau[from.col].splice(from.idx);
        if (g.tableau[from.col].length > 0) g.tableau[from.col].slice(-1)[0].faceUp = true;
      } else if (from.type === "foundation") {
        g.foundation[from.fi].pop();
      }
      g.tableau[col].push(...cards.map(c => ({ ...c, faceUp: true })));
      g.moves++;
      return g;
    });
    setDrag(null);
  }

  function dropOnFoundation(e, fi) {
    e.preventDefault();
    if (!drag || drag.cards.length !== 1) { setDrag(null); return; }
    const card = drag.cards[0];
    const top = foundation[fi].slice(-1)[0];
    if (!canPlaceOnFoundation(card, top, SUIT_ORDER[fi])) { setDrag(null); return; }
    const { from } = drag;
    update(g => {
      if (from.type === "waste") g.waste.pop();
      else if (from.type === "tableau") {
        g.tableau[from.col].splice(from.idx);
        if (g.tableau[from.col].length > 0) g.tableau[from.col].slice(-1)[0].faceUp = true;
      }
      g.foundation[fi].push({ ...card, faceUp: true });
      g.moves++;
      return g;
    });
    setDrag(null);
  }

  const isMobile = typeof window !== "undefined" && window.innerWidth < 600;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #1a4a2e 0%, #0d3320 50%, #0a2518 100%)",
      fontFamily: "'Georgia', serif",
      padding: "16px 8px",
      userSelect: "none",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, maxWidth: 520, margin: "0 auto 16px" }}>
        <div>
          <div style={{ color: "#d4af7a", fontSize: 22, fontWeight: 700, letterSpacing: 2 }}>SOLITAIRE</div>
          <div style={{ color: "rgba(212,175,122,0.6)", fontSize: 12 }}>手数: {moves}</div>
        </div>
        <button
          onClick={() => setGame(initGame())}
          style={{
            background: "linear-gradient(135deg, #d4af7a, #b8935a)",
            border: "none",
            borderRadius: 8,
            padding: "8px 16px",
            color: "#1a1a0a",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: 13,
            fontFamily: "'Georgia', serif",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}
        >
          新しいゲーム
        </button>
      </div>

      {won && (
        <div style={{
          textAlign: "center",
          padding: "24px",
          background: "rgba(212,175,122,0.15)",
          border: "2px solid #d4af7a",
          borderRadius: 12,
          color: "#d4af7a",
          maxWidth: 520,
          margin: "0 auto 16px",
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>クリア！</div>
          <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 12 }}>{moves}手でクリアしました</div>
          <button onClick={() => setGame(initGame())} style={{
            background: "#d4af7a", border: "none", borderRadius: 8,
            padding: "10px 24px", fontWeight: 700, cursor: "pointer", fontFamily: "'Georgia', serif",
          }}>もう一度</button>
        </div>
      )}

      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        {/* Top row: stock, waste, foundation */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12, alignItems: "flex-start" }}>
          {/* Stock */}
          <div onClick={drawCard} style={{ cursor: "pointer" }}>
            {stock.length > 0 ? (
              <Card card={{ faceUp: false, suit: "♠", rank: "A" }} />
            ) : (
              <EmptySlot label="↺" onClick={drawCard} style={{ fontSize: 24, color: "rgba(255,255,255,0.4)" }} />
            )}
          </div>

          {/* Waste */}
          <div>
            {waste.length > 0 ? (
              <Card
                card={waste[waste.length - 1]}
                draggable
                onDragStart={e => startDrag(e, [waste[waste.length - 1]], { type: "waste" })}
                onClick={handleWasteClick}
              />
            ) : (
              <EmptySlot label="" />
            )}
          </div>

          <div style={{ flex: 1 }} />

          {/* Foundation */}
          {SUIT_ORDER.map((suit, fi) => {
            const top = foundation[fi].slice(-1)[0];
            return (
              <div
                key={suit}
                onDrop={e => dropOnFoundation(e, fi)}
                onDragOver={e => e.preventDefault()}
              >
                {top ? (
                  <Card
                    card={top}
                    draggable
                    onDragStart={e => startDrag(e, [top], { type: "foundation", fi })}
                  />
                ) : (
                  <EmptySlot
                    style={{ fontSize: 22, color: "rgba(255,255,255,0.25)" }}
                    onDrop={e => dropOnFoundation(e, fi)}
                    onDragOver={e => e.preventDefault()}
                  >
                    {suit}
                  </EmptySlot>
                )}
              </div>
            );
          })}
        </div>

        {/* Tableau */}
        <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
          {tableau.map((col, ci) => (
            <div
              key={ci}
              style={{ flex: 1, position: "relative", minHeight: 90 }}
              onDrop={e => dropOnTableau(e, ci)}
              onDragOver={e => e.preventDefault()}
            >
              {col.length === 0 ? (
                <EmptySlot
                  style={{ width: "100%", maxWidth: 64 }}
                  onDrop={e => dropOnTableau(e, ci)}
                  onDragOver={e => e.preventDefault()}
                />
              ) : (
                <div style={{ position: "relative" }}>
                  {col.map((card, idx) => (
                    <div
                      key={card.id}
                      style={{
                        position: idx === 0 ? "relative" : "absolute",
                        top: idx === 0 ? 0 : idx * (card.faceUp ? 22 : 14),
                        left: 0,
                        zIndex: idx,
                      }}
                    >
                      <Card
                        card={card}
                        draggable={card.faceUp}
                        onDragStart={card.faceUp ? e => startDrag(e, col.slice(idx), { type: "tableau", col: ci, idx }) : undefined}
                        onClick={() => handleTableauClick(ci, idx)}
                        style={{ width: "100%", maxWidth: 64, minWidth: 44 }}
                      />
                    </div>
                  ))}
                  {/* Spacer for stacked cards */}
                  <div style={{
                    height: (col.length - 1) * (col.slice(-1)[0]?.faceUp ? 22 : 14) + 90,
                    visibility: "hidden",
                    pointerEvents: "none",
                  }} />
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 11, textAlign: "center", marginTop: 20 }}>
          カードをドラッグして動かすか、タップして自動で移動
        </div>
      </div>
    </div>
  );
}
