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

export function useStockfish() {
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<StockfishResult | null>(null);

  const getMove = useCallback(async (fen: string, depth: number = 12): Promise<StockfishResult | null> => {
    setLoading(true);
    setHint(null);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen, depth, maxThinkingTime: 100 }),
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
