import { getPieceSvg } from './ChessPieces';

interface PromotionDialogProps {
  color: 'w' | 'b';
  onSelect: (piece: string) => void;
  onCancel: () => void;
}

const PROMOTION_PIECES = ['q', 'r', 'b', 'n'];

export default function PromotionDialog({ color, onSelect, onCancel }: PromotionDialogProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 rounded-lg">
      <div className="bg-white rounded-xl p-4 shadow-2xl">
        <p className="text-gray-800 text-center text-sm font-semibold mb-3">Umwandlung</p>
        <div className="flex gap-2">
          {PROMOTION_PIECES.map((piece) => (
            <button
              key={piece}
              onClick={() => onSelect(piece)}
              className="w-14 h-14 flex items-center justify-center bg-gray-100 hover:bg-amber-200 rounded-lg transition-colors border border-gray-300 p-2"
              dangerouslySetInnerHTML={{ __html: getPieceSvg(color, piece) }}
            />
          ))}
        </div>
        <button
          onClick={onCancel}
          className="mt-2 w-full text-sm text-gray-500 hover:text-gray-700"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}
