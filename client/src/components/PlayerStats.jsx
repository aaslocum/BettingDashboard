import { useMemo } from 'react';
import { calculatePlayerStats, formatCurrency, getQuarterName } from '../utils/helpers';

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
        <h2 className="text-xl font-bold mb-4 text-yellow-400">Player Stats</h2>
        <p className="text-gray-400">No squares claimed yet</p>
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
                  <span className="font-semibold">{player.initials}</span>
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
      <h2 className="text-xl font-bold mb-4 text-yellow-400">Player Stats</h2>

      {/* Summary Bar */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-center">
        <div className="bg-gray-700 rounded p-2">
          <div className="text-xs text-gray-400">Collected</div>
          <div className="text-lg font-bold text-blue-400">
            {formatCurrency(totals.totalBets)}
          </div>
        </div>
        <div className="bg-gray-700 rounded p-2">
          <div className="text-xs text-gray-400">Paid Out</div>
          <div className="text-lg font-bold text-green-400">
            {formatCurrency(totals.totalPaidOut)}
          </div>
        </div>
        <div className="bg-gray-700 rounded p-2">
          <div className="text-xs text-gray-400">Remaining</div>
          <div className="text-lg font-bold text-yellow-400">
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
            <tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-2">Player</th>
              <th className="text-center py-2">Squares</th>
              <th className="text-right py-2">Bet</th>
              <th className="text-right py-2">Won</th>
              <th className="text-right py-2">Net</th>
            </tr>
          </thead>
          <tbody>
            {players.map(player => (
              <tr key={player.initials} className="border-b border-gray-700/50">
                <td className="py-2 font-semibold">{player.initials}</td>
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
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="text-sm text-gray-400 mb-2">Quarter Wins:</div>
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
