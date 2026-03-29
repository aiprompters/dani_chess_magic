import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root - try multiple locations
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { GameRoom } from './GameRoom';
import { analyzeBoardImage } from './boardRecognition';
import { ServerToClientEvents, ClientToServerEvents, TimerConfig, VariantType } from '../../shared/types';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const app = express();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:5173'],
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Board recognition endpoint
app.post('/api/recognize-board', async (req, res) => {
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY ist nicht konfiguriert' });
  }

  const { image } = req.body;
  if (!image) {
    return res.status(400).json({ error: 'Bild erforderlich' });
  }

  try {
    const base64 = image.replace(/^data:image\/\w+;base64,/, '');
    const fen = await analyzeBoardImage(base64, OPENAI_API_KEY);
    res.json({ fen });
  } catch (err: any) {
    console.error('Board recognition error:', err);
    res.status(500).json({ error: err.message || 'Fehler bei der Bilderkennung' });
  }
});

// Serve static client files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
}

const rooms = new Map<string, GameRoom>();
const playerRooms = new Map<string, string>();

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.on('room:create', (config: TimerConfig & { variant?: VariantType }, callback) => {
    const roomId = generateRoomId();
    const room = new GameRoom(roomId, config, config.variant || 'standard');
    rooms.set(roomId, room);

    const color = room.addPlayer(socket.id);
    playerRooms.set(socket.id, roomId);
    socket.join(roomId);

    socket.emit('room:joined', {
      roomId,
      color,
      roomInfo: room.getRoomInfo(),
    });
    socket.emit('game:state', room.getGameState());
    socket.emit('game:timer', room.getTimerState());

    callback(roomId);
    console.log(`Room ${roomId} created by ${socket.id}`);
  });

  socket.on('room:join', (roomId: string) => {
    const room = rooms.get(roomId.toUpperCase());
    if (!room) {
      socket.emit('error', 'Raum nicht gefunden');
      return;
    }

    const color = room.addPlayer(socket.id);
    playerRooms.set(socket.id, roomId.toUpperCase());
    socket.join(roomId.toUpperCase());

    socket.emit('room:joined', {
      roomId: roomId.toUpperCase(),
      color,
      roomInfo: room.getRoomInfo(),
    });
    socket.emit('game:state', room.getGameState());
    socket.emit('game:timer', room.getTimerState());

    // Notify others
    socket.to(roomId.toUpperCase()).emit('room:opponent-joined', room.getRoomInfo());
    console.log(`${socket.id} joined room ${roomId} as ${color}`);
  });

  socket.on('game:move', ({ from, to, promotion }) => {
    const roomId = playerRooms.get(socket.id);
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    const state = room.makeMove(socket.id, from, to, promotion);
    if (!state) {
      socket.emit('error', 'Ungültiger Zug');
      return;
    }

    io.to(roomId).emit('game:state', state);
    io.to(roomId).emit('game:timer', room.getTimerState());

    if (state.isGameOver) {
      room.stopTimer();
      const result = room.getGameOverResult();
      io.to(roomId).emit('game:over', {
        winner: result.winner || 'draw',
        reason: result.reason || 'Unentschieden',
      });
    }
  });

  socket.on('game:resign', () => {
    const roomId = playerRooms.get(socket.id);
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    room.stopTimer();
    const winner = socket.id === room.white ? 'b' : 'w';
    io.to(roomId).emit('game:over', { winner, reason: 'Aufgabe' });
  });

  socket.on('disconnect', () => {
    const roomId = playerRooms.get(socket.id);
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (room) {
      const wasPlayer = room.removePlayer(socket.id);
      if (wasPlayer) {
        socket.to(roomId).emit('room:opponent-left');
        io.to(roomId).emit('game:over', {
          winner: socket.id === room.white ? 'b' : 'w',
          reason: 'Gegner hat das Spiel verlassen',
        });
      }
      if (room.isEmpty()) {
        rooms.delete(roomId);
        console.log(`Room ${roomId} deleted (empty)`);
      }
    }
    playerRooms.delete(socket.id);
    console.log(`Player disconnected: ${socket.id}`);
  });
});

// Timer broadcast loop
setInterval(() => {
  for (const [roomId, room] of rooms) {
    if (room.isFull) {
      io.to(roomId).emit('game:timer', room.getTimerState());

      const timeout = room.isTimeOut();
      if (timeout) {
        room.stopTimer();
        io.to(roomId).emit('game:over', {
          winner: timeout === 'w' ? 'b' : 'w',
          reason: 'Zeit abgelaufen',
        });
      }
    }
  }
}, 500);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Chess server running on port ${PORT}`);
});
