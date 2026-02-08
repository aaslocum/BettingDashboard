import { formatOdds, getOddsColorClass } from '../utils/helpers';

// Small trend-line chart icon
function ChartIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1,12 5,7 9,9 15,3" />
      <polyline points="11,3 15,3 15,7" />
    </svg>
  );
}

function OddsDisplay({ oddsData, displayMode = false, onBetClick, onChartClick }) {
  if (!oddsData || !oddsData.games || oddsData.games.length === 0) {
    return (
      <div className="card text-center">
        <p className="text-gray-400">No odds data available</p>
      </div>
    );
  }

  const game = oddsData.games[0]; // Main game
  const bookmakers = game.bookmakers || [];

  if (displayMode) {
    return <OddsDisplayTV game={game} bookmakers={bookmakers} onChartClick={onChartClick} />;
  }

  // Get DraftKings data (should be the only bookmaker now)
  const draftkings = bookmakers.find(b => b.key === 'draftkings') || bookmakers[0];
  const h2h = draftkings?.markets?.find(m => m.key === 'h2h');
  const spreads = draftkings?.markets?.find(m => m.key === 'spreads');
  const totals = draftkings?.markets?.find(m => m.key === 'totals');

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-3">
        <h2 className="nbc-section-header mb-0 pb-0 border-0">
          <span className="card-header-accent"></span>
          BETTING ODDS
        </h2>
        <span className="text-[10px] text-gray-600 font-semibold tracking-wider">DRAFTKINGS</span>
      </div>

      <div className="text-center mb-3">
        <span className="text-sm font-bold">{game.awayTeam}</span>
        <span className="text-gray-600 mx-2 text-xs">@</span>
        <span className="text-sm font-bold">{game.homeTeam}</span>
      </div>

      {oddsData.mock && (
        <div className="text-center text-xs mb-3" style={{ color: 'var(--nbc-gold)' }}>
          ⚠️ Demo data - Add ODDS_API_KEY for live odds
        </div>
      )}

      {/* Moneyline */}
      {h2h && (
        <div className="rounded p-3 mb-2" style={{ background: 'rgba(0,0,0,0.25)' }}>
          <div className="text-[10px] text-gray-600 mb-2 font-semibold tracking-wider">MONEYLINE</div>
          <div className="flex justify-around">
            {h2h.outcomes?.map((o) => (
              <div key={o.name} className="text-center">
                <div className="text-xs text-gray-400">{o.name}</div>
                <div className="flex items-center justify-center gap-1">
                  <div
                    className={`text-lg font-bold ${getOddsColorClass(o.price)} ${onBetClick ? 'cursor-pointer hover:bg-white/10 rounded px-2 py-0.5 transition-colors' : ''}`}
                    onClick={onBetClick ? () => onBetClick({
                      type: 'moneyline',
                      market: 'h2h',
                      outcome: o.name,
                      odds: o.price,
                      point: null,
                      description: `${o.name} Moneyline`
                    }) : undefined}
                  >
                    {formatOdds(o.price)}
                  </div>
                  {onChartClick && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onChartClick({
                          eventId: game.id,
                          key: `h2h__${o.name}`,
                          label: `${o.name} Moneyline`,
                          currentOdds: o.price
                        });
                      }}
                      className="text-gray-600 hover:text-yellow-500 transition-colors p-0.5"
                      title="View odds history"
                    >
                      <ChartIcon size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Spread & Total side by side */}
      <div className="grid grid-cols-2 gap-2">
        {spreads && (
          <div className="rounded p-3" style={{ background: 'rgba(0,0,0,0.25)' }}>
            <div className="text-[10px] text-gray-600 mb-2 font-semibold tracking-wider">SPREAD</div>
            {spreads.outcomes?.map((o) => (
              <div
                key={o.name}
                className="flex justify-between items-center text-sm mb-1"
              >
                <div
                  className={`flex-1 flex justify-between items-center ${onBetClick ? 'cursor-pointer hover:bg-white/10 rounded px-1 py-0.5 transition-colors' : ''}`}
                  onClick={onBetClick ? () => onBetClick({
                    type: 'spread',
                    market: 'spreads',
                    outcome: o.name,
                    odds: o.price,
                    point: o.point,
                    description: `${o.name} ${o.point > 0 ? '+' : ''}${o.point}`
                  }) : undefined}
                >
                  <span className="text-gray-300 truncate">{o.name.split(' ').pop()}</span>
                  <span className="font-bold" style={{ color: 'var(--nbc-gold)' }}>
                    {o.point > 0 ? '+' : ''}{o.point}
                  </span>
                </div>
                {onChartClick && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onChartClick({
                        eventId: game.id,
                        key: `spreads__${o.name}`,
                        label: `${o.name} ${o.point > 0 ? '+' : ''}${o.point}`,
                        currentOdds: o.price
                      });
                    }}
                    className="text-gray-600 hover:text-yellow-500 transition-colors p-0.5 ml-1 flex-shrink-0"
                    title="View odds history"
                  >
                    <ChartIcon size={11} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {totals && (
          <div className="rounded p-3" style={{ background: 'rgba(0,0,0,0.25)' }}>
            <div className="text-[10px] text-gray-600 mb-2 font-semibold tracking-wider">TOTAL</div>
            {totals.outcomes?.map((o) => (
              <div
                key={o.name}
                className="flex justify-between items-center text-sm mb-1"
              >
                <div
                  className={`flex-1 flex justify-between items-center ${onBetClick ? 'cursor-pointer hover:bg-white/10 rounded px-1 py-0.5 transition-colors' : ''}`}
                  onClick={onBetClick ? () => onBetClick({
                    type: 'totals',
                    market: 'totals',
                    outcome: o.name,
                    odds: o.price,
                    point: o.point,
                    description: `${o.name} ${o.point} Total Points`
                  }) : undefined}
                >
                  <span className="text-gray-300">{o.name}</span>
                  <span className="text-blue-400 font-bold">{o.point}</span>
                </div>
                {onChartClick && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onChartClick({
                        eventId: game.id,
                        key: `totals__${o.name}`,
                        label: `${o.name} ${o.point} Total Points`,
                        currentOdds: o.price
                      });
                    }}
                    className="text-gray-600 hover:text-yellow-500 transition-colors p-0.5 ml-1 flex-shrink-0"
                    title="View odds history"
                  >
                    <ChartIcon size={11} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500 mt-3 text-center">
        Updated: {new Date(oddsData.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}

// TV-optimized display with NBC styling
function OddsDisplayTV({ game, bookmakers, onChartClick }) {
  const bookmaker = bookmakers[0];
  const h2h = bookmaker?.markets?.find(m => m.key === 'h2h');
  const spreads = bookmaker?.markets?.find(m => m.key === 'spreads');
  const totals = bookmaker?.markets?.find(m => m.key === 'totals');

  return (
    <div className="nbc-panel">
      <div className="nbc-panel-header">
        <span className="nbc-header-accent"></span>
        <h3 className="nbc-panel-title">BETTING ODDS</h3>
        <span className="ml-auto text-xs text-gray-400">DraftKings</span>
      </div>

      <div className="p-3 space-y-3">
        {/* Moneyline */}
        {h2h && (
          <div className="bg-black/30 rounded p-2">
            <div className="text-xs text-gray-500 mb-2 tracking-wider">MONEYLINE</div>
            {h2h.outcomes?.map((o) => (
              <div key={o.name} className="flex justify-between items-center py-1">
                <span className="text-sm text-gray-300">{o.name}</span>
                <div className="flex items-center gap-1">
                  <span className={`font-bold ${getOddsColorClass(o.price)}`}>
                    {formatOdds(o.price)}
                  </span>
                  {onChartClick && (
                    <button
                      onClick={() => onChartClick({
                        eventId: game.id,
                        key: `h2h__${o.name}`,
                        label: `${o.name} Moneyline`,
                        currentOdds: o.price
                      })}
                      className="text-gray-600 hover:text-yellow-500 transition-colors p-0.5"
                      title="View odds history"
                    >
                      <ChartIcon size={11} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Spread */}
        {spreads && (
          <div className="bg-black/30 rounded p-2">
            <div className="text-xs text-gray-500 mb-2 tracking-wider">SPREAD</div>
            {spreads.outcomes?.map((o) => (
              <div key={o.name} className="flex justify-between items-center py-1">
                <span className="text-sm text-gray-300">{o.name}</span>
                <div className="flex items-center gap-1">
                  <span className="font-bold text-nbc-gold">
                    {o.point > 0 ? '+' : ''}{o.point}
                  </span>
                  {onChartClick && (
                    <button
                      onClick={() => onChartClick({
                        eventId: game.id,
                        key: `spreads__${o.name}`,
                        label: `${o.name} ${o.point > 0 ? '+' : ''}${o.point}`,
                        currentOdds: o.price
                      })}
                      className="text-gray-600 hover:text-yellow-500 transition-colors p-0.5"
                      title="View odds history"
                    >
                      <ChartIcon size={11} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Totals */}
        {totals && (
          <div className="bg-black/30 rounded p-2">
            <div className="text-xs text-gray-500 mb-2 tracking-wider">TOTAL</div>
            {totals.outcomes?.map((o) => (
              <div key={o.name} className="flex justify-between items-center py-1">
                <span className="text-sm text-gray-300">{o.name}</span>
                <div className="flex items-center gap-1">
                  <span className="font-bold text-blue-400">{o.point}</span>
                  {onChartClick && (
                    <button
                      onClick={() => onChartClick({
                        eventId: game.id,
                        key: `totals__${o.name}`,
                        label: `${o.name} ${o.point} Total Points`,
                        currentOdds: o.price
                      })}
                      className="text-gray-600 hover:text-yellow-500 transition-colors p-0.5"
                      title="View odds history"
                    >
                      <ChartIcon size={11} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default OddsDisplay;
