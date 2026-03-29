import { useState, useRef, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import ChessBoard from './ChessBoard';
import { ClockDisplay } from './ChessClock';
import { getPieceSymbol } from './ChessPieces';
import { GameState, TimerConfig, TimerState } from '../../../shared/types';
import { useStockfish } from '../hooks/useStockfish';

interface LocalGameViewProps {
  timerConfig: TimerConfig;
  onBack: () => void;
}

export default function LocalGameView({ timerConfig, onBack }: LocalGameViewProps) {
  const chessRef = useRef(new Chess());
  const [gameState, setGameState] = useState<GameState>(buildGameState(chessRef.current));
  const { getMove: getHintMove, loading: hintLoading, hint, clearHint } = useStockfish();
  const [timerState, setTimerState] = useState<TimerState>({
    white: timerConfig.initialTime * 1000,
    black: timerConfig.initialTime * 1000,
  });
  const [isFlipped, setIsFlipped] = useState(false);
  const [autoFlip, setAutoFlip] = useState(false);
  const [gameOver, setGameOver] = useState<{ winner: 'w' | 'b' | 'draw'; reason: string } | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [showResignConfirm, setShowResignConfirm] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTickRef = useRef(0);
  const timerStateRef = useRef(timerState);
  timerStateRef.current = timerState;

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    lastTickRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastTickRef.current;
      lastTickRef.current = now;

      setTimerState(prev => {
        const turn = chessRef.current.turn();
        const updated = { ...prev };
        if (turn === 'w') {
          updated.white = Math.max(0, prev.white - elapsed);
        } else {
          updated.black = Math.max(0, prev.black - elapsed);
        }

        if (updated.white <= 0 || updated.black <= 0) {
          stopTimer();
          const loser = updated.white <= 0 ? 'w' : 'b';
          setGameOver({
            winner: loser === 'w' ? 'b' : 'w',
            reason: 'Zeit abgelaufen',
          });
        }

        return updated;
      });
    }, 100);
  }, [stopTimer]);

  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  const handleMove = useCallback((from: string, to: string, promotion?: string) => {
    const chess = chessRef.current;
    const turn = chess.turn();

    try {
      const move = chess.move({ from, to, promotion: promotion || 'q' });
      if (!move) return;

      clearHint();

      // Add increment
      if (gameStarted) {
        setTimerState(prev => ({
          ...prev,
          [turn === 'w' ? 'white' : 'black']: prev[turn === 'w' ? 'white' : 'black'] + timerConfig.increment * 1000,
        }));
      }

      if (!gameStarted) {
        setGameStarted(true);
        startTimer();
      }

      const newState = buildGameState(chess, { from, to });
      setGameState(newState);

      // Auto-flip board
      if (autoFlip) {
        setIsFlipped(chess.turn() === 'b');
      }

      if (newState.isGameOver) {
        stopTimer();
        if (newState.isCheckmate) {
          setGameOver({ winner: turn, reason: 'Schachmatt' });
        } else if (newState.isStalemate) {
          setGameOver({ winner: 'draw', reason: 'Patt' });
        } else {
          setGameOver({ winner: 'draw', reason: 'Unentschieden' });
        }
      }
    } catch {
      // invalid move
    }
  }, [gameStarted, autoFlip, timerConfig.increment, startTimer, stopTimer]);

  const handleResign = () => {
    stopTimer();
    const loser = chessRef.current.turn();
    setGameOver({ winner: loser === 'w' ? 'b' : 'w', reason: 'Aufgabe' });
    setShowResignConfirm(false);
  };

  const handleNewGame = () => {
    stopTimer();
    chessRef.current = new Chess();
    setGameState(buildGameState(chessRef.current));
    setTimerState({
      white: timerConfig.initialTime * 1000,
      black: timerConfig.initialTime * 1000,
    });
    setGameOver(null);
    setGameStarted(false);
    setIsFlipped(false);
    setShowResignConfirm(false);
  };

  const topColor = isFlipped ? 'w' : 'b';
  const bottomColor = isFlipped ? 'b' : 'w';
  const topTime = topColor === 'w' ? timerState.white : timerState.black;
  const bottomTime = bottomColor === 'w' ? timerState.white : timerState.black;
  const isTopActive = !gameOver && gameState.turn === topColor;
  const isBottomActive = !gameOver && gameState.turn === bottomColor;

  const getStatusText = () => {
    if (gameOver) {
      if (gameOver.winner === 'draw') return `Unentschieden - ${gameOver.reason}`;
      const winnerLabel = gameOver.winner === 'w' ? 'Weiß' : 'Schwarz';
      return `${winnerLabel} gewinnt - ${gameOver.reason}`;
    }
    if (gameState.isCheck) {
      return `${gameState.turn === 'w' ? 'Weiß' : 'Schwarz'} ist im Schach!`;
    }
    return `${gameState.turn === 'w' ? 'Weiß' : 'Schwarz'} ist am Zug`;
  };

  const renderCaptured = (color: 'w' | 'b') => {
    const pieces = gameState.capturedPieces[color];
    if (pieces.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-0.5 text-lg opacity-70">
        {pieces.sort().map((p, i) => (
          <span key={i}>{getPieceSymbol(color === 'w' ? 'b' : 'w', p)}</span>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-2 sm:p-4 gap-2">
      {/* Status */}
      <div className="w-full max-w-[min(100vw,100vh-12rem)] mx-auto">
        <div className={`text-center text-sm font-medium py-1.5 rounded-lg mb-2 ${
          gameOver
            ? gameOver.winner === 'draw'
              ? 'bg-gray-600/30 text-gray-300'
              : 'bg-green-600/30 text-green-300'
            : gameState.isCheck
              ? 'bg-red-600/20 text-red-300'
              : 'bg-gray-800/40 text-gray-300'
        }`}>
          {getStatusText()}
        </div>
      </div>

      {/* Opponent timer */}
      <div className="w-full max-w-[min(100vw,100vh-12rem)] mx-auto flex items-center gap-2">
        <div className="flex-1">
          <ClockDisplay
            time={topTime}
            active={isTopActive}
            low={topTime < 30000}
            label={topColor === 'w' ? 'Weiß' : 'Schwarz'}
          />
        </div>
        <div className="min-w-[60px]">{renderCaptured(topColor)}</div>
      </div>

      {/* Board */}
      <ChessBoard
        gameState={gameState}
        playerColor="local"
        isFlipped={isFlipped}
        onMove={handleMove}
        disabled={!!gameOver}
        hintMove={hint ? { from: hint.from, to: hint.to } : null}
      />

      {/* Player timer */}
      <div className="w-full max-w-[min(100vw,100vh-12rem)] mx-auto flex items-center gap-2">
        <div className="flex-1">
          <ClockDisplay
            time={bottomTime}
            active={isBottomActive}
            low={bottomTime < 30000}
            label={bottomColor === 'w' ? 'Weiß' : 'Schwarz'}
          />
        </div>
        <div className="min-w-[60px]">{renderCaptured(bottomColor)}</div>
      </div>

      {/* Actions */}
      <div className="w-full max-w-[min(100vw,100vh-12rem)] mx-auto flex gap-2 mt-1">
        {/* Flip button */}
        <button
          onClick={() => setIsFlipped(!isFlipped)}
          className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors shadow-md flex items-center gap-1.5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
          Drehen
        </button>

        {/* Auto-flip toggle */}
        <button
          onClick={() => setAutoFlip(!autoFlip)}
          className={`py-2 px-3 text-sm font-medium rounded-lg transition-colors shadow-md flex items-center gap-1.5 ${
            autoFlip
              ? 'bg-amber-500 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M3 12a9 9 0 0 1 9 9"/></svg>
          Auto
        </button>

        {/* Hint */}
        {!gameOver && (
          <button
            onClick={() => !hintLoading && getHintMove(chessRef.current.fen(), 12)}
            disabled={hintLoading}
            className={`py-2 px-4 text-sm font-medium rounded-lg transition-colors shadow-md flex items-center gap-1.5 ${
              hintLoading
                ? 'bg-blue-800 text-blue-300 animate-pulse'
                : hint
                  ? 'bg-blue-500 text-white'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            {hintLoading ? 'Denke...' : hint ? `Tipp: ${hint.san}` : 'Tipp'}
          </button>
        )}

        {!gameOver ? (
          showResignConfirm ? (
            <>
              <button
                onClick={handleResign}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Bestätigen
              </button>
              <button
                onClick={() => setShowResignConfirm(false)}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Abbrechen
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowResignConfirm(true)}
              className="flex-1 py-2 bg-gray-800/60 hover:bg-gray-700/60 text-gray-400 text-sm font-medium rounded-lg transition-colors border border-gray-700/50"
            >
              Aufgeben
            </button>
          )
        ) : (
          <>
            <button
              onClick={handleNewGame}
              className="flex-1 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-bold rounded-lg shadow-lg transition-all active:scale-[0.98]"
            >
              Neues Spiel
            </button>
            <button
              onClick={onBack}
              className="py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Menü
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function buildGameState(chess: Chess, lastMove?: { from: string; to: string }): GameState {
  return {
    fen: chess.fen(),
    turn: chess.turn() as 'w' | 'b',
    isCheck: chess.isCheck(),
    isCheckmate: chess.isCheckmate(),
    isStalemate: chess.isStalemate(),
    isDraw: chess.isDraw(),
    isGameOver: chess.isGameOver(),
    lastMove,
    capturedPieces: getCapturedPieces(chess),
  };
}

function getCapturedPieces(chess: Chess): { w: string[]; b: string[] } {
  const history = chess.history({ verbose: true });
  const captured: { w: string[]; b: string[] } = { w: [], b: [] };
  for (const move of history) {
    if (move.captured) {
      captured[move.color].push(move.captured);
    }
  }
  return captured;
}
