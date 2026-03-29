import { useState } from 'react';
import { useSocket } from './hooks/useSocket';
import Lobby from './components/Lobby';
import { ComputerGameConfig } from './components/Lobby';
import GameView from './components/GameView';
import LocalGameView from './components/LocalGameView';
import ComputerGameView from './components/ComputerGameView';
import { TimerConfig } from '../../shared/types';

export default function App() {
  const {
    connected,
    gameState,
    timerState,
    playerColor,
    roomId,
    gameOver,
    error,
    opponentJoined,
    createRoom,
    joinRoom,
    makeMove,
    resign,
  } = useSocket();

  const [localGame, setLocalGame] = useState<TimerConfig | null>(null);
  const [computerGame, setComputerGame] = useState<ComputerGameConfig | null>(null);

  const handleCreate = async (config: TimerConfig) => {
    await createRoom(config);
  };

  // Local game mode
  if (localGame) {
    return (
      <LocalGameView
        timerConfig={localGame}
        onBack={() => setLocalGame(null)}
      />
    );
  }

  // Computer game mode
  if (computerGame) {
    return (
      <ComputerGameView
        timerConfig={computerGame.timerConfig}
        computerColor={computerGame.computerColor}
        depth={computerGame.depth}
        onBack={() => setComputerGame(null)}
      />
    );
  }

  // Online game mode
  if (roomId && gameState && timerState && playerColor) {
    return (
      <>
        <GameView
          gameState={gameState}
          timerState={timerState}
          playerColor={playerColor}
          roomId={roomId}
          opponentJoined={opponentJoined}
          gameOver={gameOver}
          onMove={makeMove}
          onResign={resign}
        />
        {error && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-600/90 text-white px-4 py-2 rounded-lg text-sm shadow-lg animate-pulse z-50">
            {error}
          </div>
        )}
      </>
    );
  }

  // Lobby
  return (
    <>
      <Lobby
        onCreateRoom={handleCreate}
        onJoinRoom={joinRoom}
        onLocalGame={(config) => setLocalGame(config)}
        onComputerGame={(config) => setComputerGame(config)}
        connected={connected}
      />
      {error && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-600/90 text-white px-4 py-2 rounded-lg text-sm shadow-lg animate-pulse z-50">
          {error}
        </div>
      )}
    </>
  );
}
