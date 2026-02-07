import { useState, useMemo } from 'react';
import { formatOdds, getOddsColorClass, calculatePayout, calculateMaxWager, formatCurrency } from '../utils/helpers';

function BetSlipModal({ bet, onPlace, onClose }) {
  const maxPayout = 20;
  const maxWager = useMemo(() => calculateMaxWager(bet.odds, maxPayout), [bet.odds]);
  const [wager, setWager] = useState(Math.min(1, maxWager));
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');

  const payout = useMemo(() => {
    const val = calculatePayout(bet.odds, wager);
    return Math.round(val * 100) / 100;
  }, [bet.odds, wager]);

  const isValid = wager >= 0.25 && wager <= maxWager && payout < maxPayout;

  const handlePlace = async () => {
    if (!isValid) return;
    setPlacing(true);
    setError('');
    try {
      await onPlace(wager);
    } catch (err) {
      setError(err.message);
      setPlacing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-sm">
        <h2 className="text-sm font-bold tracking-wider uppercase mb-4" style={{ color: 'var(--nbc-gold)' }}>
          Place Bet
        </h2>

        {/* Bet Details */}
        <div className="rounded p-3 mb-4" style={{ background: 'rgba(0,0,0,0.25)' }}>
          <div className="text-sm font-semibold text-white mb-1">{bet.description}</div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Odds:</span>
            <span className={`font-bold ${getOddsColorClass(bet.odds)}`}>
              {formatOdds(bet.odds)}
            </span>
          </div>
        </div>

        {/* Wager Input */}
        <div className="mb-4">
          <label className="text-xs text-gray-400 block mb-1">
            Wager Amount (max {formatCurrency(maxWager)} for ${maxPayout} payout)
          </label>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-lg">$</span>
            <input
              type="number"
              min="0.25"
              max={maxWager}
              step="0.25"
              value={wager}
              onChange={(e) => setWager(Math.max(0, parseFloat(e.target.value) || 0))}
              className="input-field flex-1 text-lg font-bold"
            />
          </div>

          {/* Quick Amount Buttons */}
          <div className="flex gap-2 mt-2">
            {[0.50, 1, 2, 5].filter(v => v <= maxWager).map(amount => (
              <button
                key={amount}
                onClick={() => setWager(amount)}
                className={`flex-1 py-1 rounded text-xs font-semibold transition-colors ${
                  wager === amount ? 'nbc-tab-active' : 'text-gray-500 hover:text-gray-300'
                }`}
                style={wager !== amount ? { background: 'rgba(0,0,0,0.25)' } : {}}
              >
                ${amount}
              </button>
            ))}
            <button
              onClick={() => setWager(maxWager)}
              className={`flex-1 py-1 rounded text-xs font-semibold transition-colors ${
                wager === maxWager ? 'nbc-tab-active' : 'text-gray-500 hover:text-gray-300'
              }`}
              style={wager !== maxWager ? { background: 'rgba(0,0,0,0.25)' } : {}}
            >
              Max
            </button>
          </div>
        </div>

        {/* Payout Preview */}
        <div className="rounded p-3 mb-4" style={{ background: 'rgba(0,0,0,0.35)' }}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">Wager</span>
            <span className="text-white font-semibold">{formatCurrency(wager)}</span>
          </div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">Potential Win</span>
            <span className="text-green-400 font-bold">{formatCurrency(payout)}</span>
          </div>
          <div className="flex justify-between text-sm pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <span className="text-gray-400">Total Return</span>
            <span className="font-bold" style={{ color: 'var(--nbc-gold)' }}>
              {formatCurrency(wager + payout)}
            </span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="text-red-400 text-xs text-center mb-3">{error}</div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handlePlace}
            disabled={!isValid || placing}
            className="btn-success flex-1 text-sm font-bold"
          >
            {placing ? 'Placing...' : `Bet ${formatCurrency(wager)}`}
          </button>
          <button
            onClick={onClose}
            className="btn-secondary text-sm"
            style={{ padding: '8px 16px' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default BetSlipModal;
