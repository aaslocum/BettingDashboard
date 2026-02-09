import { useState, useEffect, useCallback } from 'react';
import { formatCurrency } from '../utils/helpers';

function AccountSettlement() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [expandedPlayers, setExpandedPlayers] = useState(new Set());

  const fetchSettlement = useCallback(async () => {
    try {
      const response = await fetch('/api/games/settlement');
      if (response.ok) {
        setData(await response.json());
      }
    } catch (err) { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchSettlement();
  }, [fetchSettlement]);

  useEffect(() => {
    if (!expanded) return;
    const interval = setInterval(fetchSettlement, 15000);
    return () => clearInterval(interval);
  }, [expanded, fetchSettlement]);

  const togglePlayer = (initials) => {
    setExpandedPlayers(prev => {
      const next = new Set(prev);
      if (next.has(initials)) next.delete(initials);
      else next.add(initials);
      return next;
    });
  };

  return (
    <div className="card">
      <button
        onClick={() => { setExpanded(!expanded); if (!expanded) fetchSettlement(); }}
        className="w-full flex justify-between items-center"
      >
        <h2 className="text-sm font-bold tracking-wider uppercase" style={{ color: 'var(--nbc-gold)' }}>
          Account Settlement
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">All Games</span>
          <span className="text-gray-500 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="mt-4">
          {loading ? (
            <p className="text-gray-500 text-sm text-center py-2">Loading...</p>
          ) : !data || data.players.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-2">No player data yet</p>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="rounded p-2.5 text-center" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <div className="text-[10px] text-red-400/70 uppercase tracking-wider font-semibold">To Collect</div>
                  <div className="text-sm font-bold text-red-400 mt-0.5">
                    {formatCurrency(data.summary.toCollect)}
                  </div>
                </div>
                <div className="rounded p-2.5 text-center" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                  <div className="text-[10px] text-green-400/70 uppercase tracking-wider font-semibold">To Pay Out</div>
                  <div className="text-sm font-bold text-green-400 mt-0.5">
                    {formatCurrency(data.summary.toPayOut)}
                  </div>
                </div>
                <div className="rounded p-2.5 text-center" style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)' }}>
                  <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'rgba(212,175,55,0.7)' }}>House Balance</div>
                  <div className={`text-sm font-bold mt-0.5 ${data.summary.houseBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {data.summary.houseBalance >= 0 ? '+' : ''}{formatCurrency(data.summary.houseBalance)}
                  </div>
                </div>
              </div>

              {/* Settlement Table */}
              <div className="rounded overflow-hidden" style={{ background: 'rgba(0,0,0,0.25)' }}>
                {/* Header */}
                <div className="grid grid-cols-12 gap-1 text-[10px] text-gray-600 px-3 py-2 font-semibold tracking-wider" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <span className="col-span-2">PLAYER</span>
                  <span className="col-span-2 text-center">SQ COST</span>
                  <span className="col-span-2 text-center">SQ WON</span>
                  <span className="col-span-2 text-center">BET LOST</span>
                  <span className="col-span-2 text-center">BET WON</span>
                  <span className="col-span-2 text-right">SETTLE</span>
                </div>

                {/* Player Rows */}
                {data.players.map((p) => {
                  const isPlayerExpanded = expandedPlayers.has(p.initials);
                  const hasMultipleGames = p.games.length > 1;

                  return (
                    <div key={p.initials}>
                      <div
                        className={`grid grid-cols-12 gap-1 px-3 py-2 text-xs items-center ${hasMultipleGames ? 'cursor-pointer hover:bg-white/5' : ''}`}
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                        onClick={() => hasMultipleGames && togglePlayer(p.initials)}
                      >
                        <div className="col-span-2 flex items-center gap-1">
                          {hasMultipleGames && (
                            <span className="text-[8px] text-gray-600 inline-block transition-transform" style={{ transform: isPlayerExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                          )}
                          <span className="font-bold" style={{ color: 'var(--nbc-gold)' }}>{p.initials}</span>
                        </div>
                        <span className="col-span-2 text-center text-gray-400">
                          {p.squaresCost > 0 ? formatCurrency(p.squaresCost) : '-'}
                        </span>
                        <span className="col-span-2 text-center text-green-400/80">
                          {p.squaresWon > 0 ? formatCurrency(p.squaresWon) : '-'}
                        </span>
                        <span className="col-span-2 text-center text-red-400/80">
                          {p.betsLost > 0 ? formatCurrency(p.betsLost) : '-'}
                        </span>
                        <span className="col-span-2 text-center text-green-400/80">
                          {p.betsWon > 0 ? formatCurrency(p.betsWon) : '-'}
                        </span>
                        <div className="col-span-2 text-right">
                          {p.totalNet === 0 ? (
                            <span className="text-gray-500 font-bold">EVEN</span>
                          ) : p.totalNet > 0 ? (
                            <span className="text-green-400 font-bold">+{formatCurrency(p.totalNet)}</span>
                          ) : (
                            <span className="text-red-400 font-bold">{formatCurrency(p.totalNet)}</span>
                          )}
                        </div>
                      </div>

                      {/* Per-game breakdown */}
                      {isPlayerExpanded && p.games.map(g => (
                        <div
                          key={g.id}
                          className="grid grid-cols-12 gap-1 px-3 py-1.5 text-[10px] items-center"
                          style={{ background: 'rgba(0,0,0,0.15)', borderBottom: '1px solid rgba(255,255,255,0.02)' }}
                        >
                          <div className="col-span-2 text-gray-600 pl-4 truncate" title={g.name}>
                            {g.name}
                          </div>
                          <span className="col-span-2 text-center text-gray-500">
                            {g.squaresCost > 0 ? formatCurrency(g.squaresCost) : '-'}
                          </span>
                          <span className="col-span-2 text-center text-green-400/50">
                            {g.squaresWon > 0 ? formatCurrency(g.squaresWon) : '-'}
                          </span>
                          <span className="col-span-2 text-center text-red-400/50">
                            {g.betsLost > 0 ? formatCurrency(g.betsLost) : '-'}
                          </span>
                          <span className="col-span-2 text-center text-green-400/50">
                            {g.betsWon > 0 ? formatCurrency(g.betsWon) : '-'}
                          </span>
                          <span className={`col-span-2 text-right font-semibold ${g.totalNet > 0 ? 'text-green-400/60' : g.totalNet < 0 ? 'text-red-400/60' : 'text-gray-600'}`}>
                            {g.totalNet === 0 ? '-' : `${g.totalNet > 0 ? '+' : ''}${formatCurrency(g.totalNet)}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>

              {/* Action Summary - Who owes / who gets paid */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                {/* Collect from */}
                <div className="rounded-lg p-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                  <div className="text-[10px] font-bold text-red-400/80 uppercase tracking-wider mb-2">
                    Collect From
                  </div>
                  {data.players.filter(p => p.totalNet < 0).length === 0 ? (
                    <p className="text-xs text-gray-600">Nobody</p>
                  ) : (
                    <div className="space-y-1">
                      {data.players.filter(p => p.totalNet < 0).map(p => (
                        <div key={p.initials} className="flex justify-between text-xs">
                          <span className="text-gray-400 font-semibold">{p.initials}</span>
                          <span className="text-red-400 font-bold">{formatCurrency(Math.abs(p.totalNet))}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pay out to */}
                <div className="rounded-lg p-3" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)' }}>
                  <div className="text-[10px] font-bold text-green-400/80 uppercase tracking-wider mb-2">
                    Pay Out To
                  </div>
                  {data.players.filter(p => p.totalNet > 0).length === 0 ? (
                    <p className="text-xs text-gray-600">Nobody</p>
                  ) : (
                    <div className="space-y-1">
                      {data.players.filter(p => p.totalNet > 0).map(p => (
                        <div key={p.initials} className="flex justify-between text-xs">
                          <span className="text-gray-400 font-semibold">{p.initials}</span>
                          <span className="text-green-400 font-bold">{formatCurrency(p.totalNet)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Pending Bets Warning */}
              {data.players.some(p => p.betsWagered > p.betsWon + p.betsLost) && (
                <div className="mt-3 p-2.5 rounded text-xs" style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.15)' }}>
                  <span className="text-yellow-500 font-semibold">Note:</span>
                  <span className="text-yellow-500/80 ml-1">
                    Some bets are still pending. Settlement amounts may change once all bets are settled.
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default AccountSettlement;
