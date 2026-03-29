import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Chess, Square } from 'chess.js';
import { getPieceSvg } from './ChessPieces';
import { GameState } from '../../../shared/types';
import PromotionDialog from './PromotionDialog';

interface ChessBoardProps {
  gameState: GameState;
  playerColor: 'w' | 'b' | 'spectator' | 'local';
  isFlipped: boolean;
  onMove: (from: string, to: string, promotion?: string) => void;
  disabled?: boolean;
  hintMove?: { from: string; to: string } | null;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export default function ChessBoard({ gameState, playerColor, isFlipped, onMove, disabled, hintMove }: ChessBoardProps) {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const [dragPiece, setDragPiece] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [promotion, setPromotion] = useState<{ from: string; to: string } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const chess = useRef(new Chess());

  // Animated flip: track rendered vs target flip state
  const [renderedFlip, setRenderedFlip] = useState(isFlipped);
  const [flipAnim, setFlipAnim] = useState<'idle' | 'out' | 'in'>('idle');

  useEffect(() => {
    if (isFlipped !== renderedFlip && flipAnim === 'idle') {
      // Start flip-out
      setFlipAnim('out');
      setTimeout(() => {
        // Swap the board mid-animation
        setRenderedFlip(isFlipped);
        setFlipAnim('in');
        setTimeout(() => {
          setFlipAnim('idle');
        }, 500);
      }, 400);
    }
  }, [isFlipped, renderedFlip, flipAnim]);

  useEffect(() => {
    chess.current.load(gameState.fen);
  }, [gameState.fen]);

  const files = renderedFlip ? [...FILES].reverse() : FILES;
  const ranks = renderedFlip ? [...RANKS].reverse() : RANKS;

  const isLocal = playerColor === 'local';
  const currentTurn = gameState.turn;
  // In local mode, both colors can move on their turn
  const canMoveColor = isLocal ? currentTurn : playerColor;
  const isMyTurn = isLocal ? true : playerColor === currentTurn;

  const getSquareFromPoint = useCallback((clientX: number, clientY: number): string | null => {
    if (!boardRef.current) return null;
    const rect = boardRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const squareSize = rect.width / 8;

    const col = Math.floor(x / squareSize);
    const row = Math.floor(y / squareSize);

    if (col < 0 || col > 7 || row < 0 || row > 7) return null;

    return files[col] + ranks[row];
  }, [files, ranks]);

  const getLegalMovesForSquare = useCallback((square: string): string[] => {
    try {
      const moves = chess.current.moves({ square: square as Square, verbose: true });
      return moves.map(m => m.to);
    } catch {
      return [];
    }
  }, []);

  const isPromotionMove = (from: string, to: string): boolean => {
    const piece = chess.current.get(from as Square);
    if (!piece || piece.type !== 'p') return false;
    const toRank = to[1];
    return (piece.color === 'w' && toRank === '8') || (piece.color === 'b' && toRank === '1');
  };

  const tryMove = useCallback((from: string, to: string) => {
    if (disabled || !isMyTurn) return;
    if (isPromotionMove(from, to)) {
      setPromotion({ from, to });
    } else {
      onMove(from, to);
    }
    setSelectedSquare(null);
    setLegalMoves([]);
  }, [disabled, isMyTurn, onMove]);

  const handleSquareClick = useCallback((square: string) => {
    if (disabled || playerColor === 'spectator') return;

    const piece = chess.current.get(square as Square);

    if (selectedSquare) {
      if (legalMoves.includes(square)) {
        tryMove(selectedSquare, square);
        return;
      }
      if (piece && piece.color === canMoveColor) {
        setSelectedSquare(square);
        setLegalMoves(getLegalMovesForSquare(square));
        return;
      }
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    if (piece && piece.color === canMoveColor && isMyTurn) {
      setSelectedSquare(square);
      setLegalMoves(getLegalMovesForSquare(square));
    }
  }, [selectedSquare, legalMoves, canMoveColor, isMyTurn, disabled, playerColor, getLegalMovesForSquare, tryMove]);

  const handlePointerDown = useCallback((e: React.PointerEvent, square: string) => {
    if (disabled || playerColor === 'spectator') return;

    const piece = chess.current.get(square as Square);
    if (!piece || piece.color !== canMoveColor || !isMyTurn) {
      handleSquareClick(square);
      return;
    }

    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragPiece(square);
    setDragPos({ x: e.clientX, y: e.clientY });
    setSelectedSquare(square);
    setLegalMoves(getLegalMovesForSquare(square));
  }, [disabled, playerColor, canMoveColor, isMyTurn, getLegalMovesForSquare, handleSquareClick]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragPiece) return;
    e.preventDefault();
    setDragPos({ x: e.clientX, y: e.clientY });
  }, [dragPiece]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragPiece) return;
    e.preventDefault();

    const targetSquare = getSquareFromPoint(e.clientX, e.clientY);
    if (targetSquare && targetSquare !== dragPiece && legalMoves.includes(targetSquare)) {
      tryMove(dragPiece, targetSquare);
    }

    setDragPiece(null);
    setDragPos(null);
  }, [dragPiece, legalMoves, getSquareFromPoint, tryMove]);

  const handlePromotion = (piece: string) => {
    if (promotion) {
      onMove(promotion.from, promotion.to, piece);
    }
    setPromotion(null);
  };

  const getSquareColor = (file: string, rank: string): boolean => {
    const fileIdx = FILES.indexOf(file);
    const rankIdx = RANKS.indexOf(rank);
    return (fileIdx + rankIdx) % 2 === 0;
  };

  const board = (
    <div className="relative w-full max-w-[min(100vw,100vh-12rem)] mx-auto aspect-square board-container">
      <div className={`w-full h-full board-flipper ${flipAnim === 'out' ? 'flipping' : ''} ${flipAnim === 'in' ? 'flipping-in' : ''}`}>
      <div
        ref={boardRef}
        className="grid grid-cols-8 grid-rows-8 w-full h-full rounded-lg overflow-hidden shadow-2xl border-2 border-amber-900/50"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {ranks.map((rank) =>
          files.map((file) => {
            const square = file + rank;
            const piece = chess.current.get(square as Square);
            const isLight = getSquareColor(file, rank);
            const isSelected = selectedSquare === square;
            const isLegal = legalMoves.includes(square);
            const isLastMove = gameState.lastMove &&
              (square === gameState.lastMove.from || square === gameState.lastMove.to);
            const isKingInCheck = gameState.isCheck && piece?.type === 'k' && piece?.color === gameState.turn;
            const isDragging = dragPiece === square;
            const isHintFrom = hintMove?.from === square;
            const isHintTo = hintMove?.to === square;

            return (
              <div
                key={square}
                className={`
                  relative flex items-center justify-center aspect-square
                  ${isLight ? 'bg-board-light' : 'bg-board-dark'}
                  ${isSelected ? 'ring-4 ring-yellow-400 ring-inset z-10' : ''}
                  ${isLastMove ? 'bg-board-move/60' : ''}
                  ${isKingInCheck ? 'bg-board-check/70' : ''}
                  ${isHintFrom ? 'bg-blue-400/50' : ''}
                  ${isHintTo ? 'bg-blue-500/50' : ''}
                  transition-colors duration-150
                `}
                onClick={() => handleSquareClick(square)}
              >
                {/* Coordinate labels */}
                {file === files[0] && (
                  <span className={`absolute top-0.5 left-0.5 text-[0.55rem] font-bold select-none pointer-events-none ${isLight ? 'text-board-dark' : 'text-board-light'}`}>
                    {rank}
                  </span>
                )}
                {rank === ranks[ranks.length - 1] && (
                  <span className={`absolute bottom-0.5 right-0.5 text-[0.55rem] font-bold select-none pointer-events-none ${isLight ? 'text-board-dark' : 'text-board-light'}`}>
                    {file}
                  </span>
                )}

                {/* Legal move indicator */}
                {isLegal && !piece && (
                  <div className="w-[30%] h-[30%] rounded-full bg-black/20" />
                )}
                {isLegal && piece && (
                  <div className="absolute inset-0 border-[3px] border-black/30 rounded-sm" />
                )}

                {/* Hint indicator */}
                {isHintTo && (
                  <div className="absolute inset-[6%] rounded-full border-[3px] border-blue-400 animate-pulse pointer-events-none z-20" />
                )}

                {/* Piece (SVG) */}
                {piece && !isDragging && (
                  <div
                    className="chess-piece w-[85%] h-[85%] select-none pointer-events-auto"
                    style={{ filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.4))' }}
                    onPointerDown={(e) => handlePointerDown(e, square)}
                    dangerouslySetInnerHTML={{ __html: getPieceSvg(piece.color, piece.type) }}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
      </div>{/* end board-flipper */}

      {/* Promotion dialog */}
      {promotion && (
        <PromotionDialog
          color={isLocal ? currentTurn : (playerColor === 'w' ? 'w' : 'b')}
          onSelect={handlePromotion}
          onCancel={() => setPromotion(null)}
        />
      )}
    </div>
  );

  // Drag ghost rendered via portal to avoid perspective containing block
  const dragGhost = dragPiece && dragPos ? (() => {
    const piece = chess.current.get(dragPiece as Square);
    if (!piece) return null;
    const boardRect = boardRef.current?.getBoundingClientRect();
    const squareSize = boardRect ? boardRect.width / 8 : 60;
    return ReactDOM.createPortal(
      <div
        className="chess-piece dragging fixed pointer-events-none z-[9999]"
        style={{
          left: dragPos.x - squareSize / 2,
          top: dragPos.y - squareSize / 2,
          width: squareSize,
          height: squareSize,
          filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.5))',
        }}
        dangerouslySetInnerHTML={{ __html: getPieceSvg(piece.color, piece.type) }}
      />,
      document.body,
    );
  })() : null;

  return (
    <>
      {board}
      {dragGhost}
    </>
  );
}
