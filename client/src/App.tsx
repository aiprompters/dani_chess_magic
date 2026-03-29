import { useState } from 'react';
import { useSocket } from './hooks/useSocket';
import Lobby from './components/Lobby';
import { ComputerGameConfig } from './components/Lobby';
import GameView from './components/GameView';
import LocalGameView from './components/LocalGameView';
import ComputerGameView from './components/ComputerGameView';
import BoardScanner from './components/BoardScanner';
import { TimerConfig } from '../../shared/types';

interface LocalGameState {
  timerConfig: TimerConfig;
  startFen?: string;
}

interface ComputerGameState extends ComputerGameConfig {
  startFen?: string;
}

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

  const [localGame, setLocalGame] = useState<LocalGameState | null>(null);
  const [computerGame, setComputerGame] = useState<ComputerGameState | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  const handleCreate = async (config: TimerConfig) => {
    await createRoom(config);
  };

  // Board scanner
  if (showScanner) {
    return (
      <BoardScanner
        onStartLocal={(config, fen) => {
          setShowScanner(false);
          setLocalGame({ timerConfig: config, startFen: fen });
        }}
        onStartComputer={(config, fen) => {
          setShowScanner(false);
          setComputerGame({ ...config, startFen: fen });
        }}
        onBack={() => setShowScanner(false)}
      />
    );
  }

  // Local game mode
  if (localGame) {
    return (
      <LocalGameView
        timerConfig={localGame.timerConfig}
        startFen={localGame.startFen}
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
        startFen={computerGame.startFen}
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
        onLocalGame={(config) => setLocalGame({ timerConfig: config })}
        onComputerGame={(config) => setComputerGame(config)}
        onScanBoard={() => setShowScanner(true)}
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