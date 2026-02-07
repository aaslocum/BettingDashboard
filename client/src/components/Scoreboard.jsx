import { formatCurrency, getQuarterName } from '../utils/helpers';

function Scoreboard({ gameData, displayMode = false }) {
  const { teams, scores, quarters, gameStatus } = gameData;

  // Determine game status label
  const completedQuarters = Object.values(quarters).filter(q => q.completed).length;
  let statusLabel = 'SUPER BOWL LX';
  if (completedQuarters > 0 && completedQuarters < 4) {
    const names = ['1ST QTR', '2ND QTR', '3RD QTR', '4TH QTR'];
    statusLabel = names[completedQuarters - 1];
  } else if (completedQuarters === 4) {
    statusLabel = 'FINAL';
  } else if (gameStatus === 'active') {
    statusLabel = 'GAME ACTIVE';
  }

  return (
    <div className="nbc-scoreboard">
      <div className="nbc-scoreboard-header">{statusLabel}</div>

      {/* Score Display */}
      <div className="flex justify-center items-center gap-6 sm:gap-10 py-4 px-4">
        <div className="text-center flex-1">
          <div className="text-xs sm:text-sm font-bold text-gray-400 tracking-wider mb-1">
            {teams.away.abbreviation || teams.away.name}
          </div>
          <div className="text-3xl sm:text-5xl font-extrabold text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {scores.away}
          </div>
        </div>

        <div className="text-gray-600 text-lg font-light">vs</div>

        <div className="text-center flex-1">
          <div className="text-xs sm:text-sm font-bold text-gray-400 tracking-wider mb-1">
            {teams.home.abbreviation || teams.home.name}
          </div>
          <div className="text-3xl sm:text-5xl font-extrabold text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {scores.home}
          </div>
        </div>
      </div>

      {/* Quarter Prizes */}
      <div className="grid grid-cols-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        {Object.entries(quarters).map(([key, quarter]) => (
          <div
            key={key}
            className={`text-center py-2.5 px-1 ${
              quarter.completed ? 'bg-green-900/30' : ''
            }`}
            style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="text-[10px] sm:text-xs text-gray-500 font-semibold tracking-wider uppercase">
              {getQuarterName(key)}
            </div>
            <div className="text-xs sm:text-sm font-bold" style={{ color: 'var(--nbc-gold)' }}>
              {formatCurrency(quarter.prize)}
            </div>
            {quarter.completed && quarter.winner && (
              <div className="text-[10px] sm:text-xs text-green-400 truncate font-semibold">
                {quarter.winner.player}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Scoreboard;
