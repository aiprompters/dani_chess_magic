import { GameState, TimerConfig, TimerState, RoomInfo, VariantType } from '../../shared/types';
import { RuleEngine, GameOverResult, createRuleEngine } from '../../shared/rules';

export class GameRoom {
  public roomId: string;
  public white: string | null = null;
  public black: string | null = null;
  public spectators: Set<string> = new Set();
  public timerConfig: TimerConfig;

  private engine: RuleEngine;
  private timerState: TimerState;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private lastTickTime: number = 0;
  private gameStarted: boolean = false;

  constructor(roomId: string, timerConfig: TimerConfig, variant: VariantType = 'standard') {
    this.roomId = roomId;
    this.timerConfig = timerConfig;
    this.engine = createRuleEngine({ variant });
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
    const turn = this.engine.getTurn();
    if (turn === 'w' && socketId !== this.white) return null;
    if (turn === 'b' && socketId !== this.black) return null;

    const move = this.engine.makeMove({ from, to, promotion });
    if (!move) return null;

    // Add increment (skip during sub-moves in DoubleMove variant)
    if (this.gameStarted && !this.engine.hasRemainingSubMoves()) {
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
  }

  private startTimer() {
    this.lastTickTime = Date.now();
    this.timerInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - this.lastTickTime;
      this.lastTickTime = now;

      if (this.engine.getTurn() === 'w') {
        this.timerState.white -= elapsed;
      } else {
        this.timerState.black -= elapsed;
      }

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

  getGameOverResult(): GameOverResult {
    return this.engine.getGameOverResult();
  }

  getGameState(lastMove?: { from: string; to: string }): GameState {
    return this.engine.buildGameState(lastMove);
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
