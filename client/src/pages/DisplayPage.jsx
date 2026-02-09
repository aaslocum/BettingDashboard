import { useState, useEffect, useRef } from 'react';
import { useGameData, useOddsData, usePlayerProps } from '../hooks/useGameData';
import { useGameContext } from '../context/GameContext';
import { QRCodeSVG } from 'qrcode.react';
import SquaresGrid from '../components/SquaresGrid';
import OddsDisplay from '../components/OddsDisplay';
import PlayerPropsDisplay from '../components/PlayerPropsDisplay';
import TeamStats from '../components/TeamStats';
import PlayerGameStats from '../components/PlayerGameStats';
import Scoreboard from '../components/Scoreboard';
import WinnersPanel from '../components/WinnersPanel';
import PlayerStats from '../components/PlayerStats';
import OddsHistoryModal from '../components/OddsHistoryModal';
import { formatCurrency, getQuarterName } from '../utils/helpers';

const PANEL_TYPES = ['props', 'teamStats', 'playerStats'];
const SPEED_OPTIONS = [
  { label: '5s', value: 5000 },
  { label: '10s', value: 10000 },
  { label: '15s', value: 15000 },
  { label: '30s', value: 30000 },
];

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

// Determine which quarter is currently active (in play, not yet completed)
function getActiveQuarter(quarters) {
  if (!quarters.q1.completed) return 'q1';
  if (!quarters.q2.completed) return 'q2';
  if (!quarters.q3.completed) return 'q3';
  if (!quarters.q4.completed) return 'q4';
  return null;
}

function DisplayPage() {
  const { currentGameId } = useGameContext();
  const { gameData, loading, error } = useGameData(2000, currentGameId);
  const { oddsData } = useOddsData(15000);
  const { propsData } = usePlayerProps(30000);
  const [activePanel, setActivePanel] = useState(0);
  const [panelDuration, setPanelDuration] = useState(10000);
  const [showSettings, setShowSettings] = useState(false);
  const [winnerAnimation, setWinnerAnimation] = useState(null);
  const [chartInfo, setChartInfo] = useState(null);
  const prevQuartersRef = useRef(null);

  // Auto-rotate panels
  useEffect(() => {
    const interval = setInterval(() => {
      setActivePanel(prev => (prev + 1) % PANEL_TYPES.length);
    }, panelDuration);
    return () => clearInterval(interval);
  }, [panelDuration]);

  // Detect new quarter winners for animation
  useEffect(() => {
    if (!gameData?.quarters) return;
    const prev = prevQuartersRef.current;
    if (prev) {
      for (const key of ['q1', 'q2', 'q3', 'q4']) {
        if (!prev[key]?.completed && gameData.quarters[key]?.completed && gameData.quarters[key]?.winner) {
          setWinnerAnimation({
            quarter: key,
            winner: gameData.quarters[key].winner.player,
            prize: gameData.quarters[key].prize,
          });
          setTimeout(() => setWinnerAnimation(null), 6000);
          break;
        }
      }
    }
    prevQuartersRef.current = JSON.parse(JSON.stringify(gameData.quarters));
  }, [gameData?.quarters]);

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

  const activeQuarter = getActiveQuarter(gameData.quarters);

  return (
    <div className="overflow-hidden p-2 display-mode flex flex-col" style={{ height: '100dvh' }}>
      {/* Winner Animation Overlay */}
      {winnerAnimation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="text-center animate-bounce">
            <div className="text-sm font-bold text-gray-400 tracking-widest uppercase mb-2">
              {getQuarterName(winnerAnimation.quarter)} Winner
            </div>
            <div className="text-6xl font-extrabold mb-4" style={{ color: 'var(--nbc-gold)' }}>
              {winnerAnimation.winner}
            </div>
            <div className="text-3xl font-bold text-green-400">
              {formatCurrency(winnerAnimation.prize)}
            </div>
          </div>
        </div>
      )}

      {/* Settings Toggle (small gear in corner) */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="fixed top-2 right-2 z-40 text-gray-600 hover:text-gray-400 text-sm"
      >
        {showSettings ? 'X' : 'Settings'}
      </button>

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed top-8 right-2 z-40 rounded p-3 space-y-2" style={{ background: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)', minWidth: '180px' }}>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Panel Rotation</div>
          <div className="flex gap-1">
            {SPEED_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setPanelDuration(opt.value)}
                className={`flex-1 py-1 rounded text-xs font-semibold transition-colors ${
                  panelDuration === opt.value ? 'bg-yellow-600 text-black' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* NBC-Style Header - Team Matchup */}
      <div className="nbc-main-title display-title-compact mb-1">
        <h1>
          {gameData?.teams?.away?.name && gameData?.teams?.home?.name
            ? `${gameData.teams.away.name.toUpperCase()} VS ${gameData.teams.home.name.toUpperCase()}`
            : gameData?.name?.toUpperCase() || 'SUPER BOWL SQUARES'}
        </h1>
      </div>

      {/* Main Content - fills remaining space above ticker */}
      <div className="grid grid-cols-12 gap-1.5 flex-1 min-h-0 mb-6">
        {/* Left Side - Rotating Panels */}
        <div className="col-span-3 flex flex-col gap-1 overflow-hidden">
          {/* Rotating Panel */}
          <div className="flex-1 overflow-hidden min-h-0">
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

          {/* QR Code to join */}
          <div className="nbc-panel">
            <div className="p-1.5 text-center">
              <div className="text-[8px] text-gray-500 uppercase tracking-wider mb-0.5">Join the Game</div>
              <div className="inline-block p-1.5 rounded" style={{ background: 'white' }}>
                <QRCodeSVG value={`${window.location.origin}/`} size={128} />
              </div>
              <div className="text-[9px] text-gray-500 mt-0.5">{window.location.host}</div>
            </div>
          </div>
        </div>

        {/* Center - Grid */}
        <div className="col-span-6 flex flex-col min-h-0">
          <div className="nbc-panel flex-1 flex flex-col min-h-0">
            <div className="nbc-panel-header display-panel-header-compact">
              <span className="nbc-header-accent"></span>
              <h3 className="nbc-panel-title">SQUARES POOL &mdash; {formatCurrency(gameData?.totalPool || 100)} POT</h3>
            </div>
            <div className="flex-1 p-1 flex items-center justify-center min-h-0">
              <SquaresGrid
                gameData={gameData}
                displayMode
                showLikelihood={gameData.grid.locked}
                gameContext={buildGameContext(gameData)}
              />
            </div>
          </div>
        </div>

        {/* Right Side - Scoreboard, Stats & Odds */}
        <div className="col-span-3 flex flex-col gap-1 overflow-hidden min-h-0">
          <NBCScoreboard gameData={gameData} activeQuarter={activeQuarter} />

          {/* Current Winner Preview */}
          {gameData.grid.locked && (
            <CurrentWinnerPreview gameData={gameData} />
          )}

          {/* Quarter Winners & Player Stats - scrollable if needed */}
          <div className="flex-1 overflow-y-auto min-h-0 space-y-1">
            <WinnersPanel quarters={gameData.quarters} displayMode />
            <PlayerStats gameData={gameData} displayMode />
          </div>

          {/* Betting Odds - bottom of right column */}
          <OddsDisplay oddsData={oddsData} displayMode onChartClick={(info) => setChartInfo(info)} />
        </div>
      </div>

      {/* Footer Ticker */}
      <div className="fixed bottom-0 left-0 right-0 nbc-ticker nbc-ticker-compact overflow-hidden">
        <div className="nbc-ticker-content">
          <CombinedTicker oddsData={oddsData} propsData={propsData} />
        </div>
      </div>

      {/* Odds History Chart Modal */}
      {chartInfo && (
        <OddsHistoryModal
          eventId={chartInfo.eventId}
          oddsKey={chartInfo.key}
          label={chartInfo.label}
          currentOdds={chartInfo.currentOdds}
          commenceTime={chartInfo.commenceTime}
          onClose={() => setChartInfo(null)}
        />
      )}
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

function NBCScoreboard({ gameData, activeQuarter }) {
  const { teams, scores, quarters } = gameData;

  // Determine game status
  let gameStatus = 'SUPER BOWL LX';
  const completedQuarters = Object.values(quarters).filter(q => q.completed).length;
  if (completedQuarters > 0 && completedQuarters < 4) {
    const quarterNames = ['1ST', '2ND', '3RD', '4TH'];
    gameStatus = `${quarterNames[completedQuarters - 1]} QTR`;
  } else if (completedQuarters === 4) {
    gameStatus = 'FINAL';
  }

  const quarterLabels = { q1: 'Q1', q2: 'Q2', q3: 'Q3', q4: 'Q4' };

  return (
    <div className="nbc-scoreboard">
      <div className="nbc-scoreboard-header">{gameStatus}</div>
      <div className="nbc-score-row display-score-row-compact">
        <span className="nbc-team-name display-team-compact">{teams.away.abbreviation}</span>
        <span className="nbc-score display-score-compact">{scores.away}</span>
      </div>
      <div className="nbc-score-row display-score-row-compact">
        <span className="nbc-team-name display-team-compact">{teams.home.abbreviation}</span>
        <span className="nbc-score display-score-compact">{scores.home}</span>
      </div>
      {/* Active Quarter Indicator */}
      <div className="grid grid-cols-4 gap-0">
        {Object.entries(quarterLabels).map(([key, label]) => {
          const isActive = activeQuarter === key;
          const isCompleted = quarters[key]?.completed;
          return (
            <div
              key={key}
              className={`text-center py-0.5 text-[9px] font-bold tracking-wider ${
                isActive ? 'text-yellow-400' : isCompleted ? 'text-green-400' : 'text-gray-600'
              }`}
              style={{
                background: isActive ? 'rgba(212,175,55,0.15)' : 'transparent',
                borderBottom: isActive ? '2px solid var(--nbc-gold)' : '2px solid transparent'
              }}
            >
              {label}
            </div>
          );
        })}
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
      <div className="nbc-panel-header display-panel-header-compact">
        <span className="nbc-header-accent"></span>
        <h3 className="nbc-panel-title">WINNING SQUARE</h3>
      </div>
      <div className="p-1.5 text-center">
        <div className="text-xl font-extrabold text-nbc-gold mb-0.5">
          {currentWinner || '???'}
        </div>
        <div className="text-[10px] text-gray-400">
          {teams.away.abbreviation} {awayLastDigit} - {teams.home.abbreviation} {homeLastDigit}
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
    <div className="whitespace-nowrap odds-ticker text-sm">
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
