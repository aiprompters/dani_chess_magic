export interface GameState {
  fen: string;
  turn: 'w' | 'b';
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  isGameOver: boolean;
  lastMove?: { from: string; to: string };
  capturedPieces: { w: string[]; b: string[] };
}

export interface TimerConfig {
  initialTime: number; // in seconds
  increment: number;   // in seconds per move
}

export interface TimerState {
  white: number; // remaining ms
  black: number; // remaining ms
}

export interface RoomInfo {
  roomId: string;
  white: string | null;
  black: string | null;
  spectators: number;
  timerConfig: TimerConfig;
}

// Socket Events
export interface ServerToClientEvents {
  'game:state': (state: GameState) => void;
  'game:timer': (timer: TimerState) => void;
  'room:joined': (info: { roomId: string; color: 'w' | 'b' | 'spectator'; roomInfo: RoomInfo }) => void;
  'room:opponent-joined': (info: RoomInfo) => void;
  'room:opponent-left': () => void;
  'game:over': (result: { winner: 'w' | 'b' | 'draw'; reason: string }) => void;
  'error': (message: string) => void;
}

export interface ClientToServerEvents {
  'room:create': (config: TimerConfig, callback: (roomId: string) => void) => void;
  'room:join': (roomId: string) => void;
  'game:move': (move: { from: string; to: string; promotion?: string }) => void;
  'game:resign': () => void;
  'game:draw-offer': () => void;
  'game:draw-accept': () => void;
}
