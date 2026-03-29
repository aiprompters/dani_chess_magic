import { useState, useCallback } from 'react';

interface StockfishResult {
  from: string;
  to: string;
  san: string;
  eval: number;
  mate: number | null;
  promotion: string | false;
}

const API_URL = 'https://chess-api.com/v1';

function sanitizeFen(fen: string): string {
  const parts = fen.split(' ');
  if (parts.length < 4) return fen;

  const board = parts[0];
  const ranks = board.split('/');

  // Find king and rook positions to validate castling rights
  let whiteKingOnE1 = false;
  let blackKingOnE8 = false;
  let whiteRookA1 = false;
  let whiteRookH1 = false;
  let blackRookA8 = false;
  let blackRookH8 = false;

  const getPieceAt = (rank: string, targetCol: number): string | null => {
    let col = 0;
    for (const ch of rank) {
      if (ch >= '1' && ch <= '8') {
        col += parseInt(ch);
      } else {
        if (col === targetCol) return ch;
        col++;
      }
    }
    return null;
  };

  // Rank 1 (index 7 in FEN), Rank 8 (index 0 in FEN)
  if (ranks.length === 8) {
    const rank1 = ranks[7];
    const rank8 = ranks[0];
    whiteKingOnE1 = getPieceAt(rank1, 4) === 'K';
    whiteRookA1 = getPieceAt(rank1, 0) === 'R';
    whiteRookH1 = getPieceAt(rank1, 7) === 'R';
    blackKingOnE8 = getPieceAt(rank8, 4) === 'k';
    blackRookA8 = getPieceAt(rank8, 0) === 'r';
    blackRookH8 = getPieceAt(rank8, 7) === 'r';
  }

  // Fix castling rights
  let castling = '';
  const origCastling = parts[2];
  if (origCastling.includes('K') && whiteKingOnE1 && whiteRookH1) castling += 'K';
  if (origCastling.includes('Q') && whiteKingOnE1 && whiteRookA1) castling += 'Q';
  if (origCastling.includes('k') && blackKingOnE8 && blackRookH8) castling += 'k';
  if (origCastling.includes('q') && blackKingOnE8 && blackRookA8) castling += 'q';

  parts[2] = castling || '-';
  return parts.join(' ');
}

export function useStockfish() {
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<StockfishResult | null>(null);

  const getMove = useCallback(async (fen: string, depth: number = 12): Promise<StockfishResult | null> => {
    setLoading(true);
    setHint(null);
    try {
      const safeFen = sanitizeFen(fen);
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen: safeFen, depth, maxThinkingTime: 100 }),
      });
      const data = await res.json();
      if (data.type === 'error') {
        console.error('Stockfish error:', data.text);
        return null;
      }
      const result: StockfishResult = {
        from: data.from,
        to: data.to,
        san: data.san,
        eval: data.eval,
        mate: data.mate,
        promotion: data.promotion,
      };
      setHint(result);
      return result;
    } catch (err) {
      console.error('Stockfish API error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearHint = useCallback(() => setHint(null), []);

  return { getMove, loading, hint, clearHint };
}

// Map depth to difficulty
export const DIFFICULTY_LEVELS = [
  { label: 'Anfänger', depth: 1, description: 'Sehr leicht' },
  { label: 'Leicht', depth: 4, description: 'Gelegenheitsspieler' },
  { label: 'Mittel', depth: 8, description: 'Herausfordernd' },
  { label: 'Schwer', depth: 12, description: 'Fortgeschritten' },
  { label: 'Experte', depth: 16, description: 'Sehr stark' },
];
