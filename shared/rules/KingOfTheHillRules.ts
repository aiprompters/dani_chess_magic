import { GameState, VariantType } from '../types';
import { GameOverResult } from './RuleEngine';
import { StandardRules } from './StandardRules';

const CENTER_SQUARES = ['d4', 'd5', 'e4', 'e5'];

export class KingOfTheHillRules extends StandardRules {
  readonly variant: VariantType = 'kingOfTheHill';

  constructor(fen?: string) {
    super(fen);
  }

  private kingInCenter(): 'w' | 'b' | null {
    for (const sq of CENTER_SQUARES) {
      const piece = this.getPiece(sq);
      if (piece && piece.type === 'k') return piece.color as 'w' | 'b';
    }
    return null;
  }

  isGameOver(): boolean {
    return super.isGameOver() || this.kingInCenter() !== null;
  }

  getGameOverResult(): GameOverResult {
    const centerKing = this.kingInCenter();
    if (centerKing) {
      return { isGameOver: true, winner: centerKing, reason: 'König im Zentrum' };
    }
    return super.getGameOverResult();
  }

  buildGameState(lastMove?: { from: string; to: string }): GameState {
    const state = super.buildGameState(lastMove);
    const result = this.getGameOverResult();
    state.isGameOver = result.isGameOver;
    return state;
  }
}
