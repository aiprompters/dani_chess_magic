import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState, TimerState, TimerConfig, VariantType, RoomInfo, ServerToClientEvents, ClientToServerEvents } from '../../../shared/types';

type ChessSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface UseSocketReturn {
  socket: ChessSocket | null;
  connected: boolean;
  gameState: GameState | null;
  timerState: TimerState | null;
  playerColor: 'w' | 'b' | 'spectator' | null;
  roomInfo: RoomInfo | null;
  roomId: string | null;
  gameOver: { winner: 'w' | 'b' | 'draw'; reason: string } | null;
  error: string | null;
  opponentJoined: boolean;
  createRoom: (config: TimerConfig & { variant?: VariantType }) => Promise<string>;
  joinRoom: (roomId: string) => void;
  makeMove: (from: string, to: string, promotion?: string) => void;
  resign: () => void;
}

export function useSocket(): UseSocketReturn {
  const socketRef = useRef<ChessSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [timerState, setTimerState] = useState<TimerState | null>(null);
  const [playerColor, setPlayerColor] = useState<'w' | 'b' | 'spectator' | null>(null);
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState<{ winner: 'w' | 'b' | 'draw'; reason: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opponentJoined, setOpponentJoined] = useState(false);

  useEffect(() => {
    const url = import.meta.env.PROD ? window.location.origin : 'http://localhost:3001';
    const socket: ChessSocket = io(url);
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('game:state', (state) => setGameState(state));
    socket.on('game:timer', (timer) => setTimerState(timer));

    socket.on('room:joined', ({ roomId, color, roomInfo }) => {
      setRoomId(roomId);
      setPlayerColor(color);
      setRoomInfo(roomInfo);
      if (roomInfo.white && roomInfo.black) {
        setOpponentJoined(true);
      }
    });

    socket.on('room:opponent-joined', (info) => {
      setRoomInfo(info);
      setOpponentJoined(true);
    });

    socket.on('room:opponent-left', () => {
      setOpponentJoined(false);
    });

    socket.on('game:over', (result) => {
      setGameOver(result);
    });

    socket.on('error', (msg) => {
      setError(msg);
      setTimeout(() => setError(null), 3000);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const createRoom = (config: TimerConfig & { variant?: VariantType }): Promise<string> => {
    return new Promise((resolve) => {
      socketRef.current?.emit('room:create', config, (id) => {
        resolve(id);
      });
    });
  };

  const joinRoom = (id: string) => {
    socketRef.current?.emit('room:join', id);
  };

  const makeMove = (from: string, to: string, promotion?: string) => {
    socketRef.current?.emit('game:move', { from, to, promotion });
  };

  const resign = () => {
    socketRef.current?.emit('game:resign');
  };

  return {
    socket: socketRef.current,
    connected,
    gameState,
    timerState,
    playerColor,
    roomInfo,
    roomId,
    gameOver,
    error,
    opponentJoined,
    createRoom,
    joinRoom,
    makeMove,
    resign,
  };
}
