import { useState } from 'react';
import { formatOdds, getOddsColorClass, formatCurrency } from '../utils/helpers';

function MyBets({ bets, gameId, playerId, onBetCancelled }) {
  const [expanded, setExpanded] = useState(false);
  const [cancelling, setCancelling] = useState(null);

  if (!bets || bets.length === 0) return null;

  const pending = bets.filter(b => b.status === 'pending');
  const settled = bets.filter(b => b.status !== 'pending');
  const totalWagered = bets.reduce((s, b) => s + b.wager, 0);
  const totalWon = settled.filter(b => b.status === 'won').reduce((s, b) => s + b.potentialPayout, 0);
  const totalLost = settled.filter(b => b.status === 'lost').reduce((s, b) => s + b.wager, 0);
  const net = totalWon - totalLost;

  const handleCancel = async (betId, e) => {
    e.stopPropagation();
    if (!confirm('Cancel this bet?')) return;
    setCancelling(betId);
    try {
      const response = await fetch(`/api/game/bets/${betId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, playerId }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }
      if (onBetCancelled) onBetCancelled();
    } catch (err) {
      alert(err.message);
    } finally {
      setCancelling(null);
    }
  };

  return (
    <section className="card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex justify-between items-center"
      >
        <h2 className="nbc-section-header mb-0 pb-0 border-0">
          <span className="card-header-accent"></span>
          MY BETS
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            {pending.length} pending
          </span>
          {settled.length > 0 && (
            <span className={`text-xs font-bold ${net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {net >= 0 ? '+' : ''}{formatCurrency(net)}
            </span>
          )}
          <span className="text-gray-500 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="mt-3 space-y-1.5">
          {/* Pending bets first */}
          {pending.map(bet => (
            <BetRow key={bet.id} bet={bet} onCancel={handleCancel} cancelling={cancelling} />
          ))}

          {/* Settled bets */}
          {settled.map(bet => (
            <BetRow key={bet.id} bet={bet} />
          ))}

          {/* Summary */}
          {bets.length > 1 && (
            <div className="flex justify-between text-xs pt-2 mt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <span className="text-gray-500">
                {bets.length} bets · {formatCurrency(totalWagered)} wagered
              </span>
              {settled.length > 0 && (
                <span className={`font-bold ${net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  Net: {net >= 0 ? '+' : ''}{formatCurrency(net)}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function BetRow({ bet, onCancel, cancelling }) {
  const [showLegs, setShowLegs] = useState(false);
  const isParlay = bet.type === 'parlay';
  const displayOdds = isParlay ? bet.combinedOdds : bet.selection?.odds;

  const statusColors = {
    pending: 'text-yellow-400 bg-yellow-400/10',
    won: 'text-green-400 bg-green-400/10',
    lost: 'text-red-400 bg-red-400/10',
    push: 'text-gray-400 bg-gray-400/10',
    cancelled: 'text-gray-500 bg-gray-500/10',
    void: 'text-gray-500 bg-gray-500/10'
  };

  return (
    <div>
      <div
        className={`flex items-center justify-between rounded px-2.5 py-2 text-sm ${isParlay ? 'cursor-pointer' : ''}`}
        style={{ background: 'rgba(0,0,0,0.2)' }}
        onClick={isParlay ? () => setShowLegs(!showLegs) : undefined}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {isParlay && (
              <span className="text-[9px] font-bold px-1 py-0.5 rounded flex-shrink-0"
                    style={{ background: 'rgba(212,175,55,0.2)', color: 'var(--nbc-gold)' }}>
                PARLAY
              </span>
            )}
            <span className="text-white text-xs font-medium truncate">{bet.description}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {displayOdds !== undefined && (
              <span className={`text-xs font-bold ${getOddsColorClass(displayOdds)}`}>
                {formatOdds(displayOdds)}
              </span>
            )}
            <span className="text-xs text-gray-500">
              {formatCurrency(bet.wager)} to win {formatCurrency(bet.potentialPayout)}
            </span>
            {isParlay && (
              <span className="text-[10px] text-gray-600">{showLegs ? '▲' : '▼'}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {bet.status === 'pending' && onCancel && (
            <button
              onClick={(e) => onCancel(bet.id, e)}
              disabled={cancelling === bet.id}
              className="text-[10px] font-bold px-1.5 py-0.5 rounded text-red-400 bg-red-400/10 hover:bg-red-400/20 transition-colors disabled:opacity-50"
            >
              {cancelling === bet.id ? '...' : 'Cancel'}
            </button>
          )}
          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${statusColors[bet.status] || statusColors.pending}`}>
            {bet.status}
          </span>
        </div>
      </div>

      {/* Expanded parlay legs */}
      {isParlay && showLegs && bet.legs && (
        <div className="ml-4 mt-1 space-y-0.5">
          {bet.legs.map((leg, idx) => (
            <div key={idx} className="flex justify-between text-[11px] px-2 py-1 rounded"
                 style={{ background: 'rgba(0,0,0,0.1)' }}>
              <span className="text-gray-400 truncate mr-2">{leg.description}</span>
              <span className={`font-bold flex-shrink-0 ${getOddsColorClass(leg.odds)}`}>
                {formatOdds(leg.odds)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyBets;
