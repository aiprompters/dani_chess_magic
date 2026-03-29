import { Chess, Square } from 'chess.js';
import { GameState, VariantType } from '../types';
import { RuleEngine, MoveInput, VerboseMove, PieceInfo, GameOverResult } from './RuleEngine';

export class StandardRules implements RuleEngine {
  protected chess: Chess;
  readonly variant: VariantType = 'standard';

  constructor(fen?: string) {
    this.chess = fen ? new Chess(fen) : new Chess();
  }

  makeMove(move: MoveInput): VerboseMove | null {
    try {
      const result = this.chess.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || 'q',
      });
      if (!result) return null;
      return this.toVerboseMove(result);
    } catch {
      return null;
    }
  }

  getLegalMoves(square?: string): VerboseMove[] {
    const opts: any = { verbose: true as const };
    if (square) opts.square = square as Square;
    try {
      return this.chess.moves(opts).map((m: any) => this.toVerboseMove(m));
    } catch {
      return [];
    }
  }

  getTurn(): 'w' | 'b' {
    return this.chess.turn() as 'w' | 'b';
  }

  getFen(): string {
    return this.chess.fen();
  }

  loadFen(fen: string): void {
    this.chess.load(fen);
  }

  getPiece(square: string): PieceInfo | null {
    const p = this.chess.get(square as Square);
    return p ? { type: p.type, color: p.color } : null;
  }

  isCheck(): boolean {
    return this.chess.isCheck();
  }

  isGameOver(): boolean {
    return this.chess.isGameOver();
  }

  getGameOverResult(): GameOverResult {
    if (!this.isGameOver()) return { isGameOver: false };

    if (this.chess.isCheckmate()) {
      const winner = this.getTurn() === 'w' ? 'b' : 'w';
      return { isGameOver: true, winner, reason: 'Schachmatt' };
    }
    if (this.chess.isStalemate()) {
      return { isGameOver: true, winner: 'draw', reason: 'Patt' };
    }
    return { isGameOver: true, winner: 'draw', reason: 'Unentschieden' };
  }

  getHistory(): VerboseMove[] {
    return this.chess.history({ verbose: true }).map((m: any) => this.toVerboseMove(m));
  }

  getCapturedPieces(): { w: string[]; b: string[] } {
    const captured: { w: string[]; b: string[] } = { w: [], b: [] };
    for (const move of this.chess.history({ verbose: true })) {
      if (move.captured) {
        captured[move.color as 'w' | 'b'].push(move.captured);
      }
    }
    return captured;
  }

  buildGameState(lastMove?: { from: string; to: string }): GameState {
    const result = this.getGameOverResult();
    return {
      fen: this.getFen(),
      turn: this.getTurn(),
      isCheck: this.isCheck(),
      isCheckmate: result.reason === 'Schachmatt',
      isStalemate: result.reason === 'Patt',
      isDraw: result.winner === 'draw' && result.isGameOver,
      isGameOver: result.isGameOver,
      lastMove,
      capturedPieces: this.getCapturedPieces(),
      variant: this.variant,
      hasRemainingSubMoves: this.hasRemainingSubMoves(),
    };
  }

  reset(fen?: string): void {
    this.chess = fen ? new Chess(fen) : new Chess();
  }

  hasRemainingSubMoves(): boolean {
    return false;
  }

  isMoveLegalInVariant(move: MoveInput): boolean {
    return this.getLegalMoves(move.from).some(m => m.to === move.to);
  }

  protected toVerboseMove(m: any): VerboseMove {
    return {
      from: m.from,
      to: m.to,
      color: m.color,
      piece: m.piece,
      captured: m.captured,
      promotion: m.promotion,
      san: m.san,
    };
  }
}
