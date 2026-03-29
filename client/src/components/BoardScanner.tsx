import { useState, useRef } from 'react';
import { Chess } from 'chess.js';
import BoardEditor from './BoardEditor';
import { GameState, TimerConfig } from '../../../shared/types';
import { DIFFICULTY_LEVELS } from '../hooks/useStockfish';
import { ComputerGameConfig } from './Lobby';

interface BoardScannerProps {
  onStartLocal: (config: TimerConfig, fen: string) => void;
  onStartComputer: (config: ComputerGameConfig, fen: string) => void;
  onBack: () => void;
}

export default function BoardScanner({ onStartLocal, onStartComputer, onBack }: BoardScannerProps) {
  const [image, setImage] = useState<string | null>(null);
  const [pieceFen, setPieceFen] = useState<string | null>(null);
  const [turn, setTurn] = useState<'w' | 'b'>('w');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameMode, setGameMode] = useState<'local' | 'computer'>('local');
  const [difficulty, setDifficulty] = useState(2);
  const [playAs, setPlayAs] = useState<'w' | 'b'>('w');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fullFen = pieceFen ? `${pieceFen} ${turn} KQkq - 0 1` : null;
  const validFen = (() => {
    if (!fullFen) return false;
    try {
      new Chess(fullFen);
      return true;
    } catch {
      return false;
    }
  })();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      setImage(ev.target?.result as string);
      setPieceFen(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!image) return;

    setLoading(true);
    setError(null);

    try {
      const apiUrl = import.meta.env.PROD ? '/api/recognize-board' : 'http://localhost:3001/api/recognize-board';
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Fehler bei der Analyse');
      }

      setPieceFen(data.fen);
    } catch (err: any) {
      setError(err.message || 'Verbindungsfehler');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = () => {
    if (!fullFen || !validFen) return;

    const timerConfig: TimerConfig = { initialTime: 600, increment: 5 };

    if (gameMode === 'local') {
      onStartLocal(timerConfig, fullFen);
    } else {
      onStartComputer({
        timerConfig,
        computerColor: playAs === 'w' ? 'b' : 'w',
        depth: DIFFICULTY_LEVELS[difficulty].depth,
      }, fullFen);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="py-2 px-3 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
          >
            ← Zurück
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Brett scannen</h1>
            <p className="text-xs text-gray-400">Foto hochladen, Position erkennen, weiterspielen</p>
          </div>
        </div>

        <div className="bg-gray-800/30 backdrop-blur rounded-2xl p-5 border border-gray-700/50 space-y-4">
          {/* Image upload */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              Foto aufnehmen / hochladen
            </button>
          </div>

          {/* Image preview */}
          {image && !pieceFen && (
            <div className="rounded-lg overflow-hidden border border-gray-700">
              <img src={image} alt="Schachbrett" className="w-full object-contain max-h-64" />
            </div>
          )}

          {/* Analyze button */}
          {image && !pieceFen && (
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className={`w-full py-3 font-bold rounded-xl transition-all active:scale-[0.98] ${
                loading
                  ? 'bg-purple-800 text-purple-300 animate-pulse'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white shadow-lg shadow-purple-500/25'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? 'Analysiere mit GPT-4o...' : 'Position erkennen'}
            </button>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-600/20 border border-red-600/40 rounded-lg p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Editable board preview */}
          {pieceFen && (
            <>
              <div>
                <p className="text-sm text-green-400 font-medium mb-2">
                  Position erkannt! Bearbeite sie bei Bedarf:
                </p>
                <BoardEditor
                  fen={pieceFen}
                  onChange={(newFen) => setPieceFen(newFen)}
                />
              </div>

              {!validFen && (
                <div className="bg-yellow-600/20 border border-yellow-600/40 rounded-lg p-2 text-xs text-yellow-300">
                  Ungültige Position - bitte korrigieren (z.B. fehlender König)
                </div>
              )}

              {/* Turn selection */}
              <div>
                <label className="text-sm text-gray-300 mb-2 block font-medium">Wer ist am Zug?</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTurn('w')}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      turn === 'w'
                        ? 'bg-white text-gray-900 shadow-lg'
                        : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                    }`}
                  >
                    ♔ Weiß
                  </button>
                  <button
                    onClick={() => setTurn('b')}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      turn === 'b'
                        ? 'bg-gray-900 text-white shadow-lg ring-2 ring-gray-500'
                        : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                    }`}
                  >
                    ♚ Schwarz
                  </button>
                </div>
              </div>

              {/* Game mode */}
              <div>
                <label className="text-sm text-gray-300 mb-2 block font-medium">Spielmodus</label>
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setGameMode('local')}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      gameMode === 'local'
                        ? 'bg-green-600 text-white shadow-lg'
                        : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                    }`}
                  >
                    Lokal
                  </button>
                  <button
                    onClick={() => setGameMode('computer')}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      gameMode === 'computer'
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                    }`}
                  >
                    Computer
                  </button>
                </div>

                {gameMode === 'computer' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-400 mb-1.5 block">Schwierigkeit</label>
                      <div className="grid grid-cols-5 gap-1.5">
                        {DIFFICULTY_LEVELS.map((level, i) => (
                          <button
                            key={i}
                            onClick={() => setDifficulty(i)}
                            className={`py-1.5 rounded-lg text-xs font-medium transition-all ${
                              difficulty === i
                                ? 'bg-purple-600 text-white ring-2 ring-purple-400/50'
                                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                            }`}
                          >
                            {level.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1.5 block">Du spielst als</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setPlayAs('w')}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                            playAs === 'w'
                              ? 'bg-white text-gray-900 shadow-lg'
                              : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                          }`}
                        >
                          ♔ Weiß
                        </button>
                        <button
                          onClick={() => setPlayAs('b')}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                            playAs === 'b'
                              ? 'bg-gray-900 text-white shadow-lg ring-2 ring-gray-500'
                              : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                          }`}
                        >
                          ♚ Schwarz
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Start button */}
              <button
                onClick={handleStart}
                disabled={!validFen}
                className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-green-500/25 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Von hier weiterspielen
              </button>

              {/* Reset */}
              <button
                onClick={() => { setPieceFen(null); setImage(null); setError(null); }}
                className="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Neues Bild / Reset
              </button>
            </>
          )}

          {/* Manual FEN input */}
          {!pieceFen && (
            <div className="border-t border-gray-700/50 pt-4">
              <label className="text-xs text-gray-400 mb-1 block">Oder FEN manuell eingeben</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="rnbqkbnr/pppppppp/8/8/..."
                  className="flex-1 bg-gray-700 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const input = (e.target as HTMLInputElement).value.trim();
                      if (input) {
                        const parts = input.split(' ');
                        setPieceFen(parts[0]);
                        if (parts[1] === 'b') setTurn('b');
                      }
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const input = document.querySelector<HTMLInputElement>('input[placeholder*="rnbqkbnr"]');
                    if (input?.value.trim()) {
                      const parts = input.value.trim().split(' ');
                      setPieceFen(parts[0]);
                      if (parts[1] === 'b') setTurn('b');
                    }
                  }}
                  className="py-2 px-3 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded-lg transition-colors"
                >
                  Laden
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
