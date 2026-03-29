import { Chess } from 'chess.js';
import { GameState, TimerConfig, TimerState, RoomInfo } from '../../shared/types';

export class GameRoom {
  public roomId: string;
  public white: string | null = null;
  public black: string | null = null;
  public spectators: Set<string> = new Set();
  public timerConfig: TimerConfig;

  private chess: Chess;
  private timerState: TimerState;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private lastTickTime: number = 0;
  private gameStarted: boolean = false;
  private capturedPieces: { w: string[]; b: string[] } = { w: [], b: [] };

  constructor(roomId: string, timerConfig: TimerConfig) {
    this.roomId = roomId;
    this.timerConfig = timerConfig;
    this.chess = new Chess();
    this.timerState = {
      white: timerConfig.initialTime * 1000,
      black: timerConfig.initialTime * 1000,
    };
  }

  get isFull(): boolean {
    return this.white !== null && this.black !== null;
  }

  addPlayer(socketId: string): 'w' | 'b' | 'spectator' {
    if (this.white === null) {
      this.white = socketId;
      return 'w';
    } else if (this.black === null) {
      this.black = socketId;
      return 'b';
    }
    this.spectators.add(socketId);
    return 'spectator';
  }

  removePlayer(socketId: string): boolean {
    if (this.white === socketId) {
      this.white = null;
      this.stopTimer();
      return true;
    }
    if (this.black === socketId) {
      this.black = null;
      this.stopTimer();
      return true;
    }
    this.spectators.delete(socketId);
    return false;
  }

  makeMove(socketId: string, from: string, to: string, promotion?: string): GameState | null {
    const turn = this.chess.turn();
    if (turn === 'w' && socketId !== this.white) return null;
    if (turn === 'b' && socketId !== this.black) return null;

    // Track captures
    const targetSquare = this.chess.get(to as any);

    try {
      const move = this.chess.move({ from, to, promotion: promotion || 'q' });
      if (!move) return null;

      if (move.captured) {
        // Captured piece belongs to the opponent
        const capturedBy = move.color; // who captured
        const opponent = capturedBy === 'w' ? 'b' : 'w';
        this.capturedPieces[capturedBy].push(move.captured);
      }

      // Add increment to the player who just moved
      if (this.gameStarted) {
        if (turn === 'w') {
          this.timerState.white += this.timerConfig.increment * 1000;
        } else {
          this.timerState.black += this.timerConfig.increment * 1000;
        }
      }

      // Start timer on first move
      if (!this.gameStarted && this.isFull) {
        this.gameStarted = true;
        this.startTimer();
      }

      return this.getGameState({ from, to });
    } catch {
      return null;
    }
  }

  private startTimer() {
    this.lastTickTime = Date.now();
    this.timerInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - this.lastTickTime;
      this.lastTickTime = now;

      if (this.chess.turn() === 'w') {
        this.timerState.white -= elapsed;
      } else {
        this.timerState.black -= elapsed;
      }

      // Check for time-out
      if (this.timerState.white <= 0) {
        this.timerState.white = 0;
        this.stopTimer();
      }
      if (this.timerState.black <= 0) {
        this.timerState.black = 0;
        this.stopTimer();
      }
    }, 100);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  getTimerState(): TimerState {
    return { ...this.timerState };
  }

  isTimeOut(): 'w' | 'b' | null {
    if (this.timerState.white <= 0) return 'w';
    if (this.timerState.black <= 0) return 'b';
    return null;
  }

  getGameState(lastMove?: { from: string; to: string }): GameState {
    return {
      fen: this.chess.fen(),
      turn: this.chess.turn() as 'w' | 'b',
      isCheck: this.chess.isCheck(),
      isCheckmate: this.chess.isCheckmate(),
      isStalemate: this.chess.isStalemate(),
      isDraw: this.chess.isDraw(),
      isGameOver: this.chess.isGameOver(),
      lastMove,
      capturedPieces: {
        w: [...this.capturedPieces.w],
        b: [...this.capturedPieces.b],
      },
    };
  }

  getRoomInfo(): RoomInfo {
    return {
      roomId: this.roomId,
      white: this.white,
      black: this.black,
      spectators: this.spectators.size,
      timerConfig: this.timerConfig,
    };
  }

  isEmpty(): boolean {
    return this.white === null && this.black === null && this.spectators.size === 0;
  }
}
