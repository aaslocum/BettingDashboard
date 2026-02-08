import { useState, useMemo, useCallback, useEffect } from 'react';
import { formatOdds, getOddsColorClass, calculateParlayDecimalOdds, calculateParlayMaxWager, decimalToAmerican } from '../utils/helpers';
import ParlayLegsSummary from './ParlayLegsSummary';

const MAX_PAYOUT = 100;

// Category labels for player props
const categoryLabels = {
  'all': 'All',
  'player_pass_yds': 'Pass Yds',
  'player_pass_tds': 'Pass TDs',
  'player_rush_yds': 'Rush Yds',
  'player_receptions': 'Rec',
  'player_reception_yds': 'Rec Yds',
  'player_anytime_td': 'Any TD'
};

// Generate a unique key for a bet leg to detect conflicts
function makeLegId(type, market, outcome, point) {
  if (type === 'prop') {
    return `prop__${market}__${outcome}__${point ?? 'null'}`;
  }
  return `game__${market}__${outcome}`;
}

// Generate a conflict group key — bets in the same group are mutually exclusive
function makeConflictGroup(type, market, outcome, point) {
  if (type === 'prop') {
    // Same player + same market + same line = conflict group
    return `prop__${market}__${outcome}__${point ?? 'null'}`;
  }
  // Same market key for game odds (can't pick both sides of moneyline, spread, etc.)
  return `game__${market}`;
}

function ParlayModal({ oddsData, propsData, onPlace, onClose }) {
  const [legs, setLegs] = useState([]);
  const [wager, setWager] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');

  // Prevent background scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Calculate combined odds
  const combinedDecimal = useMemo(() => {
    if (legs.length < 2) return 1;
    return calculateParlayDecimalOdds(legs.map(l => l.odds));
  }, [legs]);

  const combinedOdds = useMemo(() => {
    if (legs.length < 2) return 0;
    return decimalToAmerican(combinedDecimal);
  }, [combinedDecimal, legs.length]);

  const maxWager = useMemo(() => calculateParlayMaxWager(combinedDecimal, MAX_PAYOUT), [combinedDecimal]);

  const parlayPayout = useMemo(() => {
    if (combinedDecimal <= 1 || !wager) return 0;
    return Math.round(wager * (combinedDecimal - 1) * 100) / 100;
  }, [combinedDecimal, wager]);

  const isValid = legs.length >= 2 && wager >= 0.25 && wager <= maxWager && parlayPayout <= MAX_PAYOUT;

  // Build a set of selected leg IDs for quick lookup
  const selectedIds = useMemo(() => new Set(legs.map(l => l.id)), [legs]);

  // Toggle a leg on/off
  const toggleLeg = useCallback((legData) => {
    setLegs(prev => {
      const existing = prev.find(l => l.id === legData.id);
      if (existing) {
        // Remove if already selected
        return prev.filter(l => l.id !== legData.id);
      }

      // Check for conflict (same market group) — replace if found
      const conflictGroup = makeConflictGroup(legData.type, legData.market, legData.outcome, legData.point);
      const withoutConflict = prev.filter(l => {
        const lg = makeConflictGroup(l.type, l.market, l.outcome, l.point);
        return lg !== conflictGroup;
      });

      return [...withoutConflict, legData];
    });
  }, []);

  const removeLeg = useCallback((legId) => {
    setLegs(prev => prev.filter(l => l.id !== legId));
  }, []);

  const handlePlace = async () => {
    if (!isValid) return;
    setPlacing(true);
    setError('');
    try {
      await onPlace(wager, legs);
    } catch (err) {
      setError(err.message);
      setPlacing(false);
    }
  };

  // Extract game odds data
  const game = oddsData?.games?.[0];
  const draftkings = game?.bookmakers?.find(b => b.key === 'draftkings') || game?.bookmakers?.[0];
  const h2h = draftkings?.markets?.find(m => m.key === 'h2h');
  const spreads = draftkings?.markets?.find(m => m.key === 'spreads');
  const totals = draftkings?.markets?.find(m => m.key === 'totals');

  // Extract player props data
  const allProps = propsData?.games?.[0]?.props || [];
  const propCategories = ['all', ...new Set(allProps.map(p => p.market))];
  const filteredProps = selectedCategory === 'all'
    ? allProps
    : allProps.filter(p => p.market === selectedCategory);

  const groupedByPlayer = {};
  filteredProps.forEach(prop => {
    if (!groupedByPlayer[prop.player]) {
      groupedByPlayer[prop.player] = [];
    }
    groupedByPlayer[prop.player].push(prop);
  });

  // Helper to check if a specific bet is selected
  const isSelected = (id) => selectedIds.has(id);

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(0,0,0,0.92)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ background: 'var(--nbc-navy)', borderBottom: '2px solid var(--nbc-gold)' }}>
        <h2 className="text-sm font-bold tracking-widest uppercase" style={{ color: 'var(--nbc-gold)' }}>
          BUILD PARLAY
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-xl leading-none px-2"
        >
          ✕
        </button>
      </div>

      {/* Sticky Summary */}
      <div className="sticky top-0 z-10">
        <ParlayLegsSummary
          legs={legs}
          combinedOdds={combinedOdds}
          combinedDecimal={combinedDecimal}
          wager={wager}
          maxPayout={MAX_PAYOUT}
          onRemoveLeg={removeLeg}
          onWagerChange={setWager}
          onPlace={handlePlace}
          placing={placing}
          error={error}
          isValid={isValid}
        />
      </div>

      {/* Scrollable Bet Selection */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">

        {/* GAME ODDS SECTION */}
        {game && (
          <div>
            <div className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: 'var(--nbc-gold)' }}>
              GAME ODDS
            </div>

            <div className="text-center mb-2">
              <span className="text-xs font-semibold text-gray-300">{game.awayTeam}</span>
              <span className="text-gray-600 mx-2 text-[10px]">@</span>
              <span className="text-xs font-semibold text-gray-300">{game.homeTeam}</span>
            </div>

            {/* Moneyline */}
            {h2h && (
              <div className="rounded p-3 mb-2" style={{ background: 'rgba(0,0,0,0.3)' }}>
                <div className="text-[10px] text-gray-600 mb-2 font-semibold tracking-wider">MONEYLINE</div>
                <div className="flex justify-around gap-2">
                  {h2h.outcomes?.map((o) => {
                    const legId = makeLegId('moneyline', 'h2h', o.name, null);
                    const selected = isSelected(legId);
                    return (
                      <button
                        key={o.name}
                        onClick={() => toggleLeg({
                          id: legId,
                          type: 'moneyline',
                          market: 'h2h',
                          outcome: o.name,
                          odds: o.price,
                          point: null,
                          description: `${o.name} Moneyline`
                        })}
                        className={`flex-1 text-center rounded p-2 transition-all ${
                          selected
                            ? 'ring-2 ring-yellow-500 bg-yellow-500/10'
                            : 'hover:bg-white/5'
                        }`}
                        style={!selected ? { background: 'rgba(0,0,0,0.2)' } : {}}
                      >
                        <div className="text-[10px] text-gray-400 mb-1">{o.name}</div>
                        <div className={`text-base font-bold ${getOddsColorClass(o.price)}`}>
                          {formatOdds(o.price)}
                        </div>
                        {selected && (
                          <div className="text-[8px] font-bold mt-0.5" style={{ color: 'var(--nbc-gold)' }}>✓ ADDED</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Spread & Totals */}
            <div className="grid grid-cols-2 gap-2">
              {spreads && (
                <div className="rounded p-3" style={{ background: 'rgba(0,0,0,0.3)' }}>
                  <div className="text-[10px] text-gray-600 mb-2 font-semibold tracking-wider">SPREAD</div>
                  {spreads.outcomes?.map((o) => {
                    const legId = makeLegId('spread', 'spreads', o.name, o.point);
                    const selected = isSelected(legId);
                    return (
                      <button
                        key={o.name}
                        onClick={() => toggleLeg({
                          id: legId,
                          type: 'spread',
                          market: 'spreads',
                          outcome: o.name,
                          odds: o.price,
                          point: o.point,
                          description: `${o.name} ${o.point > 0 ? '+' : ''}${o.point}`
                        })}
                        className={`w-full flex justify-between items-center text-sm mb-1 rounded px-2 py-1.5 transition-all ${
                          selected
                            ? 'ring-2 ring-yellow-500 bg-yellow-500/10'
                            : 'hover:bg-white/5'
                        }`}
                        style={!selected ? { background: 'rgba(0,0,0,0.15)' } : {}}
                      >
                        <span className="text-gray-300 text-xs truncate">{o.name.split(' ').pop()}</span>
                        <span className="font-bold text-xs" style={{ color: 'var(--nbc-gold)' }}>
                          {o.point > 0 ? '+' : ''}{o.point}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {totals && (
                <div className="rounded p-3" style={{ background: 'rgba(0,0,0,0.3)' }}>
                  <div className="text-[10px] text-gray-600 mb-2 font-semibold tracking-wider">TOTAL</div>
                  {totals.outcomes?.map((o) => {
                    const legId = makeLegId('totals', 'totals', o.name, o.point);
                    const selected = isSelected(legId);
                    return (
                      <button
                        key={o.name}
                        onClick={() => toggleLeg({
                          id: legId,
                          type: 'totals',
                          market: 'totals',
                          outcome: o.name,
                          odds: o.price,
                          point: o.point,
                          description: `${o.name} ${o.point} Total Points`
                        })}
                        className={`w-full flex justify-between items-center text-sm mb-1 rounded px-2 py-1.5 transition-all ${
                          selected
                            ? 'ring-2 ring-yellow-500 bg-yellow-500/10'
                            : 'hover:bg-white/5'
                        }`}
                        style={!selected ? { background: 'rgba(0,0,0,0.15)' } : {}}
                      >
                        <span className="text-gray-300 text-xs">{o.name}</span>
                        <span className="text-blue-400 font-bold text-xs">{o.point}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PLAYER PROPS SECTION */}
        {allProps.length > 0 && (
          <div>
            <div className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: 'var(--nbc-gold)' }}>
              PLAYER PROPS
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-1 mb-2">
              {propCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-1 rounded text-[10px] font-semibold tracking-wide transition-colors ${
                    selectedCategory === cat
                      ? 'nbc-tab-active'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                  style={selectedCategory === cat ? {} : { background: 'rgba(0,0,0,0.25)' }}
                >
                  {categoryLabels[cat] || cat}
                </button>
              ))}
            </div>

            {/* Props grouped by player */}
            <div className="space-y-2">
              {Object.entries(groupedByPlayer).map(([player, playerProps]) => (
                <div key={player} className="rounded p-3" style={{ background: 'rgba(0,0,0,0.3)' }}>
                  <div className="font-semibold text-white mb-2 text-xs">{player}</div>
                  <div className="space-y-1">
                    {playerProps.map((prop, idx) => {
                      const legId = makeLegId('prop', prop.marketName, prop.player, `${prop.name}_${prop.line}`);
                      const selected = isSelected(legId);
                      return (
                        <button
                          key={idx}
                          onClick={() => toggleLeg({
                            id: legId,
                            type: 'prop',
                            market: prop.marketName,
                            outcome: prop.player,
                            odds: prop.odds,
                            point: prop.line,
                            name: prop.name,
                            description: `${prop.player} ${prop.marketName} ${prop.name}${prop.line !== null ? ' ' + prop.line : ''}`
                          })}
                          className={`w-full flex justify-between items-center text-xs rounded px-2 py-1.5 transition-all ${
                            selected
                              ? 'ring-2 ring-yellow-500 bg-yellow-500/10'
                              : 'hover:bg-white/5'
                          }`}
                          style={!selected ? { background: 'rgba(0,0,0,0.15)' } : {}}
                        >
                          <span className="text-gray-400 text-left">
                            {prop.marketName}
                            {prop.line !== null && (
                              <span className="ml-1">({prop.name} {prop.line})</span>
                            )}
                            {prop.line === null && prop.name !== 'Yes' && (
                              <span className="ml-1">({prop.name})</span>
                            )}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className={`font-bold ${getOddsColorClass(prop.odds)}`}>
                              {formatOdds(prop.odds)}
                            </span>
                            {selected && (
                              <span className="text-[8px] font-bold" style={{ color: 'var(--nbc-gold)' }}>✓</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom padding for scroll */}
        <div className="h-4" />
      </div>
    </div>
  );
}

export default ParlayModal;
