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

  return (
    <div className="card">
      <h2 className="text-xl font-bold mb-4 text-yellow-400">Live Betting Odds</h2>

      <div className="text-center mb-4">
        <span className="text-2xl font-bold">{game.awayTeam}</span>
        <span className="text-gray-400 mx-3">@</span>
        <span className="text-2xl font-bold">{game.homeTeam}</span>
      </div>

      {oddsData.mock && (
        <div className="text-center text-yellow-500 text-sm mb-4">
          (Demo data - Add ODDS_API_KEY for live odds)
        </div>
      )}

      <div className="space-y-4">
        {bookmakers.map((bookmaker) => (
          <div key={bookmaker.key} className="bg-gray-700 rounded-lg p-3">
            <h3 className="font-semibold text-blue-400 mb-2">{bookmaker.title}</h3>

            {bookmaker.markets?.map((market) => (
              <div key={market.key} className="mb-2">
                <span className="text-xs text-gray-400 uppercase">{market.key}</span>
                <div className="flex justify-around mt-1">
                  {market.outcomes?.map((outcome) => (
                    <div key={outcome.name} className="text-center">
                      <div className="text-sm text-gray-300">{outcome.name}</div>
                      <div className={`font-bold ${getOddsColorClass(outcome.price)}`}>
                        {formatOdds(outcome.price)}
                        {outcome.point !== undefined && (
                          <span className="text-gray-400 ml-1">({outcome.point})</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="text-xs text-gray-500 mt-4 text-center">
        Last updated: {new Date(oddsData.timestamp).toLocaleTimeString()}
        {oddsData.cached && ' (cached)'}
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
