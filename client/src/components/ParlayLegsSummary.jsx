import { useMemo } from 'react';
import { formatOdds, getOddsColorClass, formatCurrency, calculateParlayMaxWager } from '../utils/helpers';

function ParlayLegsSummary({
  legs,
  combinedOdds,
  combinedDecimal,
  wager,
  maxPayout = 100,
  onRemoveLeg,
  onWagerChange,
  onPlace,
  placing,
  error,
  isValid
}) {
  const maxWager = useMemo(() => calculateParlayMaxWager(combinedDecimal, maxPayout), [combinedDecimal, maxPayout]);
  const parlayPayout = useMemo(() => {
    if (combinedDecimal <= 1 || !wager) return 0;
    return Math.round(wager * (combinedDecimal - 1) * 100) / 100;
  }, [combinedDecimal, wager]);

  return (
    <div className="px-3 py-3" style={{ background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid rgba(212,175,55,0.2)' }}>
      {/* Selected Legs Chips */}
      {legs.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-thin">
          {legs.map((leg) => (
            <div
              key={leg.id}
              className="flex-shrink-0 flex items-center gap-1.5 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)' }}
            >
              <span className="text-[10px] text-white font-medium max-w-[120px] truncate">
                {leg.description}
              </span>
              <span className={`text-[10px] font-bold ${getOddsColorClass(leg.odds)}`}>
                {formatOdds(leg.odds)}
              </span>
              <button
                onClick={() => onRemoveLeg(leg.id)}
                className="text-gray-500 hover:text-red-400 transition-colors ml-0.5 text-xs leading-none"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Combined Odds Display */}
      {legs.length >= 2 && (
        <div className="flex items-center justify-between rounded px-3 py-2 mb-2" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div className="text-xs text-gray-400">
            {legs.length}-Leg Parlay Odds
          </div>
          <div className={`text-lg font-bold ${getOddsColorClass(combinedOdds)}`}>
            {formatOdds(combinedOdds)}
          </div>
        </div>
      )}

      {/* Wager Input */}
      {legs.length >= 2 && (
        <>
          <div className="mb-2">
            <label className="text-[10px] text-gray-500 block mb-1">
              Wager (max {formatCurrency(maxWager)} for ${maxPayout} payout)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">$</span>
              <input
                type="number"
                min="0.25"
                max={maxWager}
                step="0.25"
                value={wager}
                onChange={(e) => onWagerChange(Math.max(0, parseFloat(e.target.value) || 0))}
                className="input-field flex-1 text-sm font-bold"
              />
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex gap-1.5 mt-1.5">
              {[0.50, 1, 2, 5].filter(v => v <= maxWager).map(amount => (
                <button
                  key={amount}
                  onClick={() => onWagerChange(amount)}
                  className={`flex-1 py-1 rounded text-[10px] font-semibold transition-colors ${
                    wager === amount ? 'nbc-tab-active' : 'text-gray-500 hover:text-gray-300'
                  }`}
                  style={wager !== amount ? { background: 'rgba(0,0,0,0.25)' } : {}}
                >
                  ${amount}
                </button>
              ))}
              <button
                onClick={() => onWagerChange(maxWager)}
                className={`flex-1 py-1 rounded text-[10px] font-semibold transition-colors ${
                  wager === maxWager ? 'nbc-tab-active' : 'text-gray-500 hover:text-gray-300'
                }`}
                style={wager !== maxWager ? { background: 'rgba(0,0,0,0.25)' } : {}}
              >
                Max
              </button>
            </div>
          </div>

          {/* Payout Preview */}
          <div className="rounded px-3 py-2 mb-2" style={{ background: 'rgba(0,0,0,0.3)' }}>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-gray-500">Wager</span>
              <span className="text-white font-semibold">{formatCurrency(wager)}</span>
            </div>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-gray-500">Potential Win</span>
              <span className="text-green-400 font-bold">{formatCurrency(parlayPayout)}</span>
            </div>
            <div className="flex justify-between text-xs pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="text-gray-500">Total Return</span>
              <span className="font-bold" style={{ color: 'var(--nbc-gold)' }}>
                {formatCurrency(wager + parlayPayout)}
              </span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="text-red-400 text-xs text-center mb-2">{error}</div>
          )}

          {/* Place Parlay Button */}
          <button
            onClick={onPlace}
            disabled={!isValid || placing}
            className="btn-success w-full text-sm font-bold py-2.5"
          >
            {placing ? 'Placing...' : `Place ${legs.length}-Leg Parlay · ${formatCurrency(wager)}`}
          </button>
        </>
      )}

      {/* Empty state */}
      {legs.length === 0 && (
        <div className="text-center text-xs text-gray-500 py-1">
          Tap bets below to add legs to your parlay
        </div>
      )}
      {legs.length === 1 && (
        <div className="text-center text-xs text-yellow-500 py-1">
          Add at least 1 more leg to build a parlay
        </div>
      )}
    </div>
  );
}

export default ParlayLegsSummary;
