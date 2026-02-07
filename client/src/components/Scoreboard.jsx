import { formatCurrency, getQuarterName } from '../utils/helpers';

function Scoreboard({ gameData, displayMode = false, compact = false, header = false, children }) {
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

  // Header mode — used as sticky app header with score + payouts + player selector
  if (header) {
    return (
      <div className="nbc-header-scoreboard">
        {/* Top row: status + player selector */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-1.5" style={{ background: 'linear-gradient(90deg, var(--nbc-navy) 0%, var(--nbc-blue-accent) 50%, var(--nbc-navy) 100%)' }}>
          <span className="text-[10px] sm:text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--nbc-gold)' }}>{statusLabel}</span>
          {children}
        </div>

        {/* Score row */}
        <div className="flex justify-center items-center gap-5 sm:gap-8 py-2.5 px-4">
          <div className="text-center flex-1">
            <div className="text-xs sm:text-sm font-bold text-gray-400 tracking-wider">
              {teams.away.abbreviation || teams.away.name}
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {scores.away}
            </div>
          </div>

          <div className="text-gray-600 text-sm font-light">vs</div>

          <div className="text-center flex-1">
            <div className="text-xs sm:text-sm font-bold text-gray-400 tracking-wider">
              {teams.home.abbreviation || teams.home.name}
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {scores.home}
            </div>
          </div>
        </div>

        {/* Quarter Prizes */}
        <div className="grid grid-cols-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          {Object.entries(quarters).map(([key, quarter]) => (
            <div
              key={key}
              className={`text-center py-1.5 px-1 ${
                quarter.completed ? 'bg-green-900/30' : ''
              }`}
              style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="text-[9px] sm:text-[10px] text-gray-500 font-semibold tracking-wider uppercase">
                {getQuarterName(key)}
              </div>
              <div className="text-[10px] sm:text-xs font-bold" style={{ color: 'var(--nbc-gold)' }}>
                {formatCurrency(quarter.prize)}
              </div>
              {quarter.completed && quarter.winner && (
                <div className="text-[9px] sm:text-[10px] text-green-400 truncate font-semibold">
                  {quarter.winner.player}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="nbc-scoreboard" style={{ opacity: 0.85 }}>
        <div className="nbc-scoreboard-header text-[10px] py-1">{statusLabel}</div>

        {/* Compact Score Display */}
        <div className="flex justify-center items-center gap-4 sm:gap-6 py-2 px-4">
          <div className="text-center flex-1">
            <div className="text-[10px] sm:text-xs font-bold text-gray-400 tracking-wider">
              {teams.away.abbreviation || teams.away.name}
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {scores.away}
            </div>
          </div>

          <div className="text-gray-600 text-sm font-light">vs</div>

          <div className="text-center flex-1">
            <div className="text-[10px] sm:text-xs font-bold text-gray-400 tracking-wider">
              {teams.home.abbreviation || teams.home.name}
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {scores.home}
            </div>
          </div>
        </div>

        {/* Compact Quarter Prizes */}
        <div className="grid grid-cols-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          {Object.entries(quarters).map(([key, quarter]) => (
            <div
              key={key}
              className={`text-center py-1.5 px-1 ${
                quarter.completed ? 'bg-green-900/30' : ''
              }`}
              style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="text-[9px] sm:text-[10px] text-gray-500 font-semibold tracking-wider uppercase">
                {getQuarterName(key)}
              </div>
              <div className="text-[10px] sm:text-xs font-bold" style={{ color: 'var(--nbc-gold)' }}>
                {formatCurrency(quarter.prize)}
              </div>
              {quarter.completed && quarter.winner && (
                <div className="text-[9px] sm:text-[10px] text-green-400 truncate font-semibold">
                  {quarter.winner.player}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
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
