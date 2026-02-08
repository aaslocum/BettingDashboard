import { useState, useEffect, useCallback } from 'react';
import { formatOdds, getOddsColorClass, formatCurrency } from '../utils/helpers';

function BetsAdmin({ gameId }) {
  const [bets, setBets] = useState([]);
  const [betStats, setBetStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(null);

  const fetchBets = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (gameId) params.append('gameId', gameId);
      const response = await fetch(`/api/game/bets?${params}`);
      if (response.ok) {
        const data = await response.json();
        setBets(data.bets || []);
      }
    } catch (err) { /* silent */ }
  }, [gameId]);

  const fetchStats = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (gameId) params.append('gameId', gameId);
      const response = await fetch(`/api/game/bets/stats?${params}`);
      if (response.ok) {
        setBetStats(await response.json());
      }
    } catch (err) { /* silent */ }
    finally { setLoading(false); }
  }, [gameId]);

  useEffect(() => {
    fetchBets();
    fetchStats();
    const interval = setInterval(() => {
      fetchBets();
      fetchStats();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchBets, fetchStats]);

  const handleSettle = async (betId, outcome) => {
    setSettling(betId);
    try {
      const response = await fetch(`/api/game/bets/${betId}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, outcome }),
      });
      if (response.ok) {
        fetchBets();
        fetchStats();
      }
    } catch (err) { /* silent */ }
    finally { setSettling(null); }
  };

  const handleBulkSettle = async (outcome) => {
    const pendingCount = bets.filter(b => b.status === 'pending').length;
    if (pendingCount === 0) return;
    if (!confirm(`Mark all ${pendingCount} pending bets as "${outcome}"?`)) return;
    try {
      const response = await fetch('/api/game/bets/bulk-settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, outcome }),
      });
      if (response.ok) {
        fetchBets();
        fetchStats();
      }
    } catch (err) { /* silent */ }
  };

  if (loading) {
    return (
      <div className="card">
        <h2 className="text-sm font-bold tracking-wider uppercase mb-4" style={{ color: 'var(--nbc-gold)' }}>
          Betting Ledger
        </h2>
        <p className="text-gray-500 text-sm text-center">Loading...</p>
      </div>
    );
  }

  if (bets.length === 0) {
    return (
      <div className="card">
        <h2 className="text-sm font-bold tracking-wider uppercase mb-4" style={{ color: 'var(--nbc-gold)' }}>
          Betting Ledger
        </h2>
        <p className="text-gray-500 text-sm text-center">No bets placed yet</p>
      </div>
    );
  }

  const pending = bets.filter(b => b.status === 'pending');
  const settled = bets.filter(b => b.status !== 'pending');

  return (
    <div className="card">
      <h2 className="text-sm font-bold tracking-wider uppercase mb-4" style={{ color: 'var(--nbc-gold)' }}>
        Betting Ledger
      </h2>

      {/* Summary Bar */}
      {betStats && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded p-2 text-center" style={{ background: 'rgba(0,0,0,0.25)' }}>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Total Wagered</div>
            <div className="text-xs text-gray-600 mb-0.5">All players combined</div>
            <div className="text-sm font-bold text-white">{formatCurrency(betStats.house?.totalWagered || betStats.totals?.totalWagered || 0)}</div>
          </div>
          <div className="rounded p-2 text-center" style={{ background: 'rgba(0,0,0,0.25)' }}>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Pending Liability</div>
            <div className="text-xs text-gray-600 mb-0.5">If every bet wins</div>
            <div className="text-sm font-bold text-yellow-400">{formatCurrency(betStats.house?.pendingLiability || betStats.totals?.totalPendingLiability || 0)}</div>
          </div>
          <div className="rounded p-2 text-center" style={{ background: 'rgba(0,0,0,0.25)' }}>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">House P/L</div>
            <div className="text-xs text-gray-600 mb-0.5">Settled bets only</div>
            <div className={`text-sm font-bold ${(betStats.house?.netPosition ?? betStats.totals?.houseProfit ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {(betStats.house?.netPosition ?? betStats.totals?.houseProfit ?? 0) >= 0 ? '+' : ''}{formatCurrency(betStats.house?.netPosition ?? betStats.totals?.houseProfit ?? 0)}
            </div>
          </div>
        </div>
      )}

      {/* Pending Bets */}
      {pending.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest">
              Pending ({pending.length})
            </h3>
            {/* Bulk Settle Buttons */}
            <div className="flex gap-1">
              <button
                onClick={() => handleBulkSettle('lost')}
                className="px-2 py-0.5 rounded text-[9px] font-bold bg-red-600/50 hover:bg-red-600 transition-colors"
              >
                All Lost
              </button>
              <button
                onClick={() => handleBulkSettle('void')}
                className="px-2 py-0.5 rounded text-[9px] font-bold bg-gray-600/50 hover:bg-gray-600 transition-colors"
              >
                Void All
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            {pending.map(bet => {
              const displayOdds = bet.type === 'parlay' ? bet.combinedOdds : bet.selection?.odds;
              return (
                <div key={bet.id} className="rounded px-2.5 py-2" style={{ background: 'rgba(0,0,0,0.2)' }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold px-1 py-0.5 rounded" style={{ background: 'rgba(212,175,55,0.2)', color: 'var(--nbc-gold)' }}>
                          {bet.playerInitials}
                        </span>
                        {bet.type === 'parlay' && (
                          <span className="text-[8px] font-bold px-1 py-0.5 rounded" style={{ background: 'rgba(212,175,55,0.1)', color: 'var(--nbc-gold)' }}>
                            PARLAY
                          </span>
                        )}
                        <span className="text-xs text-white font-medium truncate">{bet.description}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {displayOdds !== undefined && (
                          <span className={`text-xs font-bold ${getOddsColorClass(displayOdds)}`}>
                            {formatOdds(displayOdds)}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-500">
                          {formatCurrency(bet.wager)} to win {formatCurrency(bet.potentialPayout)}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleSettle(bet.id, 'won')}
                        disabled={settling === bet.id}
                        className="px-2 py-1 rounded text-[10px] font-bold bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        Won
                      </button>
                      <button
                        onClick={() => handleSettle(bet.id, 'lost')}
                        disabled={settling === bet.id}
                        className="px-2 py-1 rounded text-[10px] font-bold bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        Lost
                      </button>
                      <button
                        onClick={() => handleSettle(bet.id, 'push')}
                        disabled={settling === bet.id}
                        className="px-2 py-1 rounded text-[10px] font-bold bg-gray-600 hover:bg-gray-700 transition-colors disabled:opacity-50"
                      >
                        Push
                      </button>
                      <button
                        onClick={() => handleSettle(bet.id, 'void')}
                        disabled={settling === bet.id}
                        className="px-2 py-1 rounded text-[10px] font-bold bg-purple-600/70 hover:bg-purple-600 transition-colors disabled:opacity-50"
                      >
                        Void
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Settled Bets */}
      {settled.length > 0 && (
        <div className="mb-4">
          <h3 className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-widest">
            Settled ({settled.length})
          </h3>
          <div className="space-y-1">
            {settled.map(bet => {
              const statusColors = {
                won: 'text-green-400',
                lost: 'text-red-400',
                push: 'text-gray-400',
                void: 'text-purple-400',
                cancelled: 'text-gray-500'
              };
              return (
                <div key={bet.id} className="flex items-center justify-between rounded px-2.5 py-1.5 text-xs" style={{ background: 'rgba(0,0,0,0.15)' }}>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] font-bold px-1 py-0.5 rounded" style={{ background: 'rgba(212,175,55,0.15)', color: 'var(--nbc-gold)' }}>
                      {bet.playerInitials}
                    </span>
                    <span className="text-gray-400 truncate">{bet.description}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-gray-500">{formatCurrency(bet.wager)}</span>
                    <span className={`font-bold uppercase ${statusColors[bet.status] || 'text-gray-400'}`}>
                      {bet.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Per-Player Breakdown */}
      {betStats?.players && betStats.players.length > 0 && (
        <div>
          <h3 className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-widest">
            By Player
          </h3>
          <div className="rounded overflow-hidden" style={{ background: 'rgba(0,0,0,0.25)' }}>
            <div className="grid grid-cols-12 gap-1 text-[10px] text-gray-600 px-3 py-1.5 font-semibold tracking-wider" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="col-span-3">PLAYER</span>
              <span className="col-span-2 text-center">BETS</span>
              <span className="col-span-2 text-center">WAGER</span>
              <span className="col-span-2 text-center">WON</span>
              <span className="col-span-3 text-center">NET</span>
            </div>
            {betStats.players.map((p) => (
              <div key={p.playerId} className="grid grid-cols-12 gap-1 px-3 py-1.5 text-xs" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <div className="col-span-3 flex items-center gap-1">
                  <span className="font-bold" style={{ color: 'var(--nbc-gold)' }}>{p.initials}</span>
                </div>
                <span className="col-span-2 text-center text-gray-400">{p.totalBets}</span>
                <span className="col-span-2 text-center text-gray-400">{formatCurrency(p.totalWagered)}</span>
                <span className="col-span-2 text-center text-green-400">{formatCurrency(p.totalWon)}</span>
                <span className={`col-span-3 text-center font-bold ${p.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {p.net >= 0 ? '+' : ''}{formatCurrency(p.net)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default BetsAdmin;
