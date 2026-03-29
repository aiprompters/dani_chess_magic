import { useState } from 'react';
import ChessBoard from './ChessBoard';
import { ClockDisplay } from './ChessClock';
import { getPieceSymbol } from './ChessPieces';
import { GameState, TimerState } from '../../../shared/types';
import { useStockfish } from '../hooks/useStockfish';

interface GameViewProps {
  gameState: GameState;
  timerState: TimerState;
  playerColor: 'w' | 'b' | 'spectator';
  roomId: string;
  opponentJoined: boolean;
  gameOver: { winner: 'w' | 'b' | 'draw'; reason: string } | null;
  onMove: (from: string, to: string, promotion?: string) => void;
  onResign: () => void;
}

export default function GameView({
  gameState,
  timerState,
  playerColor,
  roomId,
  opponentJoined,
  gameOver,
  onMove,
  onResign,
}: GameViewProps) {
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFlipped, setIsFlipped] = useState(playerColor === 'b');
  const { getMove: getHintMove, loading: hintLoading, hint, clearHint } = useStockfish();

  const topColor = isFlipped ? 'w' : 'b';
  const bottomColor = isFlipped ? 'b' : 'w';
  const topTime = topColor === 'w' ? timerState.white : timerState.black;
  const bottomTime = bottomColor === 'w' ? timerState.white : timerState.black;

  const isTopActive = !gameOver && gameState.turn === topColor;
  const isBottomActive = !gameOver && gameState.turn === bottomColor;

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusText = () => {
    if (gameOver) {
      if (gameOver.winner === 'draw') return `Unentschieden - ${gameOver.reason}`;
      const winnerLabel = gameOver.winner === 'w' ? 'Weiß' : 'Schwarz';
      return `${winnerLabel} gewinnt - ${gameOver.reason}`;
    }
    if (!opponentJoined) return 'Warte auf Gegner...';
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
      {/* Room code + status */}
      <div className="w-full max-w-[min(100vw,100vh-12rem)] mx-auto">
        {!opponentJoined && !gameOver && (
          <div className="bg-amber-600/20 border border-amber-600/40 rounded-xl p-3 mb-2 text-center">
            <p className="text-sm text-amber-200 mb-2">Teile diesen Code mit deinem Gegner:</p>
            <button
              onClick={copyRoomCode}
              className="bg-gray-800 px-6 py-2 rounded-lg font-mono text-2xl tracking-[0.3em] text-amber-400 hover:bg-gray-700 transition-colors active:scale-95"
            >
              {roomId}
            </button>
            <p className="text-xs text-gray-400 mt-1">{copied ? 'Kopiert!' : 'Klicken zum Kopieren'}</p>
          </div>
        )}

        {/* Status */}
        <div className={`text-center text-sm font-medium py-1.5 rounded-lg mb-2 ${
          gameOver
            ? gameOver.winner === playerColor
              ? 'bg-green-600/30 text-green-300'
              : gameOver.winner === 'draw'
                ? 'bg-gray-600/30 text-gray-300'
                : 'bg-red-600/30 text-red-300'
            : gameState.isCheck
              ? 'bg-red-600/20 text-red-300'
              : 'bg-gray-800/40 text-gray-300'
        }`}>
          {getStatusText()}
        </div>
      </div>

      {/* Opponent timer + captured */}
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
        playerColor={playerColor}
        isFlipped={isFlipped}
        onMove={(from, to, promo) => { clearHint(); onMove(from, to, promo); }}
        disabled={!!gameOver || !opponentJoined}
        hintMove={hint ? { from: hint.from, to: hint.to } : null}
      />

      {/* Player timer + captured */}
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

        {/* Hint */}
        {!gameOver && opponentJoined && playerColor !== 'spectator' && gameState.turn === playerColor && (
          <button
            onClick={() => !hintLoading && getHintMove(gameState.fen, 12)}
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

        {!gameOver && opponentJoined && playerColor !== 'spectator' && (
          showResignConfirm ? (
            <>
              <button
                onClick={onResign}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Aufgeben bestätigen
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
        )}

        {gameOver && (
          <button
            onClick={() => window.location.reload()}
            className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.98]"
          >
            Neues Spiel
          </button>
        )}
      </div>
    </div>
  );
}
