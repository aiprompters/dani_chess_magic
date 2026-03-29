import { useState } from 'react';
import { VariantType } from '../../../shared/types';

interface GameSettingsModalProps {
  whiteTime: number; // ms
  blackTime: number; // ms
  currentTurn: 'w' | 'b';
  variant: VariantType;
  depth?: number;
  showVariant?: boolean;
  showTurn?: boolean;
  showDepth?: boolean;
  onApply: (settings: {
    whiteTime?: number;
    blackTime?: number;
    turn?: 'w' | 'b';
    variant?: VariantType;
    depth?: number;
  }) => void;
  onClose: () => void;
}

const VARIANT_LABELS: Record<VariantType, string> = {
  standard: 'Standard',
  forcedCapture: 'Schlagzwang',
  doubleMove: 'Doppelzug',
  kingOfTheHill: 'King of the Hill',
};

export default function GameSettingsModal({
  whiteTime,
  blackTime,
  currentTurn,
  variant,
  depth,
  showVariant = true,
  showTurn = true,
  showDepth = false,
  onApply,
  onClose,
}: GameSettingsModalProps) {
  const [editWhiteMin, setEditWhiteMin] = useState(Math.floor(whiteTime / 60000));
  const [editWhiteSec, setEditWhiteSec] = useState(Math.floor((whiteTime % 60000) / 1000));
  const [editBlackMin, setEditBlackMin] = useState(Math.floor(blackTime / 60000));
  const [editBlackSec, setEditBlackSec] = useState(Math.floor((blackTime % 60000) / 1000));
  const [editTurn, setEditTurn] = useState(currentTurn);
  const [editVariant, setEditVariant] = useState(variant);
  const [editDepth, setEditDepth] = useState(depth ?? 8);

  const handleApply = () => {
    const newWhite = (editWhiteMin * 60 + editWhiteSec) * 1000;
    const newBlack = (editBlackMin * 60 + editBlackSec) * 1000;

    onApply({
      whiteTime: newWhite !== whiteTime ? newWhite : undefined,
      blackTime: newBlack !== blackTime ? newBlack : undefined,
      turn: editTurn !== currentTurn ? editTurn : undefined,
      variant: editVariant !== variant ? editVariant : undefined,
      depth: editDepth !== (depth ?? 8) ? editDepth : undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm mx-4 border border-gray-700/50 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-white mb-4">Spieleinstellungen</h2>

        {/* Time editing */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Zeit anpassen</h3>
          <div className="grid grid-cols-2 gap-3">
            {/* White time */}
            <div className="bg-gray-700/50 rounded-lg p-3">
              <label className="text-xs text-gray-400 block mb-1.5">Weiß</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={180}
                  value={editWhiteMin}
                  onChange={e => setEditWhiteMin(Math.max(0, Number(e.target.value)))}
                  className="w-12 bg-gray-600 rounded px-1.5 py-1 text-white text-center text-sm"
                />
                <span className="text-gray-400 text-xs">m</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={editWhiteSec}
                  onChange={e => setEditWhiteSec(Math.min(59, Math.max(0, Number(e.target.value))))}
                  className="w-12 bg-gray-600 rounded px-1.5 py-1 text-white text-center text-sm"
                />
                <span className="text-gray-400 text-xs">s</span>
              </div>
            </div>

            {/* Black time */}
            <div className="bg-gray-700/50 rounded-lg p-3">
              <label className="text-xs text-gray-400 block mb-1.5">Schwarz</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={180}
                  value={editBlackMin}
                  onChange={e => setEditBlackMin(Math.max(0, Number(e.target.value)))}
                  className="w-12 bg-gray-600 rounded px-1.5 py-1 text-white text-center text-sm"
                />
                <span className="text-gray-400 text-xs">m</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={editBlackSec}
                  onChange={e => setEditBlackSec(Math.min(59, Math.max(0, Number(e.target.value))))}
                  className="w-12 bg-gray-600 rounded px-1.5 py-1 text-white text-center text-sm"
                />
                <span className="text-gray-400 text-xs">s</span>
              </div>
            </div>
          </div>
        </div>

        {/* Turn selection */}
        {showTurn && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Wer ist am Zug?</h3>
            <div className="flex gap-2">
              {(['w', 'b'] as const).map(color => (
                <button
                  key={color}
                  onClick={() => setEditTurn(color)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    editTurn === color
                      ? 'bg-amber-600 text-white ring-2 ring-amber-400/50'
                      : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                  }`}
                >
                  {color === 'w' ? '♔ Weiß' : '♚ Schwarz'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Variant selection */}
        {showVariant && (
          <div className="mb-5">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Spielvariante</h3>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(VARIANT_LABELS) as [VariantType, string][]).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setEditVariant(value)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    editVariant === value
                      ? 'bg-amber-600 text-white ring-2 ring-amber-400/50'
                      : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {editVariant !== variant && (
              <p className="text-xs text-amber-400/70 mt-2">
                Variante ändern behält die aktuelle Stellung bei.
              </p>
            )}
          </div>
        )}

        {/* Depth / Speed */}
        {showDepth && (
          <div className="mb-5">
            <h3 className="text-sm font-medium text-gray-300 mb-2">
              Computer Stärke: {editDepth <= 2 ? 'Schnell/Schwach' : editDepth <= 6 ? 'Mittel' : editDepth <= 12 ? 'Stark' : 'Maximum'}
              <span className="text-gray-500 ml-1">(Tiefe {editDepth})</span>
            </h3>
            <input
              type="range"
              min={1}
              max={16}
              value={editDepth}
              onChange={e => setEditDepth(Number(e.target.value))}
              className="w-full accent-amber-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Schnell</span>
              <span>Stark</span>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleApply}
            className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-bold rounded-lg transition-all active:scale-[0.98]"
          >
            Anwenden
          </button>
          <button
            onClick={onClose}
            className="py-2.5 px-4 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}
