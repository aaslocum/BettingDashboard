import { useState, useEffect } from 'react';
import { useGameData, useOddsData, usePlayerProps } from '../hooks/useGameData';
import { useGameContext } from '../context/GameContext';
import SquaresGrid from '../components/SquaresGrid';
import OddsDisplay from '../components/OddsDisplay';
import PlayerPropsDisplay from '../components/PlayerPropsDisplay';
import TeamStats from '../components/TeamStats';
import PlayerGameStats from '../components/PlayerGameStats';
import Scoreboard from '../components/Scoreboard';
import WinnersPanel from '../components/WinnersPanel';
import PlayerStats from '../components/PlayerStats';
import { formatCurrency } from '../utils/helpers';

const PANEL_TYPES = ['props', 'teamStats', 'playerStats'];
const PANEL_DURATION = 10000; // 10 seconds per panel

// Build game context for likelihood calculations
function buildGameContext(gameData) {
  if (!gameData) return {};

  const { quarters, scores } = gameData;

  // Determine current quarter (1-4)
  let quarter = 1;
  if (quarters.q1.completed && !quarters.q2.completed) quarter = 2;
  else if (quarters.q2.completed && !quarters.q3.completed) quarter = 3;
  else if (quarters.q3.completed && !quarters.q4.completed) quarter = 4;
  else if (quarters.q4.completed) quarter = 4;

  return {
    quarter,
    homeScore: scores.home,
    awayScore: scores.away,
    includeDoubleScores: true,
  };
}

function DisplayPage() {
  const { currentGameId } = useGameContext();
  const { gameData, loading, error } = useGameData(2000, currentGameId);
  const { oddsData } = useOddsData(15000);
  const { propsData } = usePlayerProps(30000);
  const [activePanel, setActivePanel] = useState(0);

  // Auto-rotate panels
  useEffect(() => {
    const interval = setInterval(() => {
      setActivePanel(prev => (prev + 1) % PANEL_TYPES.length);
    }, PANEL_DURATION);
    return () => clearInterval(interval);
  }, []);

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
    <div className="min-h-screen p-4 display-mode">
      {/* NBC-Style Header */}
      <div className="nbc-main-title mb-4">
        <h1>{gameData?.name?.toUpperCase() || 'SUPER BOWL SQUARES'}</h1>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-140px)]">
        {/* Left Side - Rotating Panels */}
        <div className="col-span-3 flex flex-col gap-4 overflow-hidden">
          {/* Odds Display (always visible) */}
          <OddsDisplay oddsData={oddsData} displayMode />

          {/* Rotating Panel */}
          <div className="flex-1 overflow-hidden">
            <RotatingPanel
              activePanel={activePanel}
              propsData={propsData}
              gameData={gameData}
            />
          </div>

          {/* Panel Indicator Dots */}
          <div className="panel-indicator">
            {PANEL_TYPES.map((_, idx) => (
              <button
                key={idx}
                className={`panel-dot ${activePanel === idx ? 'active' : ''}`}
                onClick={() => setActivePanel(idx)}
              />
            ))}
          </div>

          {/* Winners Panel */}
          <WinnersPanel quarters={gameData.quarters} displayMode />
        </div>

        {/* Center - Grid */}
        <div className="col-span-6 flex flex-col">
          <div className="nbc-panel flex-1 flex flex-col">
            <div className="nbc-panel-header">
              <span className="nbc-header-accent"></span>
              <h3 className="nbc-panel-title">SQUARES POOL - {formatCurrency(gameData?.totalPool || 100)} POT</h3>
            </div>
            <div className="flex-1 p-4 flex items-center justify-center">
              <SquaresGrid
                gameData={gameData}
                displayMode
                showLikelihood={gameData.grid.locked}
                gameContext={buildGameContext(gameData)}
              />
            </div>
          </div>
        </div>

        {/* Right Side - Scoreboard & Stats */}
        <div className="col-span-3 space-y-4 overflow-y-auto max-h-full">
          <NBCScoreboard gameData={gameData} />

          {/* Current Winner Preview */}
          {gameData.grid.locked && (
            <CurrentWinnerPreview gameData={gameData} />
          )}

          {/* Player Stats (Squares Pool) */}
          <PlayerStats gameData={gameData} displayMode />
        </div>
      </div>

      {/* Footer Ticker */}
      <div className="fixed bottom-0 left-0 right-0 nbc-ticker overflow-hidden">
        <div className="nbc-ticker-content">
          <CombinedTicker oddsData={oddsData} propsData={propsData} />
        </div>
      </div>
    </div>
  );
}

function RotatingPanel({ activePanel, propsData, gameData }) {
  const panelType = PANEL_TYPES[activePanel];

  return (
    <div className="h-full transition-opacity duration-300">
      {panelType === 'props' && (
        <PlayerPropsDisplay propsData={propsData} displayMode />
      )}
      {panelType === 'teamStats' && (
        <TeamStats gameData={gameData} displayMode />
      )}
      {panelType === 'playerStats' && (
        <PlayerGameStats displayMode />
      )}
    </div>
  );
}

function NBCScoreboard({ gameData }) {
  const { teams, scores, quarters } = gameData;

  // Determine game status
  let gameStatus = 'SUPER BOWL LIX';
  const completedQuarters = Object.values(quarters).filter(q => q.completed).length;
  if (completedQuarters > 0 && completedQuarters < 4) {
    const quarterNames = ['1ST', '2ND', '3RD', '4TH'];
    gameStatus = `${quarterNames[completedQuarters - 1]} QTR`;
  } else if (completedQuarters === 4) {
    gameStatus = 'FINAL';
  }

  return (
    <div className="nbc-scoreboard">
      <div className="nbc-scoreboard-header">{gameStatus}</div>
      <div className="nbc-score-row">
        <span className="nbc-team-name">{teams.away.abbreviation}</span>
        <span className="nbc-score">{scores.away}</span>
      </div>
      <div className="nbc-score-row">
        <span className="nbc-team-name">{teams.home.abbreviation}</span>
        <span className="nbc-score">{scores.home}</span>
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
    <div className="nbc-panel">
      <div className="nbc-panel-header">
        <span className="nbc-header-accent"></span>
        <h3 className="nbc-panel-title">WINNING SQUARE</h3>
      </div>
      <div className="p-4 text-center">
        <div className="text-4xl font-extrabold text-nbc-gold mb-2">
          {currentWinner || '???'}
        </div>
        <div className="text-sm text-gray-400">
          Score: {teams.away.abbreviation} {awayLastDigit} - {teams.home.abbreviation} {homeLastDigit}
        </div>
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
          <span className={item.type === 'prop' ? 'text-green-400' : 'text-nbc-gold'}>
            {item.text}
          </span>
          {i < tickerItems.length - 1 && <span className="mx-4 text-gray-600">|</span>}
        </span>
      ))}
    </div>
  );
}

export default DisplayPage;
