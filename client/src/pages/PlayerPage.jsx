import { useState } from 'react';
import { useGameData, useOddsData, usePlayerProps } from '../hooks/useGameData';
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
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-center text-yellow-400">
        Super Bowl Squares
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Odds & Props */}
        <div className="lg:col-span-1 space-y-4">
          <OddsDisplay oddsData={oddsData} />
          <PlayerPropsDisplay propsData={propsData} />
        </div>

        {/* Center Column - Grid */}
        <div className="lg:col-span-1">
          <div className="card">
            <SquaresGrid
              gameData={gameData}
              onSquareClick={handleSquareClick}
            />
          </div>
        </div>

        {/* Right Column - Scoreboard & Winners */}
        <div className="lg:col-span-1 space-y-4">
          <Scoreboard gameData={gameData} />
          <WinnersPanel quarters={gameData.quarters} />
        </div>
      </div>

      {/* Player Stats Section */}
      <PlayerStats gameData={gameData} />

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

export default PlayerPage;
