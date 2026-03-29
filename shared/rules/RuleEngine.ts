import { GameState, VariantType } from '../types';

export interface MoveInput {
  from: string;
  to: string;
  promotion?: string;
}

export interface VerboseMove {
  from: string;
  to: string;
  color: 'w' | 'b';
  piece: string;
  captured?: string;
  promotion?: string;
  san: string;
}

export interface PieceInfo {
  type: string;
  color: 'w' | 'b';
}

export interface GameOverResult {
  isGameOver: boolean;
  winner?: 'w' | 'b' | 'draw';
  reason?: string;
}

export interface RuleEngine {
  readonly variant: VariantType;

  // Move execution
  makeMove(move: MoveInput): VerboseMove | null;

  // Legal move queries
  getLegalMoves(square?: string): VerboseMove[];

  // Turn management
  getTurn(): 'w' | 'b';

  // Position state
  getFen(): string;
  loadFen(fen: string): void;
  getPiece(square: string): PieceInfo | null;

  // Game status
  isCheck(): boolean;
  isGameOver(): boolean;
  getGameOverResult(): GameOverResult;

  // History & captures
  getHistory(): VerboseMove[];
  getCapturedPieces(): { w: string[]; b: string[] };

  // Unified state builder
  buildGameState(lastMove?: { from: string; to: string }): GameState;

  // Reset
  reset(fen?: string): void;

  // Variant-specific
  hasRemainingSubMoves(): boolean;
  isMoveLegalInVariant(move: MoveInput): boolean;
}
