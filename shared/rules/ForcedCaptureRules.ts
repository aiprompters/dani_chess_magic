import { VariantType } from '../types';
import { MoveInput, VerboseMove } from './RuleEngine';
import { StandardRules } from './StandardRules';

export class ForcedCaptureRules extends StandardRules {
  readonly variant: VariantType = 'forcedCapture';

  constructor(fen?: string) {
    super(fen);
  }

  getLegalMoves(square?: string): VerboseMove[] {
    if (this.getTurn() !== 'w') {
      return super.getLegalMoves(square);
    }

    // Check if any capture exists globally
    const allMoves = super.getLegalMoves();
    const globalCaptures = allMoves.filter(m => m.captured);

    if (globalCaptures.length === 0) {
      // No captures available — all moves are legal
      return super.getLegalMoves(square);
    }

    // Captures exist — only return captures
    if (square) {
      return super.getLegalMoves(square).filter(m => m.captured);
    }
    return globalCaptures;
  }

  isMoveLegalInVariant(move: MoveInput): boolean {
    return this.getLegalMoves(move.from).some(m => m.to === move.to);
  }
}
