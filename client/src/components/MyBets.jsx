import { useState } from 'react';
import { formatOdds, getOddsColorClass, formatCurrency } from '../utils/helpers';

function MyBets({ bets }) {
  const [expanded, setExpanded] = useState(false);

  if (!bets || bets.length === 0) return null;

  const pending = bets.filter(b => b.status === 'pending');
  const settled = bets.filter(b => b.status !== 'pending');
  const totalWagered = bets.reduce((s, b) => s + b.wager, 0);
  const totalWon = settled.filter(b => b.status === 'won').reduce((s, b) => s + b.potentialPayout, 0);
  const totalLost = settled.filter(b => b.status === 'lost').reduce((s, b) => s + b.wager, 0);
  const net = totalWon - totalLost;

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
            <BetRow key={bet.id} bet={bet} />
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

function BetRow({ bet }) {
  const statusColors = {
    pending: 'text-yellow-400 bg-yellow-400/10',
    won: 'text-green-400 bg-green-400/10',
    lost: 'text-red-400 bg-red-400/10',
    push: 'text-gray-400 bg-gray-400/10'
  };

  return (
    <div className="flex items-center justify-between rounded px-2.5 py-2 text-sm" style={{ background: 'rgba(0,0,0,0.2)' }}>
      <div className="min-w-0 flex-1">
        <div className="text-white text-xs font-medium truncate">{bet.description}</div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-xs font-bold ${getOddsColorClass(bet.selection.odds)}`}>
            {formatOdds(bet.selection.odds)}
          </span>
          <span className="text-xs text-gray-500">
            {formatCurrency(bet.wager)} to win {formatCurrency(bet.potentialPayout)}
          </span>
        </div>
      </div>
      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${statusColors[bet.status]}`}>
        {bet.status}
      </span>
    </div>
  );
}

export default MyBets;
