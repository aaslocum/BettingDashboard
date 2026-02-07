import { useState, useEffect } from 'react';
import { useGameData, useOddsData, usePlayerProps, useTeamStats, usePlayerGameStats, useBets } from '../hooks/useGameData';
import { useGameContext } from '../context/GameContext';
import SquaresGrid from '../components/SquaresGrid';
import OddsDisplay from '../components/OddsDisplay';
import PlayerPropsDisplay from '../components/PlayerPropsDisplay';
import Scoreboard from '../components/Scoreboard';
import PlayerSelector from '../components/PlayerSelector';
import WinnersPanel from '../components/WinnersPanel';
import PlayerStats from '../components/PlayerStats';
import BetSlipModal from '../components/BetSlipModal';
import MyBets from '../components/MyBets';
import { formatCurrency } from '../utils/helpers';

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

const TABS = [
  { key: 'squares', label: 'Squares' },
  { key: 'game', label: 'Game' },
  { key: 'betting', label: 'Betting' },
];

function PlayerPage() {
  const { currentGameId, currentGame } = useGameContext();
  const { gameData, loading, error, claimSquare, unclaimSquare, addPlayer, placeBet } = useGameData(3000, currentGameId);
  const { oddsData } = useOddsData(30000);
  const { propsData } = usePlayerProps(60000);
  const { teamStats } = useTeamStats(15000);
  const { playerGameStats } = usePlayerGameStats(15000);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [claimError, setClaimError] = useState('');
  const [betSlip, setBetSlip] = useState(null);
  const [activeTab, setActiveTab] = useState('squares');

  // Persist selected player in localStorage per game
  useEffect(() => {
    if (currentGameId) {
      const stored = localStorage.getItem(`selectedPlayer_${currentGameId}`);
      if (stored) setSelectedPlayerId(stored);
    }
  }, [currentGameId]);

  const handleSelectPlayer = (playerId) => {
    setSelectedPlayerId(playerId);
    if (currentGameId) {
      if (playerId) {
        localStorage.setItem(`selectedPlayer_${currentGameId}`, playerId);
      } else {
        localStorage.removeItem(`selectedPlayer_${currentGameId}`);
      }
    }
  };

  const { bets: myBets, refetchBets } = useBets(10000, currentGameId, selectedPlayerId);

  const handleBetClick = (betInfo) => {
    if (!selectedPlayer) {
      setClaimError('Select your player first to place a bet');
      setTimeout(() => setClaimError(''), 3000);
      return;
    }
    setBetSlip(betInfo);
  };

  const handlePlaceBet = async (wager) => {
    if (!selectedPlayer || !betSlip) return;
    try {
      await placeBet(selectedPlayer.id, {
        type: betSlip.type,
        description: betSlip.description,
        selection: {
          market: betSlip.market,
          outcome: betSlip.outcome,
          odds: betSlip.odds,
          point: betSlip.point ?? null,
        },
        wager,
      });
      setBetSlip(null);
      refetchBets();
    } catch (err) {
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl text-gray-400">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card text-center">
        <div className="text-red-400 text-xl">Error: {error}</div>
        <p className="text-gray-400 mt-2">Make sure the server is running</p>
      </div>
    );
  }

  if (!gameData) return null;

  const players = gameData.players || [];
  const selectedPlayer = players.find(p => p.id === selectedPlayerId);
  const pendingBetCount = myBets?.filter(b => b.status === 'pending').length || 0;

  const handleSquareClick = async (index) => {
    if (gameData.grid.locked) return;

    const squareOwner = gameData.grid.squares[index];

    // If square is claimed by the selected player, offer to unclaim
    if (squareOwner && selectedPlayer && squareOwner === selectedPlayer.initials) {
      if (confirm(`Unclaim square ${index + 1}? This will remove your claim.`)) {
        try {
          setClaimError('');
          await unclaimSquare(index, selectedPlayer.initials);
        } catch (err) {
          setClaimError(err.message);
          setTimeout(() => setClaimError(''), 3000);
        }
      }
      return;
    }

    // If square is claimed by someone else, ignore
    if (squareOwner) return;

    if (!selectedPlayer) {
      setClaimError('Select your player first');
      setTimeout(() => setClaimError(''), 3000);
      return;
    }

    try {
      setClaimError('');
      await claimSquare(index, selectedPlayer.initials);
    } catch (err) {
      setClaimError(err.message);
      setTimeout(() => setClaimError(''), 3000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-8">
      {/* Header */}
      <header className="text-center py-2">
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-wider uppercase" style={{ color: 'var(--nbc-gold)' }}>
          {gameData?.name || 'Super Bowl Squares'}
        </h1>
        {gameData?.betAmount && (
          <p className="text-xs sm:text-sm text-gray-500 mt-1 tracking-wide">
            {formatCurrency(gameData.betAmount)}/square · {formatCurrency(gameData.totalPool)} pool
          </p>
        )}
      </header>

      {/* Player Selector */}
      <div className="mt-3">
        <PlayerSelector
          players={players}
          selectedPlayerId={selectedPlayerId}
          onSelect={handleSelectPlayer}
          onAddPlayer={addPlayer}
          betAmount={gameData.betAmount}
        />
      </div>

      {/* Claim/Bet Error */}
      {claimError && (
        <div className="text-center text-sm text-red-400 font-semibold mt-2">{claimError}</div>
      )}

      {/* Scoreboard */}
      <div className="mt-3">
        <Scoreboard gameData={gameData} />
      </div>

      {/* Tab Bar */}
      <div className="flex mt-3 rounded-lg overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-bold tracking-wider uppercase transition-colors relative ${
              activeTab === tab.key
                ? 'text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.label}
            {tab.key === 'betting' && pendingBetCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center w-4 h-4 text-[9px] font-bold rounded-full bg-yellow-500 text-black">
                {pendingBetCount}
              </span>
            )}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: 'var(--nbc-gold)' }} />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-3 sm:space-y-4 mt-3">
        {activeTab === 'squares' && (
          <>
            {/* Squares Grid */}
            <section className="card">
              <div className="flex justify-between items-center mb-3">
                <h2 className="nbc-section-header mb-0 pb-0 border-0">
                  <span className="card-header-accent"></span>
                  SQUARES POOL
                </h2>
                <span className="text-xs text-gray-500 font-semibold tracking-wide">
                  {gameData.grid.squares.filter(s => s !== null).length}/100
                </span>
              </div>
              <SquaresGrid
                gameData={gameData}
                onSquareClick={handleSquareClick}
                showLikelihood={gameData.grid.locked}
                gameContext={buildGameContext(gameData)}
                currentPlayerInitials={selectedPlayer?.initials}
              />
              {!gameData.grid.locked && (
                <p className="text-center text-xs text-gray-500 mt-3">
                  {selectedPlayer
                    ? `Tap an empty square to claim as ${selectedPlayer.initials}`
                    : 'Select your player above, then tap a square to claim it'}
                </p>
              )}
            </section>

            {/* Winners Panel */}
            <WinnersPanel quarters={gameData.quarters} />

            {/* Pool Standings */}
            <PlayerStats gameData={gameData} />
          </>
        )}

        {activeTab === 'game' && (
          <>
            {/* Team Stats Section */}
            <MobileTeamStats teamStats={teamStats} gameData={gameData} />

            {/* Player Game Stats Section */}
            <MobilePlayerGameStats playerGameStats={playerGameStats} />
          </>
        )}

        {activeTab === 'betting' && (
          <>
            {/* My Bets */}
            {selectedPlayer && myBets && myBets.length > 0 && (
              <MyBets bets={myBets} />
            )}

            {/* Game Odds */}
            <OddsDisplay oddsData={oddsData} onBetClick={handleBetClick} />

            {/* Player Props */}
            <PlayerPropsDisplay propsData={propsData} onBetClick={handleBetClick} />
          </>
        )}
      </div>

      {/* Bet Slip Modal */}
      {betSlip && (
        <BetSlipModal
          bet={betSlip}
          onPlace={handlePlaceBet}
          onClose={() => setBetSlip(null)}
        />
      )}
    </div>
  );
}

// Mobile-optimized Team Stats Component
function MobileTeamStats({ teamStats, gameData }) {
  if (!teamStats || !gameData) return null;

  const { teams } = gameData;

  const stats = [
    { label: 'Total Yards', home: teamStats.home?.totalYards, away: teamStats.away?.totalYards },
    { label: 'Passing Yards', home: teamStats.home?.passingYards, away: teamStats.away?.passingYards },
    { label: 'Rushing Yards', home: teamStats.home?.rushingYards, away: teamStats.away?.rushingYards },
    { label: 'First Downs', home: teamStats.home?.firstDowns, away: teamStats.away?.firstDowns },
    { label: '3rd Down', home: teamStats.home?.thirdDownPct, away: teamStats.away?.thirdDownPct },
    { label: 'Turnovers', home: teamStats.home?.turnovers, away: teamStats.away?.turnovers, invertHighlight: true },
    { label: 'Time of Possession', home: teamStats.home?.timeOfPossession, away: teamStats.away?.timeOfPossession },
    { label: 'Sacks', home: teamStats.home?.sacks, away: teamStats.away?.sacks },
    { label: 'Penalties', home: teamStats.home?.penalties, away: teamStats.away?.penalties, invertHighlight: true },
  ];

  return (
    <section className="card">
      <div className="flex justify-between items-center mb-3">
        <h2 className="nbc-section-header mb-0 pb-0 border-0">
          <span className="card-header-accent"></span>
          TEAM STATS
        </h2>
        {teamStats.source && (
          <span className="text-[10px] text-gray-600 font-semibold tracking-wider uppercase">
            {teamStats.source === 'espn' ? 'ESPN' : 'DEMO'}
          </span>
        )}
      </div>

      {/* Team Headers */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-center py-2 rounded" style={{ background: 'rgba(0,0,0,0.25)' }}>
        <div className="font-bold text-xs tracking-wider" style={{ color: 'var(--nbc-silver)' }}>{teams.away.abbreviation}</div>
        <div className="text-[10px] text-gray-600 self-center">VS</div>
        <div className="font-bold text-xs tracking-wider" style={{ color: 'var(--nbc-silver)' }}>{teams.home.abbreviation}</div>
      </div>

      {/* Stats Rows */}
      <div>
        {stats.map((stat) => {
          const homeNum = typeof stat.home === 'number' ? stat.home : parseInt(stat.home) || 0;
          const awayNum = typeof stat.away === 'number' ? stat.away : parseInt(stat.away) || 0;
          const homeLeads = stat.invertHighlight ? homeNum < awayNum : homeNum > awayNum;
          const awayLeads = stat.invertHighlight ? awayNum < homeNum : awayNum > homeNum;

          return (
            <div key={stat.label} className="grid grid-cols-3 gap-2 text-center py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div className={`text-sm font-semibold ${awayLeads ? 'text-nbc-gold' : 'text-gray-400'}`}>
                {stat.away ?? '-'}
              </div>
              <div className="text-[10px] text-gray-600 self-center uppercase tracking-wide">{stat.label}</div>
              <div className={`text-sm font-semibold ${homeLeads ? 'text-nbc-gold' : 'text-gray-400'}`}>
                {stat.home ?? '-'}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// Mobile-optimized Player Game Stats Component
function MobilePlayerGameStats({ playerGameStats }) {
  if (!playerGameStats) return null;

  const { passing, rushing, receiving } = playerGameStats;

  return (
    <section className="card">
      <div className="flex justify-between items-center mb-3">
        <h2 className="nbc-section-header mb-0 pb-0 border-0">
          <span className="card-header-accent"></span>
          PLAYER STATS
        </h2>
        {playerGameStats.source && (
          <span className="text-[10px] text-gray-600 font-semibold tracking-wider uppercase">
            {playerGameStats.source === 'espn' ? 'ESPN' : 'DEMO'}
          </span>
        )}
      </div>

      {/* Passing */}
      {passing && passing.length > 0 && (
        <div className="mb-4">
          <h3 className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-widest">Passing</h3>
          <div className="rounded overflow-hidden" style={{ background: 'rgba(0,0,0,0.25)' }}>
            <div className="grid grid-cols-12 gap-1 text-[10px] text-gray-600 px-3 py-1.5 font-semibold tracking-wider" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="col-span-4">PLAYER</span>
              <span className="col-span-2 text-center">C/A</span>
              <span className="col-span-2 text-center">YDS</span>
              <span className="col-span-2 text-center">TD</span>
              <span className="col-span-2 text-center">INT</span>
            </div>
            {passing.map((player, idx) => (
              <div key={player.name} className={`grid grid-cols-12 gap-1 px-3 py-2 text-xs sm:text-sm ${idx === 0 ? 'nbc-leader-row' : ''}`}>
                <div className="col-span-4 truncate">
                  <span className="text-[10px] text-gray-600 mr-1">{player.team}</span>
                  <span className="font-semibold">{player.name}</span>
                </div>
                <span className="col-span-2 text-center text-gray-500">{player.comp}/{player.att}</span>
                <span className="col-span-2 text-center font-bold">{player.yards}</span>
                <span className="col-span-2 text-center text-green-400 font-semibold">{player.td}</span>
                <span className="col-span-2 text-center text-red-400 font-semibold">{player.int || 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rushing */}
      {rushing && rushing.length > 0 && (
        <div className="mb-4">
          <h3 className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-widest">Rushing</h3>
          <div className="rounded overflow-hidden" style={{ background: 'rgba(0,0,0,0.25)' }}>
            <div className="grid grid-cols-12 gap-1 text-[10px] text-gray-600 px-3 py-1.5 font-semibold tracking-wider" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="col-span-4">PLAYER</span>
              <span className="col-span-2 text-center">CAR</span>
              <span className="col-span-2 text-center">YDS</span>
              <span className="col-span-2 text-center">AVG</span>
              <span className="col-span-2 text-center">TD</span>
            </div>
            {rushing.slice(0, 5).map((player, idx) => (
              <div key={player.name} className={`grid grid-cols-12 gap-1 px-3 py-2 text-xs sm:text-sm ${idx === 0 ? 'nbc-leader-row' : ''}`}>
                <div className="col-span-4 truncate">
                  <span className="text-[10px] text-gray-600 mr-1">{player.team}</span>
                  <span className="font-semibold">{player.name}</span>
                </div>
                <span className="col-span-2 text-center text-gray-500">{player.carries}</span>
                <span className="col-span-2 text-center font-bold">{player.yards}</span>
                <span className="col-span-2 text-center text-gray-500">{player.avg}</span>
                <span className="col-span-2 text-center text-green-400 font-semibold">{player.td}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Receiving */}
      {receiving && receiving.length > 0 && (
        <div>
          <h3 className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-widest">Receiving</h3>
          <div className="rounded overflow-hidden" style={{ background: 'rgba(0,0,0,0.25)' }}>
            <div className="grid grid-cols-12 gap-1 text-[10px] text-gray-600 px-3 py-1.5 font-semibold tracking-wider" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="col-span-4">PLAYER</span>
              <span className="col-span-2 text-center">REC</span>
              <span className="col-span-2 text-center">YDS</span>
              <span className="col-span-2 text-center">AVG</span>
              <span className="col-span-2 text-center">TD</span>
            </div>
            {receiving.slice(0, 5).map((player, idx) => (
              <div key={player.name} className={`grid grid-cols-12 gap-1 px-3 py-2 text-xs sm:text-sm ${idx === 0 ? 'nbc-leader-row' : ''}`}>
                <div className="col-span-4 truncate">
                  <span className="text-[10px] text-gray-600 mr-1">{player.team}</span>
                  <span className="font-semibold">{player.name}</span>
                </div>
                <span className="col-span-2 text-center text-gray-500">{player.rec}</span>
                <span className="col-span-2 text-center font-bold">{player.yards}</span>
                <span className="col-span-2 text-center text-gray-500">{player.avg}</span>
                <span className="col-span-2 text-center text-green-400 font-semibold">{player.td}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default PlayerPage;
