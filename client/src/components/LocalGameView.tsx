import { useState, useRef, useEffect, useCallback } from 'react';
import ChessBoard from './ChessBoard';
import { ClockDisplay } from './ChessClock';
import { getPieceSymbol } from './ChessPieces';
import { GameState, TimerConfig, TimerState, VariantType } from '../../../shared/types';
import { createRuleEngine, RuleEngine } from '../../../shared/rules';
import { useStockfish } from '../hooks/useStockfish';
import GameSettingsModal from './GameSettingsModal';

interface LocalGameViewProps {
  timerConfig: TimerConfig;
  startFen?: string;
  variant?: VariantType;
  onBack: () => void;
}

export default function LocalGameView({ timerConfig, startFen, variant = 'standard', onBack }: LocalGameViewProps) {
  const engineRef = useRef<RuleEngine>(createRuleEngine({ variant, fen: startFen }));
  const [gameState, setGameState] = useState<GameState>(engineRef.current.buildGameState());
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
  const [showSettings, setShowSettings] = useState(false);
  const [currentVariant, setCurrentVariant] = useState(variant);

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
        const turn = engineRef.current.getTurn();
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
    const engine = engineRef.current;
    const turn = engine.getTurn();

    const move = engine.makeMove({ from, to, promotion });
    if (!move) return;

    clearHint();

    // Add increment (skip during sub-moves)
    if (gameStarted && !engine.hasRemainingSubMoves()) {
      setTimerState(prev => ({
        ...prev,
        [turn === 'w' ? 'white' : 'black']: prev[turn === 'w' ? 'white' : 'black'] + timerConfig.increment * 1000,
      }));
    }

    if (!gameStarted) {
      setGameStarted(true);
      startTimer();
    }

    const newState = engine.buildGameState({ from, to });
    setGameState(newState);

    // Auto-flip board (only when turn actually changes)
    if (autoFlip && !engine.hasRemainingSubMoves()) {
      setIsFlipped(engine.getTurn() === 'b');
    }

    if (engine.isGameOver()) {
      stopTimer();
      const result = engine.getGameOverResult();
      setGameOver({
        winner: result.winner || 'draw',
        reason: result.reason || 'Unentschieden',
      });
    }
  }, [gameStarted, autoFlip, timerConfig.increment, startTimer, stopTimer, clearHint]);

  const handleResign = () => {
    stopTimer();
    const loser = engineRef.current.getTurn();
    setGameOver({ winner: loser === 'w' ? 'b' : 'w', reason: 'Aufgabe' });
    setShowResignConfirm(false);
  };

  const handleNewGame = () => {
    stopTimer();
    engineRef.current = createRuleEngine({ variant: currentVariant });
    setGameState(engineRef.current.buildGameState());
    setTimerState({
      white: timerConfig.initialTime * 1000,
      black: timerConfig.initialTime * 1000,
    });
    setGameOver(null);
    setGameStarted(false);
    setIsFlipped(false);
    setShowResignConfirm(false);
  };

  const applySettings = (settings: { whiteTime?: number; blackTime?: number; turn?: 'w' | 'b'; variant?: VariantType }) => {
    if (settings.whiteTime !== undefined || settings.blackTime !== undefined) {
      setTimerState(prev => ({
        white: settings.whiteTime ?? prev.white,
        black: settings.blackTime ?? prev.black,
      }));
    }

    const needsEngineReset = settings.turn !== undefined || settings.variant !== undefined;
    if (needsEngineReset) {
      const currentFen = engineRef.current.getFen();
      const newVariant = settings.variant ?? currentVariant;

      let fen = currentFen;
      if (settings.turn) {
        const parts = fen.split(' ');
        parts[1] = settings.turn;
        fen = parts.join(' ');
      }

      engineRef.current = createRuleEngine({ variant: newVariant, fen });
      setCurrentVariant(newVariant);
      setGameState(engineRef.current.buildGameState());
    }
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
        ruleEngine={engineRef.current}
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
            onClick={() => !hintLoading && getHintMove(engineRef.current.getFen(), 12)}
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

        {/* Settings */}
        <button
          onClick={() => setShowSettings(true)}
          className="py-2 px-3 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium rounded-lg transition-colors shadow-md flex items-center gap-1.5"
          title="Einstellungen"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </button>

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

      {/* Settings Modal */}
      {showSettings && (
        <GameSettingsModal
          whiteTime={timerState.white}
          blackTime={timerState.black}
          currentTurn={gameState.turn}
          variant={currentVariant}
          onApply={applySettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
