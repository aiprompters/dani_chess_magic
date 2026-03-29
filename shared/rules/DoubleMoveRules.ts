import { VariantType } from '../types';
import { MoveInput, VerboseMove } from './RuleEngine';
import { StandardRules } from './StandardRules';

export class DoubleMoveRules extends StandardRules {
  readonly variant: VariantType = 'doubleMove';
  private doubleMoveColor: 'w' | 'b';
  private subMoveCount: number = 0;

  constructor(doubleMoveColor: 'w' | 'b' = 'b', fen?: string) {
    super(fen);
    this.doubleMoveColor = doubleMoveColor;
  }

  makeMove(move: MoveInput): VerboseMove | null {
    const currentTurn = this.getTurn();
    const result = super.makeMove(move);
    if (!result) return null;

    // First of two sub-moves for the double-move player
    if (currentTurn === this.doubleMoveColor && this.subMoveCount === 0) {
      if (!this.chess.isGameOver()) {
        this.subMoveCount = 1;
        // Give the turn back by modifying the FEN active color
        const fen = this.getFen();
        const parts = fen.split(' ');
        parts[1] = this.doubleMoveColor;
        this.chess.load(parts.join(' '));
      } else {
        this.subMoveCount = 0;
      }
    } else {
      this.subMoveCount = 0;
    }

    return result;
  }

  hasRemainingSubMoves(): boolean {
    return this.subMoveCount === 1;
  }

  reset(fen?: string): void {
    super.reset(fen);
    this.subMoveCount = 0;
  }
}
