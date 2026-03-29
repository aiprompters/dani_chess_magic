import { TimerState } from '../../../shared/types';

interface ChessClockProps {
  timer: TimerState;
  turn: 'w' | 'b';
  playerColor: 'w' | 'b' | 'spectator';
  gameOver: boolean;
}

function formatTime(ms: number): string {
  if (ms <= 0) return '0:00';
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function ChessClock({ timer, turn, playerColor, gameOver }: ChessClockProps) {
  const isFlipped = playerColor === 'b';
  const topColor = isFlipped ? 'w' : 'b';
  const bottomColor = isFlipped ? 'b' : 'w';
  const topTime = topColor === 'w' ? timer.white : timer.black;
  const bottomTime = bottomColor === 'w' ? timer.white : timer.black;

  const isTopActive = !gameOver && turn === topColor;
  const isBottomActive = !gameOver && turn === bottomColor;
  const isTopLow = topTime < 30000;
  const isBottomLow = bottomTime < 30000;

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Opponent timer (top) */}
      <ClockDisplay
        time={topTime}
        active={isTopActive}
        low={isTopLow}
        label={topColor === 'w' ? 'Weiß' : 'Schwarz'}
      />

      {/* Player timer (bottom) - rendered separately below the board */}
      <div className="hidden">
        <ClockDisplay
          time={bottomTime}
          active={isBottomActive}
          low={isBottomLow}
          label={bottomColor === 'w' ? 'Weiß' : 'Schwarz'}
        />
      </div>
    </div>
  );
}

export function ClockDisplay({ time, active, low, label }: {
  time: number;
  active: boolean;
  low: boolean;
  label: string;
}) {
  return (
    <div className={`
      flex items-center justify-between px-4 py-2 rounded-lg font-mono text-lg
      transition-all duration-300
      ${active
        ? low
          ? 'bg-red-600/90 text-white shadow-lg shadow-red-500/30 animate-pulse'
          : 'bg-white text-gray-900 shadow-lg'
        : 'bg-gray-800/60 text-gray-400'
      }
    `}>
      <span className="text-sm font-sans">{label}</span>
      <span className={`text-xl font-bold tabular-nums ${active && low ? 'text-white' : ''}`}>
        {formatTime(time)}
      </span>
    </div>
  );
}
