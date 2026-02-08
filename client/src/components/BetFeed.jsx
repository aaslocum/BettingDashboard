import { useState, useEffect, useCallback } from 'react';
import { formatOdds, getOddsColorClass, formatCurrency, getPlayerColor } from '../utils/helpers';

function BetFeed({ gameId }) {
  const [bets, setBets] = useState([]);

  const fetchBets = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (gameId) params.append('gameId', gameId);
      const response = await fetch(`/api/game/bets?${params}`);
      if (response.ok) {
        const data = await response.json();
        setBets((data.bets || []).slice(-20).reverse());
      }
    } catch (err) { /* silent */ }
  }, [gameId]);

  useEffect(() => {
    fetchBets();
    const interval = setInterval(fetchBets, 10000);
    return () => clearInterval(interval);
  }, [fetchBets]);

  if (bets.length === 0) return null;

  const timeAgo = (timestamp) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ago`;
  };

  return (
    <section className="card">
      <h2 className="nbc-section-header mb-0 pb-0 border-0">
        <span className="card-header-accent"></span>
        BET FEED
      </h2>

      <div className="mt-3 space-y-1.5 max-h-[200px] overflow-y-auto">
        {bets.map(bet => {
          const color = getPlayerColor(bet.playerInitials);
          const displayOdds = bet.type === 'parlay' ? bet.combinedOdds : bet.selection?.odds;
          const statusIcon = bet.status === 'won' ? '+' : bet.status === 'lost' ? '-' : '';
          const statusColor = bet.status === 'won' ? 'text-green-400' : bet.status === 'lost' ? 'text-red-400' : 'text-yellow-400';

          return (
            <div key={bet.id} className="flex items-center gap-2 rounded px-2 py-1.5" style={{ background: 'rgba(0,0,0,0.15)' }}>
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                style={{ background: color, color: '#fff' }}
              >
                {bet.playerInitials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-white font-medium truncate">{bet.description}</span>
                  {bet.type === 'parlay' && (
                    <span className="text-[8px] font-bold px-1 rounded" style={{ background: 'rgba(212,175,55,0.2)', color: 'var(--nbc-gold)' }}>
                      PARLAY
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {displayOdds !== undefined && (
                    <span className={`text-[10px] font-bold ${getOddsColorClass(displayOdds)}`}>
                      {formatOdds(displayOdds)}
                    </span>
                  )}
                  <span className="text-[10px] text-gray-600">{formatCurrency(bet.wager)}</span>
                  <span className="text-[10px] text-gray-600">{timeAgo(bet.placedAt)}</span>
                </div>
              </div>
              <span className={`text-[10px] font-bold ${statusColor}`}>
                {statusIcon}{bet.status === 'won' ? formatCurrency(bet.potentialPayout) : bet.status === 'pending' ? 'LIVE' : bet.status.toUpperCase()}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default BetFeed;
