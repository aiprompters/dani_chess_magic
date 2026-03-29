import { useState } from 'react';
import { TimerConfig } from '../../../shared/types';
import { DIFFICULTY_LEVELS } from '../hooks/useStockfish';

export interface ComputerGameConfig {
  timerConfig: TimerConfig;
  computerColor: 'w' | 'b';
  depth: number;
}

interface LobbyProps {
  onCreateRoom: (config: TimerConfig) => void;
  onJoinRoom: (roomId: string) => void;
  onLocalGame: (config: TimerConfig) => void;
  onComputerGame: (config: ComputerGameConfig) => void;
  connected: boolean;
}

const TIME_PRESETS: { label: string; time: number; increment: number }[] = [
  { label: '1 Min', time: 60, increment: 0 },
  { label: '3 Min', time: 180, increment: 0 },
  { label: '3+2', time: 180, increment: 2 },
  { label: '5 Min', time: 300, increment: 0 },
  { label: '5+3', time: 300, increment: 3 },
  { label: '10 Min', time: 600, increment: 0 },
  { label: '10+5', time: 600, increment: 5 },
  { label: '15+10', time: 900, increment: 10 },
  { label: '30 Min', time: 1800, increment: 0 },
];

export default function Lobby({ onCreateRoom, onJoinRoom, onLocalGame, onComputerGame, connected }: LobbyProps) {
  const [joinCode, setJoinCode] = useState('');
  const [selectedPreset, setSelectedPreset] = useState(4); // 5+3 default
  const [customTime, setCustomTime] = useState(5);
  const [customIncrement, setCustomIncrement] = useState(3);
  const [useCustom, setUseCustom] = useState(false);
  const [tab, setTab] = useState<'local' | 'computer' | 'online' | 'join'>('local');
  const [difficulty, setDifficulty] = useState(2); // Mittel
  const [playAs, setPlayAs] = useState<'w' | 'b' | 'random'>('w');

  const getTimerConfig = (): TimerConfig => {
    return useCustom
      ? { initialTime: customTime * 60, increment: customIncrement }
      : { initialTime: TIME_PRESETS[selectedPreset].time, increment: TIME_PRESETS[selectedPreset].increment };
  };

  const handleJoin = () => {
    if (joinCode.trim()) {
      onJoinRoom(joinCode.trim().toUpperCase());
    }
  };

  const timerSelector = (
    <>
      <h2 className="text-lg font-semibold mb-4">Zeitkontrolle</h2>

      {/* Presets */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {TIME_PRESETS.map((preset, i) => (
          <button
            key={i}
            onClick={() => { setSelectedPreset(i); setUseCustom(false); }}
            className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
              !useCustom && selectedPreset === i
                ? 'bg-amber-600 text-white shadow-lg ring-2 ring-amber-400/50'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Custom time */}
      <button
        onClick={() => setUseCustom(!useCustom)}
        className={`w-full py-2 mb-3 rounded-lg text-sm transition-all ${
          useCustom ? 'bg-amber-600/20 text-amber-400 border border-amber-600/50' : 'text-gray-400 hover:text-gray-300'
        }`}
      >
        Eigene Zeit
      </button>

      {useCustom && (
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label className="text-xs text-gray-400 mb-1 block">Minuten</label>
            <input
              type="number"
              min={1}
              max={180}
              value={customTime}
              onChange={(e) => setCustomTime(Number(e.target.value))}
              className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white text-center"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-400 mb-1 block">Inkrement (s)</label>
            <input
              type="number"
              min={0}
              max={60}
              value={customIncrement}
              onChange={(e) => setCustomIncrement(Number(e.target.value))}
              className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white text-center"
            />
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">♚</div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent">
            Schach Online
          </h1>
          <p className="text-gray-400 mt-1 text-sm">Klassisches Schach - Zwei Spieler</p>
        </div>

        {/* Connection status */}
        <div className={`flex items-center justify-center gap-2 mb-6 text-sm ${connected ? 'text-green-400' : 'text-red-400'}`}>
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400 animate-pulse'}`} />
          {connected ? 'Verbunden' : 'Verbindung wird hergestellt...'}
        </div>

        {/* Tabs */}
        <div className="flex mb-6 bg-gray-800/50 rounded-xl p-1">
          <button
            onClick={() => setTab('local')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === 'local' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
            }`}
          >
            Lokal
          </button>
          <button
            onClick={() => setTab('computer')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === 'computer' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
            }`}
          >
            Computer
          </button>
          <button
            onClick={() => setTab('online')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === 'online' ? 'bg-amber-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
            }`}
          >
            Online
          </button>
          <button
            onClick={() => setTab('join')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === 'join' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
            }`}
          >
            Beitreten
          </button>
        </div>

        <div className="bg-gray-800/30 backdrop-blur rounded-2xl p-6 border border-gray-700/50">
          {tab === 'local' && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🖥️</span>
                <div>
                  <h2 className="text-lg font-semibold">Lokales Spiel</h2>
                  <p className="text-xs text-gray-400">Zu zweit an einem Bildschirm</p>
                </div>
              </div>

              {timerSelector}

              <button
                onClick={() => onLocalGame(getTimerConfig())}
                className="w-full py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-bold rounded-xl shadow-lg shadow-green-500/25 transition-all active:scale-[0.98]"
              >
                Spiel starten
              </button>
            </>
          )}

          {tab === 'computer' && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🤖</span>
                <div>
                  <h2 className="text-lg font-semibold">Gegen Computer</h2>
                  <p className="text-xs text-gray-400">Stockfish Engine</p>
                </div>
              </div>

              {/* Difficulty */}
              <h3 className="text-sm font-medium text-gray-300 mb-2">Schwierigkeit</h3>
              <div className="grid grid-cols-5 gap-1.5 mb-4">
                {DIFFICULTY_LEVELS.map((level, i) => (
                  <button
                    key={i}
                    onClick={() => setDifficulty(i)}
                    className={`py-2 px-1 rounded-lg text-xs font-medium transition-all text-center ${
                      difficulty === i
                        ? 'bg-purple-600 text-white shadow-lg ring-2 ring-purple-400/50'
                        : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                    }`}
                  >
                    <div>{level.label}</div>
                  </button>
                ))}
              </div>

              {/* Play as */}
              <h3 className="text-sm font-medium text-gray-300 mb-2">Spielen als</h3>
              <div className="flex gap-2 mb-4">
                {([['w', '♔ Weiß'], ['b', '♚ Schwarz'], ['random', '🎲 Zufall']] as const).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setPlayAs(value)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      playAs === value
                        ? 'bg-purple-600 text-white shadow-lg ring-2 ring-purple-400/50'
                        : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {timerSelector}

              <button
                onClick={() => {
                  const computerColor = playAs === 'random'
                    ? (Math.random() < 0.5 ? 'w' : 'b')
                    : (playAs === 'w' ? 'b' : 'w');
                  onComputerGame({
                    timerConfig: getTimerConfig(),
                    computerColor,
                    depth: DIFFICULTY_LEVELS[difficulty].depth,
                  });
                }}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/25 transition-all active:scale-[0.98]"
              >
                Gegen Computer spielen
              </button>
            </>
          )}

          {tab === 'online' && (
            <>
              {timerSelector}

              <button
                onClick={() => onCreateRoom(getTimerConfig())}
                disabled={!connected}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-bold rounded-xl shadow-lg shadow-amber-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                Online-Spiel erstellen
              </button>
            </>
          )}

          {tab === 'join' && (
            <>
              <h2 className="text-lg font-semibold mb-4">Raum beitreten</h2>
              <input
                type="text"
                placeholder="Raum-Code eingeben"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                maxLength={6}
                className="w-full bg-gray-700 rounded-xl px-4 py-3 text-white text-center text-xl tracking-[0.3em] font-mono placeholder:text-gray-500 placeholder:tracking-normal placeholder:text-base mb-4 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                onClick={handleJoin}
                disabled={!connected || !joinCode.trim()}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                Beitreten
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
