import { useState, useRef, useCallback } from 'react';
import { Chess, Square } from 'chess.js';
import { getPieceSvg, getPieceSymbol } from './ChessPieces';

interface BoardEditorProps {
  fen: string; // piece placement only (8 ranks)
  onChange: (fen: string) => void;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

const PALETTE_PIECES = [
  { color: 'w', type: 'k' }, { color: 'w', type: 'q' }, { color: 'w', type: 'r' },
  { color: 'w', type: 'b' }, { color: 'w', type: 'n' }, { color: 'w', type: 'p' },
  { color: 'b', type: 'k' }, { color: 'b', type: 'q' }, { color: 'b', type: 'r' },
  { color: 'b', type: 'b' }, { color: 'b', type: 'n' }, { color: 'b', type: 'p' },
];

// Parse FEN piece placement into a 8x8 board array
function fenToBoard(fen: string): (string | null)[][] {
  const rows = fen.split('/');
  return rows.map(row => {
    const cells: (string | null)[] = [];
    for (const ch of row) {
      if (ch >= '1' && ch <= '8') {
        for (let i = 0; i < parseInt(ch); i++) cells.push(null);
      } else {
        cells.push(ch);
      }
    }
    return cells;
  });
}

// Convert 8x8 board array back to FEN piece placement
function boardToFen(board: (string | null)[][]): string {
  return board.map(row => {
    let fen = '';
    let empty = 0;
    for (const cell of row) {
      if (cell === null) {
        empty++;
      } else {
        if (empty > 0) { fen += empty; empty = 0; }
        fen += cell;
      }
    }
    if (empty > 0) fen += empty;
    return fen;
  }).join('/');
}

function getPieceAt(board: (string | null)[][], file: number, rank: number): { color: string; type: string } | null {
  const ch = board[rank]?.[file];
  if (!ch) return null;
  const color = ch === ch.toUpperCase() ? 'w' : 'b';
  return { color, type: ch.toLowerCase() };
}

export default function BoardEditor({ fen, onChange }: BoardEditorProps) {
  const [board, setBoard] = useState(() => fenToBoard(fen));
  const [selectedPalette, setSelectedPalette] = useState<{ color: string; type: string } | null>(null);
  const [dragFrom, setDragFrom] = useState<{ file: number; rank: number } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const updateBoard = useCallback((newBoard: (string | null)[][]) => {
    setBoard(newBoard);
    onChange(boardToFen(newBoard));
  }, [onChange]);

  const handleSquareClick = (fileIdx: number, rankIdx: number) => {
    const newBoard = board.map(r => [...r]);

    if (selectedPalette) {
      // Place piece from palette
      const ch = selectedPalette.color === 'w'
        ? selectedPalette.type.toUpperCase()
        : selectedPalette.type.toLowerCase();
      newBoard[rankIdx][fileIdx] = ch;
      updateBoard(newBoard);
      return;
    }

    // Click on existing piece = remove it
    if (newBoard[rankIdx][fileIdx]) {
      newBoard[rankIdx][fileIdx] = null;
      updateBoard(newBoard);
    }
  };

  const handleDragStart = (fileIdx: number, rankIdx: number) => {
    if (board[rankIdx][fileIdx]) {
      setDragFrom({ file: fileIdx, rank: rankIdx });
      setSelectedPalette(null);
    }
  };

  const handleDrop = (fileIdx: number, rankIdx: number) => {
    if (!dragFrom) return;
    if (dragFrom.file === fileIdx && dragFrom.rank === rankIdx) {
      setDragFrom(null);
      return;
    }

    const newBoard = board.map(r => [...r]);
    const piece = newBoard[dragFrom.rank][dragFrom.file];
    newBoard[dragFrom.rank][dragFrom.file] = null;
    newBoard[rankIdx][fileIdx] = piece;
    updateBoard(newBoard);
    setDragFrom(null);
  };

  const getSquareColor = (fileIdx: number, rankIdx: number): boolean => {
    return (fileIdx + rankIdx) % 2 === 0;
  };

  const clearBoard = () => {
    const empty = Array(8).fill(null).map(() => Array(8).fill(null));
    updateBoard(empty);
  };

  const resetBoard = () => {
    const newBoard = fenToBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
    updateBoard(newBoard);
  };

  return (
    <div>
      {/* Piece palette */}
      <div className="flex gap-1 mb-2 justify-center flex-wrap">
        {PALETTE_PIECES.map((p, i) => (
          <button
            key={i}
            onClick={() => setSelectedPalette(
              selectedPalette?.color === p.color && selectedPalette?.type === p.type ? null : p
            )}
            className={`w-9 h-9 flex items-center justify-center rounded transition-all ${
              selectedPalette?.color === p.color && selectedPalette?.type === p.type
                ? 'bg-blue-500 ring-2 ring-blue-300 scale-110'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
            dangerouslySetInnerHTML={{ __html: getPieceSvg(p.color, p.type) }}
          />
        ))}
        {/* Eraser */}
        <button
          onClick={() => setSelectedPalette(null)}
          className={`w-9 h-9 flex items-center justify-center rounded transition-all text-sm ${
            !selectedPalette ? 'bg-gray-600 ring-2 ring-gray-400' : 'bg-gray-700 hover:bg-gray-600'
          }`}
          title="Löschen (Klick auf Figur)"
        >
          ✕
        </button>
      </div>

      <p className="text-[0.65rem] text-gray-500 text-center mb-2">
        {selectedPalette
          ? `Klicke auf ein Feld um ${selectedPalette.color === 'w' ? 'weiße' : 'schwarze'} Figur zu platzieren`
          : 'Klicke auf eine Figur zum Entfernen, oder ziehe sie auf ein anderes Feld'}
      </p>

      {/* Board */}
      <div
        ref={boardRef}
        className="grid grid-cols-8 grid-rows-8 w-full aspect-square rounded-lg overflow-hidden shadow-2xl border-2 border-amber-900/50"
      >
        {RANKS.map((rank, rankIdx) =>
          FILES.map((file, fileIdx) => {
            const piece = getPieceAt(board, fileIdx, rankIdx);
            const isLight = getSquareColor(fileIdx, rankIdx);
            const isDragSource = dragFrom?.file === fileIdx && dragFrom?.rank === rankIdx;

            return (
              <div
                key={`${file}${rank}`}
                className={`
                  relative flex items-center justify-center aspect-square cursor-pointer
                  ${isLight ? 'bg-board-light' : 'bg-board-dark'}
                  ${isDragSource ? 'opacity-40' : ''}
                  ${selectedPalette ? 'hover:ring-2 hover:ring-blue-400 hover:ring-inset' : ''}
                  transition-all duration-100
                `}
                onClick={() => handleSquareClick(fileIdx, rankIdx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(fileIdx, rankIdx)}
              >
                {piece && (
                  <div
                    className="w-[85%] h-[85%] select-none"
                    style={{ filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.4))' }}
                    draggable
                    onDragStart={() => handleDragStart(fileIdx, rankIdx)}
                    dangerouslySetInnerHTML={{ __html: getPieceSvg(piece.color, piece.type) }}
                  />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-2">
        <button
          onClick={clearBoard}
          className="flex-1 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
        >
          Brett leeren
        </button>
        <button
          onClick={resetBoard}
          className="flex-1 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
        >
          Startposition
        </button>
      </div>
    </div>
  );
}
