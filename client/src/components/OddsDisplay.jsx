import { formatOdds, getOddsColorClass } from '../utils/helpers';

function OddsDisplay({ oddsData, displayMode = false }) {
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
    return <OddsDisplayTV game={game} bookmakers={bookmakers} />;
  }

  // Get DraftKings data (should be the only bookmaker now)
  const draftkings = bookmakers.find(b => b.key === 'draftkings') || bookmakers[0];
  const h2h = draftkings?.markets?.find(m => m.key === 'h2h');
  const spreads = draftkings?.markets?.find(m => m.key === 'spreads');
  const totals = draftkings?.markets?.find(m => m.key === 'totals');

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-yellow-400">Game Odds</h2>
        <span className="text-xs text-blue-400">via DraftKings</span>
      </div>

      <div className="text-center mb-4">
        <span className="text-lg font-bold">{game.awayTeam}</span>
        <span className="text-gray-400 mx-2">@</span>
        <span className="text-lg font-bold">{game.homeTeam}</span>
      </div>

      {oddsData.mock && (
        <div className="text-center text-yellow-500 text-xs mb-3">
          (Demo data - Add ODDS_API_KEY for live odds)
        </div>
      )}

      {/* Moneyline */}
      {h2h && (
        <div className="bg-gray-700 rounded-lg p-3 mb-2">
          <div className="text-xs text-gray-400 mb-2">MONEYLINE</div>
          <div className="flex justify-around">
            {h2h.outcomes?.map((o) => (
              <div key={o.name} className="text-center">
                <div className="text-xs text-gray-400">{o.name}</div>
                <div className={`text-lg font-bold ${getOddsColorClass(o.price)}`}>
                  {formatOdds(o.price)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Spread & Total side by side */}
      <div className="grid grid-cols-2 gap-2">
        {spreads && (
          <div className="bg-gray-700 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-2">SPREAD</div>
            {spreads.outcomes?.map((o) => (
              <div key={o.name} className="flex justify-between text-sm mb-1">
                <span className="text-gray-300 truncate">{o.name.split(' ').pop()}</span>
                <span className="text-yellow-400 font-bold">
                  {o.point > 0 ? '+' : ''}{o.point}
                </span>
              </div>
            ))}
          </div>
        )}

        {totals && (
          <div className="bg-gray-700 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-2">TOTAL</div>
            {totals.outcomes?.map((o) => (
              <div key={o.name} className="flex justify-between text-sm mb-1">
                <span className="text-gray-300">{o.name}</span>
                <span className="text-blue-400 font-bold">{o.point}</span>
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

// TV-optimized display with ticker
function OddsDisplayTV({ game, bookmakers }) {
  // Get the best odds from first bookmaker
  const bookmaker = bookmakers[0];
  const h2h = bookmaker?.markets?.find(m => m.key === 'h2h');
  const spreads = bookmaker?.markets?.find(m => m.key === 'spreads');
  const totals = bookmaker?.markets?.find(m => m.key === 'totals');

  return (
    <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-4 rounded-lg">
      {/* Main matchup */}
      <div className="text-center mb-4">
        <div className="text-3xl font-bold text-white">
          {game.awayTeam}
          <span className="text-gray-500 mx-4">vs</span>
          {game.homeTeam}
        </div>
      </div>

      {/* Odds cards */}
      <div className="grid grid-cols-3 gap-4 text-center">
        {/* Moneyline */}
        <div className="bg-gray-700 rounded-lg p-4">
          <h3 className="text-gray-400 text-sm mb-2">MONEYLINE</h3>
          {h2h?.outcomes?.map((o) => (
            <div key={o.name} className="flex justify-between items-center py-1">
              <span className="text-white">{o.name}</span>
              <span className={`text-xl font-bold ${getOddsColorClass(o.price)}`}>
                {formatOdds(o.price)}
              </span>
            </div>
          ))}
        </div>

        {/* Spread */}
        <div className="bg-gray-700 rounded-lg p-4">
          <h3 className="text-gray-400 text-sm mb-2">SPREAD</h3>
          {spreads?.outcomes?.map((o) => (
            <div key={o.name} className="flex justify-between items-center py-1">
              <span className="text-white">{o.name}</span>
              <span className="text-xl font-bold text-yellow-400">
                {o.point > 0 ? '+' : ''}{o.point}
              </span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="bg-gray-700 rounded-lg p-4">
          <h3 className="text-gray-400 text-sm mb-2">TOTAL</h3>
          {totals?.outcomes?.map((o) => (
            <div key={o.name} className="flex justify-between items-center py-1">
              <span className="text-white">{o.name}</span>
              <span className="text-xl font-bold text-blue-400">
                {o.point}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center text-gray-500 text-sm mt-2">
        via {bookmaker?.title || 'Sportsbook'}
      </div>
    </div>
  );
}

export default OddsDisplay;
