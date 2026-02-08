import { useMemo } from 'react';
import { calculatePlayerStats, formatCurrency, getQuarterName, getPlayerColor } from '../utils/helpers';

function PlayerStats({ gameData, displayMode = false, showCollectionInfo = false }) {
  const { players, totals } = useMemo(
    () => calculatePlayerStats(gameData),
    [gameData]
  );

  if (players.length === 0) {
    if (displayMode) {
      return (
        <div className="nbc-panel">
          <div className="nbc-panel-header">
            <span className="nbc-header-accent"></span>
            <h3 className="nbc-panel-title">POOL STANDINGS</h3>
          </div>
          <p className="text-gray-400 p-4 text-center text-sm">No squares claimed yet</p>
        </div>
      );
    }
    return (
      <div className="card">
        <h2 className="nbc-section-header mb-0 pb-0 border-0">
          <span className="card-header-accent"></span>
          POOL STANDINGS
        </h2>
        <p className="text-gray-400 mt-3">No squares claimed yet</p>
      </div>
    );
  }

  // Separate players who owe money vs who are owed money
  const oweMoney = players.filter(p => p.net < 0);
  const owedMoney = players.filter(p => p.net > 0);

  if (displayMode) {
    return (
      <div className="nbc-panel">
        <div className="nbc-panel-header">
          <span className="nbc-header-accent"></span>
          <h3 className="nbc-panel-title">POOL STANDINGS</h3>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-1 p-2 bg-black/20">
          <div className="text-center p-2">
            <div className="text-xs text-gray-500 tracking-wider">POOL</div>
            <div className="text-lg font-bold text-blue-400">
              {formatCurrency(totals.totalBets)}
            </div>
          </div>
          <div className="text-center p-2">
            <div className="text-xs text-gray-500 tracking-wider">PAID</div>
            <div className="text-lg font-bold text-green-400">
              {formatCurrency(totals.totalPaidOut)}
            </div>
          </div>
          <div className="text-center p-2">
            <div className="text-xs text-gray-500 tracking-wider">LEFT</div>
            <div className="text-lg font-bold text-nbc-gold">
              {formatCurrency(totals.totalPrizePool - totals.totalPaidOut)}
            </div>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="p-2">
          <div className="nbc-stat-table-header">
            <span className="flex-1">PLAYER</span>
            <span className="w-12 text-center">SQ</span>
            <span className="w-16 text-right">NET</span>
          </div>
          <div className="space-y-1 max-h-[200px] overflow-y-auto">
            {players.slice(0, 8).map((player, idx) => (
              <div
                key={player.initials}
                className={`nbc-stat-table-row ${idx === 0 && player.net > 0 ? 'nbc-leader-row' : ''}`}
              >
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-gray-500 text-xs w-4">{idx + 1}</span>
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0"
                    style={{ background: getPlayerColor(player.initials), color: '#fff' }}
                  >
                    {player.initials}
                  </div>
                  {player.quarterWins.length > 0 && (
                    <span className="text-xs text-nbc-gold">
                      ({player.quarterWins.length}W)
                    </span>
                  )}
                </div>
                <span className="w-12 text-center text-gray-400 text-sm">
                  {player.squareCount}
                </span>
                <span className={`w-16 text-right font-bold text-sm ${
                  player.net > 0 ? 'text-green-400' :
                  player.net < 0 ? 'text-red-400' :
                  'text-gray-400'
                }`}>
                  {player.net > 0 ? '+' : ''}{formatCurrency(player.net)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Regular (non-display) mode
  return (
    <div className="card">
      <h2 className="nbc-section-header mb-0 pb-0 border-0">
        <span className="card-header-accent"></span>
        POOL STANDINGS
      </h2>

      {/* Summary Bar */}
      <div className="grid grid-cols-3 gap-2 mt-3 mb-3 text-center">
        <div className="rounded p-2" style={{ background: 'rgba(0,0,0,0.25)' }}>
          <div className="text-[10px] text-gray-500 font-semibold tracking-wider">COLLECTED</div>
          <div className="text-lg font-bold text-blue-400">
            {formatCurrency(totals.totalBets)}
          </div>
        </div>
        <div className="rounded p-2" style={{ background: 'rgba(0,0,0,0.25)' }}>
          <div className="text-[10px] text-gray-500 font-semibold tracking-wider">PAID OUT</div>
          <div className="text-lg font-bold text-green-400">
            {formatCurrency(totals.totalPaidOut)}
          </div>
        </div>
        <div className="rounded p-2" style={{ background: 'rgba(0,0,0,0.25)' }}>
          <div className="text-[10px] text-gray-500 font-semibold tracking-wider">REMAINING</div>
          <div className="text-lg font-bold" style={{ color: 'var(--nbc-gold)' }}>
            {formatCurrency(totals.totalPrizePool - totals.totalPaidOut)}
          </div>
        </div>
      </div>

      {/* Collection/Payout Helper - only show when requested */}
      {showCollectionInfo && (
        <div className="mb-4 space-y-3">
          {oweMoney.length > 0 && (
            <div className="bg-red-900/30 rounded-lg p-3">
              <div className="text-sm font-semibold text-red-400 mb-2">To Collect:</div>
              <div className="space-y-1">
                {oweMoney.map(p => (
                  <div key={p.initials} className="flex justify-between text-sm">
                    <span>{p.initials}</span>
                    <span className="text-red-400">{formatCurrency(Math.abs(p.net))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {owedMoney.length > 0 && (
            <div className="bg-green-900/30 rounded-lg p-3">
              <div className="text-sm font-semibold text-green-400 mb-2">To Pay Out:</div>
              <div className="space-y-1">
                {owedMoney.map(p => (
                  <div key={p.initials} className="flex justify-between text-sm">
                    <span>{p.initials}</span>
                    <span className="text-green-400">{formatCurrency(p.net)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Full Player Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] text-gray-500 font-semibold tracking-wider" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <th className="text-left py-2">PLAYER</th>
              <th className="text-center py-2">SQ</th>
              <th className="text-right py-2">BET</th>
              <th className="text-right py-2">WON</th>
              <th className="text-right py-2">NET</th>
            </tr>
          </thead>
          <tbody>
            {players.map(player => (
              <tr key={player.initials} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td className="py-2">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0"
                      style={{ background: getPlayerColor(player.initials), color: '#fff' }}
                    >
                      {player.initials.charAt(0)}
                    </div>
                    <span className="font-semibold">{player.initials}</span>
                  </div>
                </td>
                <td className="text-center py-2 text-gray-400">{player.squareCount}</td>
                <td className="text-right py-2 text-gray-400">
                  {formatCurrency(player.betAmount)}
                </td>
                <td className="text-right py-2">
                  {player.winnings > 0 ? (
                    <span className="text-green-400">{formatCurrency(player.winnings)}</span>
                  ) : (
                    <span className="text-gray-500">-</span>
                  )}
                </td>
                <td className={`text-right py-2 font-bold ${
                  player.net > 0 ? 'text-green-400' :
                  player.net < 0 ? 'text-red-400' :
                  'text-gray-400'
                }`}>
                  {player.net > 0 ? '+' : ''}{formatCurrency(player.net)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Quarter Win Details */}
      {players.some(p => p.quarterWins.length > 0) && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="text-[10px] text-gray-500 font-semibold tracking-wider mb-2">QUARTER WINS</div>
          <div className="space-y-1 text-sm">
            {players
              .filter(p => p.quarterWins.length > 0)
              .map(p => (
                <div key={p.initials} className="flex justify-between">
                  <span className="font-semibold">{p.initials}</span>
                  <span className="text-gray-400">
                    {p.quarterWins.map(q => getQuarterName(q.quarter)).join(', ')}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default PlayerStats;
