import { useGameData, useOddsData, usePlayerProps } from '../hooks/useGameData';
import SquaresGrid from '../components/SquaresGrid';
import OddsDisplay from '../components/OddsDisplay';
import PlayerPropsDisplay, { PlayerPropsTicker } from '../components/PlayerPropsDisplay';
import Scoreboard from '../components/Scoreboard';
import WinnersPanel from '../components/WinnersPanel';
import PlayerStats from '../components/PlayerStats';

function DisplayPage() {
  const { gameData, loading, error } = useGameData(2000); // Faster refresh for display
  const { oddsData } = useOddsData(15000); // Faster odds refresh
  const { propsData } = usePlayerProps(30000); // Player props refresh

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-4xl text-yellow-400 animate-pulse">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-red-400 text-2xl">Connection Error</div>
      </div>
    );
  }

  if (!gameData) return null;

  return (
    <div className="min-h-screen bg-gray-900 p-4 display-mode">
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-4xl font-bold text-yellow-400">
          SUPER BOWL SQUARES
        </h1>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-120px)]">
        {/* Left Side - Odds & Props */}
        <div className="col-span-3 space-y-4 overflow-y-auto max-h-full">
          <OddsDisplay oddsData={oddsData} displayMode />
          <PlayerPropsDisplay propsData={propsData} displayMode />
          <WinnersPanel quarters={gameData.quarters} displayMode />
        </div>

        {/* Center - Grid */}
        <div className="col-span-6 flex flex-col">
          <div className="card flex-1 flex flex-col justify-center">
            <SquaresGrid gameData={gameData} displayMode />
          </div>
        </div>

        {/* Right Side - Scoreboard & Stats */}
        <div className="col-span-3 space-y-4 overflow-y-auto max-h-full">
          <Scoreboard gameData={gameData} displayMode />

          {/* Current Winner Preview */}
          {gameData.grid.locked && (
            <CurrentWinnerPreview gameData={gameData} />
          )}

          {/* Player Stats */}
          <PlayerStats gameData={gameData} displayMode />
        </div>
      </div>

      {/* Footer Ticker */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 py-2 overflow-hidden">
        <CombinedTicker oddsData={oddsData} propsData={propsData} />
      </div>
    </div>
  );
}

function CurrentWinnerPreview({ gameData }) {
  const { grid, scores, teams } = gameData;
  const { homeNumbers, awayNumbers, squares } = grid;

  const homeLastDigit = scores.home % 10;
  const awayLastDigit = scores.away % 10;

  const homeCol = homeNumbers.indexOf(homeLastDigit);
  const awayRow = awayNumbers.indexOf(awayLastDigit);
  const squareIndex = awayRow * 10 + homeCol;
  const currentWinner = squares[squareIndex];

  return (
    <div className="card mt-4 text-center bg-gradient-to-r from-yellow-900 to-orange-900">
      <div className="text-gray-400 text-sm">CURRENT WINNING SQUARE</div>
      <div className="text-3xl font-bold text-yellow-400 mt-2">
        {currentWinner || '???'}
      </div>
      <div className="text-sm text-gray-400 mt-1">
        Score ending: {teams.away.abbreviation} {awayLastDigit} - {teams.home.abbreviation} {homeLastDigit}
      </div>
    </div>
  );
}

function CombinedTicker({ oddsData, propsData }) {
  const tickerItems = [];

  // Add game odds
  if (oddsData?.games?.[0]) {
    const game = oddsData.games[0];
    const bookmakers = game.bookmakers || [];

    bookmakers.forEach(bookmaker => {
      bookmaker.markets?.forEach(market => {
        if (market.key === 'h2h') {
          market.outcomes?.forEach(outcome => {
            const displayOdds = outcome.price > 0 ? `+${outcome.price}` : outcome.price;
            tickerItems.push({
              type: 'odds',
              text: `${outcome.name} ML: ${displayOdds}`
            });
          });
        }
        if (market.key === 'spreads') {
          market.outcomes?.forEach(outcome => {
            const point = outcome.point > 0 ? `+${outcome.point}` : outcome.point;
            tickerItems.push({
              type: 'odds',
              text: `${outcome.name} ${point}`
            });
          });
        }
      });
    });
  }

  // Add player props (featured ones)
  if (propsData?.games?.[0]?.props) {
    const props = propsData.games[0].props;
    const featured = props.filter(p =>
      p.market === 'player_anytime_td' ||
      (p.name === 'Over' && ['player_pass_yds', 'player_rush_yds'].includes(p.market))
    ).slice(0, 6);

    featured.forEach(prop => {
      const displayOdds = prop.odds > 0 ? `+${prop.odds}` : prop.odds;
      const label = prop.market === 'player_anytime_td'
        ? `${prop.player} TD`
        : `${prop.player} O${prop.line}`;
      tickerItems.push({
        type: 'prop',
        text: `${label}: ${displayOdds}`
      });
    });
  }

  if (tickerItems.length === 0) {
    return <div className="text-gray-500 text-center">Loading odds...</div>;
  }

  return (
    <div className="whitespace-nowrap odds-ticker text-lg">
      {tickerItems.map((item, i) => (
        <span key={i} className="mx-8">
          <span className={item.type === 'prop' ? 'text-green-400' : 'text-yellow-400'}>
            {item.text}
          </span>
          {i < tickerItems.length - 1 && <span className="mx-4 text-gray-600">|</span>}
        </span>
      ))}
    </div>
  );
}

export default DisplayPage;
