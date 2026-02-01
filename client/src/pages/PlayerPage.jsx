import { useState } from 'react';
import { useGameData, useOddsData, usePlayerProps, useTeamStats, usePlayerGameStats } from '../hooks/useGameData';
import SquaresGrid from '../components/SquaresGrid';
import OddsDisplay from '../components/OddsDisplay';
import PlayerPropsDisplay from '../components/PlayerPropsDisplay';
import Scoreboard from '../components/Scoreboard';
import ClaimModal from '../components/ClaimModal';
import WinnersPanel from '../components/WinnersPanel';
import PlayerStats from '../components/PlayerStats';

function PlayerPage() {
  const { gameData, loading, error, claimSquare } = useGameData(3000);
  const { oddsData } = useOddsData(30000);
  const { propsData } = usePlayerProps(60000);
  const { teamStats } = useTeamStats(15000);
  const { playerGameStats } = usePlayerGameStats(15000);
  const [selectedSquare, setSelectedSquare] = useState(null);

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

  const handleSquareClick = (index) => {
    if (!gameData.grid.locked && !gameData.grid.squares[index]) {
      setSelectedSquare(index);
    }
  };

  const handleClaim = async (index, playerName) => {
    await claimSquare(index, playerName);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-8">
      {/* Header */}
      <header className="text-center py-2">
        <h1 className="text-2xl md:text-3xl font-bold text-yellow-400">
          Super Bowl Squares
        </h1>
      </header>

      {/* Scoreboard - Compact for mobile */}
      <Scoreboard gameData={gameData} />

      {/* Squares Grid */}
      <section className="card">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold text-yellow-400">Squares Pool</h2>
          <span className="text-sm text-gray-400">
            {gameData.grid.squares.filter(s => s !== null).length}/100 claimed
          </span>
        </div>
        <SquaresGrid
          gameData={gameData}
          onSquareClick={handleSquareClick}
        />
        {!gameData.grid.locked && (
          <p className="text-center text-sm text-gray-400 mt-3">
            Tap an empty square to claim it
          </p>
        )}
      </section>

      {/* Winners Panel */}
      <WinnersPanel quarters={gameData.quarters} />

      {/* Pool Standings */}
      <PlayerStats gameData={gameData} />

      {/* Team Stats Section */}
      <MobileTeamStats teamStats={teamStats} gameData={gameData} />

      {/* Player Game Stats Section */}
      <MobilePlayerGameStats playerGameStats={playerGameStats} />

      {/* Game Odds */}
      <OddsDisplay oddsData={oddsData} />

      {/* Player Props */}
      <PlayerPropsDisplay propsData={propsData} />

      {/* Claim Modal */}
      {selectedSquare !== null && (
        <ClaimModal
          squareIndex={selectedSquare}
          onClaim={handleClaim}
          onClose={() => setSelectedSquare(null)}
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
        <h2 className="text-lg font-bold text-yellow-400">Team Stats</h2>
        {teamStats.source && (
          <span className="text-xs text-gray-500">via {teamStats.source === 'espn' ? 'ESPN' : 'Demo'}</span>
        )}
      </div>

      {/* Team Headers */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        <div className="font-bold text-sm">{teams.away.abbreviation}</div>
        <div className="text-xs text-gray-500">VS</div>
        <div className="font-bold text-sm">{teams.home.abbreviation}</div>
      </div>

      {/* Stats Rows */}
      <div className="space-y-2">
        {stats.map((stat) => {
          const homeNum = typeof stat.home === 'number' ? stat.home : parseInt(stat.home) || 0;
          const awayNum = typeof stat.away === 'number' ? stat.away : parseInt(stat.away) || 0;
          const homeLeads = stat.invertHighlight ? homeNum < awayNum : homeNum > awayNum;
          const awayLeads = stat.invertHighlight ? awayNum < homeNum : awayNum > homeNum;

          return (
            <div key={stat.label} className="grid grid-cols-3 gap-2 text-center py-2 border-b border-gray-700/50">
              <div className={`text-sm ${awayLeads ? 'text-yellow-400 font-bold' : 'text-gray-300'}`}>
                {stat.away ?? '-'}
              </div>
              <div className="text-xs text-gray-500 self-center">{stat.label}</div>
              <div className={`text-sm ${homeLeads ? 'text-yellow-400 font-bold' : 'text-gray-300'}`}>
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
        <h2 className="text-lg font-bold text-yellow-400">Player Stats</h2>
        {playerGameStats.source && (
          <span className="text-xs text-gray-500">via {playerGameStats.source === 'espn' ? 'ESPN' : 'Demo'}</span>
        )}
      </div>

      {/* Passing */}
      {passing && passing.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wide">Passing</h3>
          <div className="bg-gray-700/50 rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 gap-1 text-xs text-gray-500 px-3 py-2 border-b border-gray-600">
              <span className="col-span-4">Player</span>
              <span className="col-span-2 text-center">C/A</span>
              <span className="col-span-2 text-center">YDS</span>
              <span className="col-span-2 text-center">TD</span>
              <span className="col-span-2 text-center">INT</span>
            </div>
            {passing.map((player, idx) => (
              <div key={player.name} className={`grid grid-cols-12 gap-1 px-3 py-2 text-sm ${idx === 0 ? 'bg-yellow-900/20' : ''}`}>
                <div className="col-span-4 truncate">
                  <span className="text-xs text-gray-500 mr-1">{player.team}</span>
                  <span className="font-medium">{player.name}</span>
                </div>
                <span className="col-span-2 text-center text-gray-400">{player.comp}/{player.att}</span>
                <span className="col-span-2 text-center font-bold">{player.yards}</span>
                <span className="col-span-2 text-center text-green-400">{player.td}</span>
                <span className="col-span-2 text-center text-red-400">{player.int || 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rushing */}
      {rushing && rushing.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wide">Rushing</h3>
          <div className="bg-gray-700/50 rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 gap-1 text-xs text-gray-500 px-3 py-2 border-b border-gray-600">
              <span className="col-span-4">Player</span>
              <span className="col-span-2 text-center">CAR</span>
              <span className="col-span-2 text-center">YDS</span>
              <span className="col-span-2 text-center">AVG</span>
              <span className="col-span-2 text-center">TD</span>
            </div>
            {rushing.slice(0, 5).map((player, idx) => (
              <div key={player.name} className={`grid grid-cols-12 gap-1 px-3 py-2 text-sm ${idx === 0 ? 'bg-yellow-900/20' : ''}`}>
                <div className="col-span-4 truncate">
                  <span className="text-xs text-gray-500 mr-1">{player.team}</span>
                  <span className="font-medium">{player.name}</span>
                </div>
                <span className="col-span-2 text-center text-gray-400">{player.carries}</span>
                <span className="col-span-2 text-center font-bold">{player.yards}</span>
                <span className="col-span-2 text-center text-gray-400">{player.avg}</span>
                <span className="col-span-2 text-center text-green-400">{player.td}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Receiving */}
      {receiving && receiving.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wide">Receiving</h3>
          <div className="bg-gray-700/50 rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 gap-1 text-xs text-gray-500 px-3 py-2 border-b border-gray-600">
              <span className="col-span-4">Player</span>
              <span className="col-span-2 text-center">REC</span>
              <span className="col-span-2 text-center">YDS</span>
              <span className="col-span-2 text-center">AVG</span>
              <span className="col-span-2 text-center">TD</span>
            </div>
            {receiving.slice(0, 5).map((player, idx) => (
              <div key={player.name} className={`grid grid-cols-12 gap-1 px-3 py-2 text-sm ${idx === 0 ? 'bg-yellow-900/20' : ''}`}>
                <div className="col-span-4 truncate">
                  <span className="text-xs text-gray-500 mr-1">{player.team}</span>
                  <span className="font-medium">{player.name}</span>
                </div>
                <span className="col-span-2 text-center text-gray-400">{player.rec}</span>
                <span className="col-span-2 text-center font-bold">{player.yards}</span>
                <span className="col-span-2 text-center text-gray-400">{player.avg}</span>
                <span className="col-span-2 text-center text-green-400">{player.td}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default PlayerPage;
